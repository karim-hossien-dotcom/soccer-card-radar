/**
 * Value engine (A3). Single source of truth for graded-value scenarios and
 * grade-or-sell calls. Mirrors card_collection_master.xlsx (All Cards O:T + AB)
 * so app and workbook agree. Max bids live in snipe-score.ts (snipeMaxBid, C5).
 */

export type CardStatus = "graded" | "raw" | "at_grader" | "sold" | "sealed";

export type Band = "Rare (/25 or less, SSP)" | "Raw $100+" | "Raw $25-100" | "Raw under $25";

export interface Multiples {
  psa10FromPsa9: number; // no PSA 10 comp: PSA 10 = PSA 9 x this (2.5)
  psa9FromPsa10: number; // no PSA 9 comp: PSA 9 = PSA 10 x this (0.4)
  psa8FromPsa9: number; // no PSA 8 comp: PSA 8 = PSA 9 x this (0.65)
  bands: Record<Band, { psa10: number; psa9: number }>; // only raw comps
}

export interface EngineConfig {
  multiples: Multiples;
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
  band: Band | null;
  psa10: number | null;
  psa9: number | null;
  psa8: number | null;
  net10: number | null;
  net9: number | null;
  net8: number | null;
  decision: Decision | null; // raw cards in hand only
  estimated: boolean; // true when PSA 10/9 came from band multiples, not sales
}

const has = (v: number | null | undefined): v is number => v !== null && v !== undefined;

export function printRun(item: string): number | null {
  const m = item.match(/\/(\d+)\b/);
  return m ? Number(m[1]) : null;
}

export function bandFor(item: string, raw: number | null): Band | null {
  const pr = printRun(item);
  if ((pr !== null && pr <= 25) || /\bSSP\b|case hit/i.test(item)) return "Rare (/25 or less, SSP)";
  if (!has(raw)) return null;
  if (raw < 25) return "Raw under $25";
  if (raw < 100) return "Raw $25-100";
  return "Raw $100+";
}

const NOT_GRADEABLE = /Qty \d+|Booster Box|sealed/i;

export function valueCard(card: CardInput, cfg: EngineConfig): Valuation {
  const empty: Valuation = { band: null, psa10: null, psa9: null, psa8: null, net10: null, net9: null, net8: null, decision: null, estimated: false };
  if (card.status === "graded" || card.status === "sold" || card.status === "sealed" || NOT_GRADEABLE.test(card.item)) return empty;

  const { psa10: c10, psa9: c9, psa8: c8, raw: craw } = card.comps;
  const m = cfg.multiples;
  const rawRef = has(craw) ? craw : card.valueUsed;
  const band = bandFor(card.item, rawRef);
  const bandMult = band ? m.bands[band] : null;

  const psa10 = has(c10) ? c10 : has(c9) ? c9 * m.psa10FromPsa9 : has(rawRef) && bandMult ? rawRef * bandMult.psa10 : null;
  const psa9 = has(c9) ? c9 : has(c10) ? c10 * m.psa9FromPsa10 : has(rawRef) && bandMult ? rawRef * bandMult.psa9 : null;
  const psa8 = has(c8) ? c8 : has(psa9) ? psa9 * m.psa8FromPsa9 : null;

  const inHand = card.status === "raw";
  const fee = inHand ? cfg.feeToGradeRaw : 0; // at_grader: fee already in cost
  const cost = card.cost ?? 0;
  const net = (v: number | null) => (has(v) ? v - cost - fee : null);

  let decision: Decision | null = null;
  if (inHand) {
    const ref = rawRef ?? 0;
    if (!has(psa9)) decision = "No comps";
    else if (psa9 - fee > ref) decision = "Grade: beats raw even at PSA 9";
    else if (has(psa10) && psa10 - fee > ref) decision = "Grade only if likely PSA 10";
    else decision = "Keep raw";
  }

  return { band, psa10, psa9, psa8, net10: net(psa10), net9: net(psa9), net8: net(psa8), decision, estimated: !has(c10) && !has(c9) && has(psa10) };
}

/** Build config from Assumption table rows (key -> value). */
export function configFromAssumptions(a: Record<string, number>): EngineConfig {
  return {
    feeToGradeRaw: a["fee_to_grade_a_raw_in_hand_card"],
    multiples: {
      psa10FromPsa9: a["psa_10_psa_9_multiple_no_psa_10_comp"],
      psa9FromPsa10: a["psa_9_psa_10_multiple_no_psa_9_comp"],
      psa8FromPsa9: a["psa_8_psa_9_multiple_no_psa_8_comp"],
      bands: {
        "Rare (/25 or less, SSP)": { psa10: a["band_rare_25_or_less_ssp_psa10"], psa9: a["band_rare_25_or_less_ssp_psa9"] },
        "Raw $100+": { psa10: a["band_raw_100_psa10"], psa9: a["band_raw_100_psa9"] },
        "Raw $25-100": { psa10: a["band_raw_25_100_psa10"], psa9: a["band_raw_25_100_psa9"] },
        "Raw under $25": { psa10: a["band_raw_under_25_psa10"], psa9: a["band_raw_under_25_psa9"] },
      },
    },
  };
}
