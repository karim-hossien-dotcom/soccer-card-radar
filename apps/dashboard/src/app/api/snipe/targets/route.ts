import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabase } from "@soccer-card-radar/db";
import { requireAdmin } from "@/lib/admin";
import { mutateFixture, type Target } from "@/app/snipe/load";
import { getResearchActions } from "@/app/research-engine";

export const dynamic = "force-dynamic";

const money = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));
const int = (v: unknown) => (v === null || v === "" || v === undefined ? null : Number(v));
const terms = (v: unknown) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 30);

/** C1: add or edit a snipe target. Body: Target fields; include id to edit. active=false retires it. */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Send the target as JSON" }, { status: 400 });
  const ids = new Set(getResearchActions().map((a) => a.id));
  const t = {
    actionId: String(b.actionId ?? ""),
    card: String(b.card ?? "").trim(),
    query: String(b.query ?? "").trim(),
    mustInclude: terms(b.mustInclude),
    exclude: terms(b.exclude),
    raw: money(b.raw), psa9: money(b.psa9), psa10: money(b.psa10),
    popTotal: int(b.popTotal), pop9: int(b.pop9), pop10: int(b.pop10), printRun: int(b.printRun),
    ssp: b.ssp === true,
    compsAsOf: typeof b.compsAsOf === "string" && b.compsAsOf ? b.compsAsOf : null,
    confidence: typeof b.confidence === "string" ? b.confidence : null,
    notes: typeof b.notes === "string" ? b.notes : null,
    active: b.active !== false,
    psaCert: typeof b.psaCert === "string" && b.psaCert.trim() ? b.psaCert.trim() : null,
  };
  const bad =
    !ids.has(t.actionId) ? "Pick a tracked player" :
    t.card.length < 6 ? "Describe the card" :
    t.query.length < 6 ? "Add the eBay search" :
    !t.mustInclude.length ? "Add at least one word the listing title must contain" :
    [t.raw, t.psa9, t.psa10].some((x) => x !== null && !(x > 0 && x < 1_000_000)) ? "Prices must be positive numbers" :
    [t.popTotal, t.pop9, t.pop10, t.printRun].some((x) => x !== null && !(Number.isInteger(x) && x >= 0)) ? "Pop and print run must be whole numbers" :
    t.compsAsOf && !/^\d{4}-\d{2}-\d{2}$/.test(t.compsAsOf) ? "Comps date must be YYYY-MM-DD" :
    t.psaCert && !/^\d{6,10}$/.test(t.psaCert) ? "PSA cert is 6-10 digits" : null;
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const id = typeof b.id === "string" && b.id ? b.id : null;
  const done = await mutateFixture((rows) => {
    const i = id ? rows.targets.findIndex((x) => x.id === id) : -1;
    const row = { ...(i >= 0 ? rows.targets[i] : {}), ...t, id: id ?? randomUUID() } as Target;
    if (i >= 0) rows.targets[i] = row; else rows.targets.push(row);
  });
  if (!done) {
    const res = id
      ? await supabase.from("SnipeTarget").update({ ...t, updatedAt: new Date().toISOString() }).eq("id", id)
      : await supabase.from("SnipeTarget").insert(t);
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
