import { supabase } from "@soccer-card-radar/db";
import { fetchRows, buildCollection, fixtureMode } from "../collection/load";
import { buildGrading, type Grading, type Submission } from "@/lib/grading";
import { loadSnipe, isGradedTarget } from "../snipe/load";

/** G4: what can be picked and graded from a photo. */
/** imageUrl: what the tile shows; gradeUrl: the photo the check runs on (the seller's full photo when saved). */
export type GradePick = {
  key: string; kind: "vault" | "listing"; imageUrl: string; gradeUrl: string; player: string; title: string;
  value: number | null; cost: number | null; price: number | null; maxBid: number | null; url: string | null;
  hint: string | null; prior: { verdict: string; summary: string } | null;
};
/** A saved centering check (confirm screen) joined to the card, for the calibration table. */
export type CentCheck = {
  cardId: string; title: string; side: "front" | "back"; at: string; lr: number | null; tb: number | null; adjusted: boolean;
  status: string; grade: string | null; grader: string | null; // grade = "PSA 9" etc. once graded
};
export type GradingData = Grading & { fee: number | null; vault: GradePick[]; listings: GradePick[]; checks: CentCheck[] };

async function fetchChecks(): Promise<{ cardId: string; side: string; createdAt: string; lr: number | null; tb: number | null; adjusted: boolean }[]> {
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    const all = (JSON.parse(await readFile(process.env.COLLECTION_FIXTURE!, "utf8")).centeringChecks ?? []) as { cardId: string; side: string; createdAt: string; lr: number | null; tb: number | null; adjusted: boolean }[];
    return all.filter((r) => r.cardId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await supabase.from("CenteringCheck").select('"cardId", side, "createdAt", lr, tb, adjusted').not("cardId", "is", null).order("createdAt", { ascending: false }).limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as { cardId: string; side: string; createdAt: string; lr: number | null; tb: number | null; adjusted: boolean }[];
}

async function fetchSubs(): Promise<Submission[]> {
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    return (JSON.parse(await readFile(process.env.COLLECTION_FIXTURE!, "utf8")).submissions ?? []) as Submission[];
  }
  const { data, error } = await supabase.from("Submission").select('id, "subNumber", grader, "serviceLevel", "feePerCard", status, "arrivedOn", "estComplete"');
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({ ...s, feePerCard: s.feePerCard === null ? null : Number(s.feePerCard) })) as Submission[];
}

export async function loadGrading(): Promise<GradingData> {
  const [rows, subs, snipe, rawChecks] = await Promise.all([fetchRows(), fetchSubs(), loadSnipe().catch(() => null), fetchChecks().catch(() => [])]);
  const cards = buildCollection(rows);
  const fee = rows.assumptions.find((a) => a.key === "fee_to_grade_a_raw_in_hand_card")?.value ?? null;
  const vault: GradePick[] = cards
    .filter((c) => c.status === "raw") // cards without a photo are listed too: they can still be scanned
    .map((c) => ({
      key: `v:${c.id}`, kind: "vault" as const, imageUrl: c.imagePath ?? "", gradeUrl: c.photoSourceFront ?? c.imagePath ?? "", player: c.player, title: c.item,
      value: c.valueNow, cost: c.cost, price: null, maxBid: null, url: null,
      hint: c.decision?.startsWith("Grade") ? c.decision : null, prior: null,
    }))
    .sort((a, b) => Number(!!b.hint) - Number(!!a.hint) || (b.value ?? 0) - (a.value ?? 0));
  const listings: GradePick[] = (snipe?.rows ?? [])
    .filter((r) => !isGradedTarget(r.target))
    .flatMap((r) => r.live.filter((l) => l.imageUrl).map((l) => ({
      key: `l:${l.externalId}`, kind: "listing" as const, imageUrl: l.imageUrl!, gradeUrl: l.imageUrl!, player: r.player, title: l.title,
      value: r.target.raw, cost: null, price: l.price, maxBid: r.result.maxBid, url: l.url, hint: r.target.card,
      prior: l.screen ? { verdict: l.screen.verdict, summary: l.screen.summary } : null,
    })));
  const byId = new Map(cards.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const checks: CentCheck[] = [];
  for (const r of rawChecks) { // newest first: keep the latest per card and side
    const k = `${r.cardId}|${r.side}`, c = byId.get(r.cardId);
    if (seen.has(k) || !c) continue;
    seen.add(k);
    checks.push({ cardId: r.cardId, title: c.item, side: r.side as "front" | "back", at: r.createdAt.slice(0, 10), lr: r.lr, tb: r.tb, adjusted: r.adjusted,
      status: c.status, grade: c.status === "graded" ? c.gradeLabel : null, grader: null });
  }
  return { ...buildGrading(cards, subs), fee: fee === null ? null : Number(fee), vault, listings, checks };
}
