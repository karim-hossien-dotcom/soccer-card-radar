import { supabase } from "@soccer-card-radar/db";
import { fetchRows, buildCollection, fixtureMode } from "../collection/load";
import { buildGrading, type Grading, type Submission } from "@/lib/grading";

export type GradingData = Grading & { fee: number | null };

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
  const [rows, subs] = await Promise.all([fetchRows(), fetchSubs()]);
  const cards = buildCollection(rows);
  const fee = rows.assumptions.find((a) => a.key === "fee_to_grade_a_raw_in_hand_card")?.value ?? null;
  return { ...buildGrading(cards, subs), fee: fee === null ? null : Number(fee) };
}
