import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { refreshPsa, PSA_BASE, type PsaTarget } from "@soccer-card-radar/shared";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FRESH_DAYS = 6; // weekly cadence: skip certs refreshed in the last 6 days

/**
 * A4: refresh PSA population (and missing photos) for graded PSA certs, oldest first.
 * ?budget=N caps PSA calls per run (default 90; PSA's free-tier limit is unpublished, assumed ~100/day).
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const token = process.env.PSA_API_TOKEN;
  if (!token) return NextResponse.json({ error: "PSA_API_TOKEN is not set on the server" }, { status: 503 });
  const budget = Math.min(Math.max(Number(new URL(req.url).searchParams.get("budget")) || 90, 1), 500);

  const [cards, pops, snipe] = await Promise.all([
    supabase.from("Card").select('id, cert, "psaSpecId", "imagePath"').eq("status", "graded").eq("grader", "PSA").not("cert", "is", null),
    supabase.from("CardPop").select('"cardId", "asOf"'),
    supabase.from("SnipeTarget").select('id, "psaCert", "psaSpecId", "popAsOf"').eq("active", true),
  ]);
  if (cards.error || pops.error || snipe.error) return NextResponse.json({ error: (cards.error ?? pops.error ?? snipe.error)!.message }, { status: 500 });

  const lastPop = new Map<string, string>();
  for (const p of pops.data ?? []) if ((lastPop.get(p.cardId) ?? "") < p.asOf) lastPop.set(p.cardId, p.asOf);
  const today = new Date().toISOString().slice(0, 10);
  const freshSince = new Date(Date.now() - FRESH_DAYS * 86400_000).toISOString().slice(0, 10);
  const targets: PsaTarget[] = (cards.data ?? [])
    .filter((c) => (lastPop.get(c.id) ?? "") < freshSince)
    .sort((a, b) => (lastPop.get(a.id) ?? "").localeCompare(lastPop.get(b.id) ?? ""))
    .map((c) => ({ cardId: c.id, cert: c.cert!, specId: c.psaSpecId, needsImage: !c.imagePath }));
  // C1: snipe targets first (few, and they drive bids). A target needs a PSA cert of that exact card, or its spec id.
  const SNIPE = "snipe:";
  const snipeTargets: PsaTarget[] = (snipe.data ?? [])
    .filter((t) => (t.psaSpecId || t.psaCert) && (t.popAsOf ?? "") < freshSince)
    .map((t) => ({ cardId: SNIPE + t.id, cert: t.psaCert ?? "", specId: t.psaSpecId, needsImage: false }));
  const upToDate = (cards.data?.length ?? 0) - targets.length;
  targets.unshift(...snipeTargets);

  const r = await refreshPsa(targets, async (path) => {
    const res = await fetch(PSA_BASE + path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    return { status: res.status, body: res.status === 200 ? await res.json().catch(() => null) : null };
  }, budget);

  const isSnipe = (id: string) => id.startsWith(SNIPE);
  const sid = (id: string) => id.slice(SNIPE.length);
  const writes = [
    ...r.specIds.filter((s) => isSnipe(s.cardId)).map((s) => supabase.from("SnipeTarget").update({ psaSpecId: s.specId }).eq("id", sid(s.cardId))),
    ...r.pops.filter((p) => isSnipe(p.cardId)).map((p) =>
      supabase.from("SnipeTarget").update({ popTotal: p.total, pop9: p.pop9, pop10: p.gem10, popAsOf: today, updatedAt: new Date().toISOString() }).eq("id", sid(p.cardId))),
    ...r.specIds.filter((s) => !isSnipe(s.cardId)).map((s) => supabase.from("Card").update({ psaSpecId: s.specId }).eq("id", s.cardId)),
    ...r.images.map((i) => supabase.from("Card").update({ imagePath: i.url }).eq("id", i.cardId).is("imagePath", null)),
  ];
  const cardPops = r.pops.filter((p) => !isSnipe(p.cardId));
  if (cardPops.length)
    writes.push(supabase.from("CardPop").upsert(cardPops.map((p) => ({ ...p, asOf: today, source: "psa_api" })), { onConflict: "cardId,asOf" }) as never);
  const failed = (await Promise.all(writes)).filter((w) => w.error).map((w) => w.error!.message);

  return NextResponse.json({
    snipeTargets: snipeTargets.length,
    checked: targets.length - r.pending, upToDate, pending: r.pending,
    pops: r.pops.length, images: r.images.length, calls: r.calls, stopped: r.stopped, errors: r.errors, writeErrors: failed,
  });
}
