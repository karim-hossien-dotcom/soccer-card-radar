/**
 * Value engine (A3). Graded-value scenarios and grade-or-keep calls from comps only (Nov 19 2026:
 * the workbook's raw-to-graded multiples and bands are withdrawn). Max bids live in snipe-score.ts (snipeMaxBid, C5).
 */

export type CardStatus = "graded" | "raw" | "at_grader" | "sold" | "sealed";

export interface EngineConfig {
  feeToGradeRaw: number; // added to cost for raw cards still in hand
}

export interface CardInput {
  status: CardStatus;
  item: string;
  cost: number | null; // purchase + fees already paid
  valueUsed: number | null; // current value at current grade
  comps: { psa10?: number | null; psa9?: number | null; psa8?: number | null; raw?: number | null };
}

export type Decision = "No comps" | "Grade: beats raw even at PSA 9" | "Grade only if likely PSA 10" | "Keep raw";

export interface Valuation {
  psa10: number | null;
  psa9: number | null;
  psa8: number | null;
  net10: number | null;
  net9: number | null;
  net8: number | null;
  decision: Decision | null; // raw cards in hand only
}

const has = (v: number | null | undefined): v is number => v !== null && v !== undefined;

const NOT_GRADEABLE = /Qty \d+|Booster Box|sealed/i;

/**
 * Graded values come only from comps of that grade (Karim, Nov 19 2026: no multiples or bands; a grade with no
 * 90-day sale and no Card Ladder value has no value). The raw reference only drives the grade-or-keep call.
 */
export function valueCard(card: CardInput, cfg: EngineConfig): Valuation {
  const empty: Valuation = { psa10: null, psa9: null, psa8: null, net10: null, net9: null, net8: null, decision: null };
  if (card.status === "graded" || card.status === "sold" || card.status === "sealed" || NOT_GRADEABLE.test(card.item)) return empty;

  const { psa10: c10, psa9: c9, psa8: c8, raw: craw } = card.comps;
  const rawRef = has(craw) ? craw : card.valueUsed;
  const psa10 = has(c10) ? c10 : null;
  const psa9 = has(c9) ? c9 : null;
  const psa8 = has(c8) ? c8 : null;

  const inHand = card.status === "raw";
  const fee = inHand ? cfg.feeToGradeRaw : 0; // at_grader: fee already in cost
  const cost = card.cost ?? 0;
  const net = (v: number | null) => (has(v) ? v - cost - fee : null);

  let decision: Decision | null = null;
  if (inHand) {
    const ref = rawRef ?? 0;
    if (!has(psa9) && !has(psa10)) decision = "No comps";
    else if (has(psa9) && psa9 - fee > ref) decision = "Grade: beats raw even at PSA 9";
    else if (has(psa10) && psa10 - fee > ref) decision = "Grade only if likely PSA 10";
    else decision = "Keep raw";
  }

  return { psa10, psa9, psa8, net10: net(psa10), net9: net(psa9), net8: net(psa8), decision };
}

/** Build config from Assumption table rows (key -> value). */
export function configFromAssumptions(a: Record<string, number>): EngineConfig {
  return { feeToGradeRaw: a["fee_to_grade_a_raw_in_hand_card"] };
}
