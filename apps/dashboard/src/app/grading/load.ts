import { supabase } from "@soccer-card-radar/db";
import { fetchRows, buildCollection, fixtureMode } from "../collection/load";
import { buildGrading, type Grading, type Submission } from "@/lib/grading";
import { loadSnipe, isGradedTarget } from "../snipe/load";

/** G4: what can be picked and graded from a photo. */
export type GradePick = {
  key: string; kind: "vault" | "listing"; imageUrl: string; player: string; title: string;
  value: number | null; cost: number | null; price: number | null; maxBid: number | null; url: string | null;
  hint: string | null; prior: { verdict: string; summary: string } | null;
};
export type GradingData = Grading & { fee: number | null; vault: GradePick[]; listings: GradePick[] };

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
  const [rows, subs, snipe] = await Promise.all([fetchRows(), fetchSubs(), loadSnipe().catch(() => null)]);
  const cards = buildCollection(rows);
  const fee = rows.assumptions.find((a) => a.key === "fee_to_grade_a_raw_in_hand_card")?.value ?? null;
  const vault: GradePick[] = cards
    .filter((c) => c.status === "raw" && c.imagePath)
    .map((c) => ({
      key: `v:${c.id}`, kind: "vault" as const, imageUrl: c.imagePath!, player: c.player, title: c.item,
      value: c.valueNow, cost: c.cost, price: null, maxBid: null, url: null,
      hint: c.decision?.startsWith("Grade") ? c.decision : null, prior: null,
    }))
    .sort((a, b) => Number(!!b.hint) - Number(!!a.hint) || (b.value ?? 0) - (a.value ?? 0));
  const listings: GradePick[] = (snipe?.rows ?? [])
    .filter((r) => !isGradedTarget(r.target))
    .flatMap((r) => r.live.filter((l) => l.imageUrl).map((l) => ({
      key: `l:${l.externalId}`, kind: "listing" as const, imageUrl: l.imageUrl!, player: r.player, title: l.title,
      value: r.target.raw, cost: null, price: l.price, maxBid: r.result.maxBid, url: l.url, hint: r.target.card,
      prior: l.screen ? { verdict: l.screen.verdict, summary: l.screen.summary } : null,
    })));
  return { ...buildGrading(cards, subs), fee: fee === null ? null : Number(fee), vault, listings };
}
