/**
 * C1: snipe score (0-100) = weighted mean of card parts (grading upside, steal, rarity)
 * and player parts (signal, tier, form). Parts that can't be computed are left out and
 * the remaining weights renormalised, so a missing live price or missing stats never
 * reads as zero. Legends ignore form by design (Karim, 2026-10-16).
 */

export type SnipeWeights = { upside: number; steal: number; rarity: number; signal: number; tier: number; form: number };
export const DEFAULT_WEIGHTS: SnipeWeights = { upside: 25, steal: 25, rarity: 15, signal: 12, tier: 8, form: 15 };

export type SnipeCard = {
  raw: number | null;
  psa9: number | null;
  psa10: number | null;
  popTotal: number | null;
  pop9: number | null;
  pop10: number | null;
  printRun: number | null;
  ssp: boolean;
  confidence?: string | null; // High / Medium / Low comps
  maxBid?: number | null; // owner-set all-in ceiling; overrides the formula (graded slabs, numbered cards bought to hold)
};
export type PlayerForm = {
  apps: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  avgRating: number | null;
  age: number | null;
};
export type SnipePlayer = {
  signal: "BUY" | "HOLD" | "SELL";
  tier: "S" | "A" | "B";
  legend: boolean;
  form: PlayerForm | null; // approved form only
};
/**
 * PSA pop counts cards people chose to submit, so a random raw buy grades lower than pop suggests.
 * gemHaircut / psa9Haircut scale the pop PSA 10 and PSA 9 rates (defaults 0.6 / 0.5; Karim's own
 * self-submitted results were 3 PSA 10, 1 PSA 9, 6 PSA 8 of 10). The removed share is valued at raw.
 * Editable in Assumptions (snipe_gem_haircut, snipe_psa9_haircut). Both 1 = the workbook Grade Screen.
 * confidence scales grading upside: thin or messy comps (Low) count for less.
 */
/**
 * C5 max bid: sellFee = eBay selling fees on the graded sale, targetMultiple = EV after fees / all-in cost you
 * want, rawCap = most of the raw price you pay for a raw card. Editable in Assumptions (snipe_sell_fee,
 * snipe_target_multiple, snipe_raw_cap).
 */
export type SnipeConfig = {
  weights: SnipeWeights; gradingFee: number; assumedGem: number; assumed9: number;
  gemHaircut: number; psa9Haircut: number; confidence: Record<string, number>;
  sellFee: number; targetMultiple: number; rawCap: number;
};
export const DEFAULT_CONFIG: SnipeConfig = {
  weights: DEFAULT_WEIGHTS, gradingFee: 32.99, assumedGem: 0.2, assumed9: 0.5,
  gemHaircut: 0.6, psa9Haircut: 0.5, confidence: { high: 1, medium: 0.85, low: 0.6 },
  sellFee: 0.13, targetMultiple: 2, rawCap: 0.8,
};

/** Snipe config from Assumption rows (key -> value): snipe_w_*, fee_to_grade_a_raw_in_hand_card, snipe_*; defaults otherwise. */
export function snipeConfigFromAssumptions(a: Record<string, number>): SnipeConfig {
  const w = { ...DEFAULT_CONFIG.weights };
  for (const k of Object.keys(w) as (keyof SnipeWeights)[]) if (typeof a[`snipe_w_${k}`] === "number") w[k] = a[`snipe_w_${k}`];
  return {
    ...DEFAULT_CONFIG, weights: w,
    gradingFee: a.fee_to_grade_a_raw_in_hand_card ?? DEFAULT_CONFIG.gradingFee,
    gemHaircut: a.snipe_gem_haircut ?? DEFAULT_CONFIG.gemHaircut,
    psa9Haircut: a.snipe_psa9_haircut ?? DEFAULT_CONFIG.psa9Haircut,
    sellFee: a.snipe_sell_fee ?? DEFAULT_CONFIG.sellFee,
    targetMultiple: a.snipe_target_multiple ?? DEFAULT_CONFIG.targetMultiple,
    rawCap: a.snipe_raw_cap ?? DEFAULT_CONFIG.rawCap,
  };
}

export type ScorePart = { key: keyof SnipeWeights; label: string; value: number | null; weight: number; note: string };
export type SnipeResult = {
  score: number | null;
  maxBid: number | null;
  ev: number | null; // expected value if graded
  profit: number | null; // ev - fee - price
  priceUsed: number | null;
  ratesAssumed: boolean;
  parts: ScorePart[];
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

/** Grade Screen formula: gem x PSA 10 + PSA 9 rate x PSA 9 + rest x raw. Rates come from PSA pop (pre-screened submissions). */
export function expectedGraded(c: SnipeCard, cfg: SnipeConfig = DEFAULT_CONFIG): { ev: number; gem: number; r9: number; assumed: boolean } | null {
  if (c.psa10 === null || c.psa9 === null || c.raw === null) return null;
  const havePop = !!c.popTotal && c.pop10 !== null && c.pop9 !== null;
  // Assumed rates are already conservative, so the haircuts only apply to real pop data.
  const gem = havePop ? (c.pop10! / c.popTotal!) * cfg.gemHaircut : cfg.assumedGem;
  const r9 = havePop ? (c.pop9! / c.popTotal!) * cfg.psa9Haircut : cfg.assumed9;
  const ev = gem * c.psa10 + r9 * c.psa9 + Math.max(0, 1 - gem - r9) * c.raw;
  return { ev: round2(ev), gem, r9, assumed: !havePop };
}

/**
 * C5: the one max bid for Snipe and Vault. Owner-set maxBid wins unchanged. Otherwise
 * min((EV x (1 - sellFee) - gradingFee) / targetMultiple, rawCap x raw), rounded to cents.
 * No EV (raw, PSA 9 or PSA 10 missing) or a result <= 0 -> null: never a guess.
 */
export function snipeMaxBid(c: SnipeCard, cfg: SnipeConfig = DEFAULT_CONFIG): number | null {
  if (c.maxBid !== null && c.maxBid !== undefined) return c.maxBid;
  const g = expectedGraded(c, cfg);
  if (!g || c.raw === null) return null;
  const bid = round2(Math.min((g.ev * (1 - cfg.sellFee) - cfg.gradingFee) / cfg.targetMultiple, cfg.rawCap * c.raw));
  return bid > 0 ? bid : null;
}

export function rarityValue(c: SnipeCard): { value: number; note: string } {
  const p = c.printRun;
  let v = p === null ? (c.ssp ? 0.8 : 0.2) : p <= 10 ? 1 : p <= 25 ? 0.9 : p <= 50 ? 0.75 : p <= 99 ? 0.6 : p <= 199 ? 0.45 : 0.35;
  let note = p !== null ? `numbered /${p}` : c.ssp ? "SSP" : "unnumbered base";
  if (c.popTotal !== null && c.popTotal < 300 && v < 0.7) { v = 0.7; note += `, low PSA pop (${c.popTotal})`; }
  return { value: v, note };
}

export function formValue(f: PlayerForm): { value: number | null; note: string } {
  const bits: number[] = [];
  const notes: string[] = [];
  if (f.avgRating !== null) { bits.push(clamp((f.avgRating - 6) / 2)); notes.push(`rating ${f.avgRating.toFixed(2)}`); }
  if (f.minutes !== null && f.minutes >= 90 && f.goals !== null && f.assists !== null) {
    const ga90 = (f.goals + f.assists) / (f.minutes / 90);
    bits.push(clamp(ga90 / 0.8));
    notes.push(`${ga90.toFixed(2)} G+A per 90`);
  }
  if (f.minutes !== null) { bits.push(clamp(f.minutes / 600)); notes.push(`${f.minutes} min`); }
  if (f.age !== null) { bits.push(f.age <= 20 ? 1 : f.age <= 23 ? 0.7 : f.age <= 26 ? 0.4 : 0.2); notes.push(`age ${f.age}`); }
  if (!bits.length) return { value: null, note: "no usable stats" };
  return { value: bits.reduce((a, b) => a + b, 0) / bits.length, note: notes.join(", ") };
}

/** price = live auction/listing price when known; otherwise the raw reference is used for upside and steal is left out. */
export function snipeScore(c: SnipeCard, price: number | null, pl: SnipePlayer, cfg: SnipeConfig = DEFAULT_CONFIG): SnipeResult {
  const w = cfg.weights;
  const maxBid = snipeMaxBid(c, cfg);
  const priceUsed = price ?? c.raw;
  const g = expectedGraded(c, cfg);
  const parts: ScorePart[] = [];

  let profit: number | null = null;
  if (g && priceUsed) {
    profit = round2(g.ev - cfg.gradingFee - priceUsed);
    const conf = cfg.confidence[(c.confidence ?? "").toLowerCase()] ?? 1;
    parts.push({ key: "upside", label: "Grading upside", value: clamp(profit / priceUsed / 2) * conf, weight: w.upside,
      note: `expected ${fmt(g.ev)} if graded (${pct(g.gem)} PSA 10, ${pct(g.r9)} PSA 9, rest valued at raw${g.assumed ? "; assumed rates, no pop data" : `; PSA pop rates x ${cfg.gemHaircut} / x ${cfg.psa9Haircut} for a raw buy`}) minus ${fmt(cfg.gradingFee)} fee vs ${fmt(priceUsed)}${conf < 1 ? `; x ${conf} for ${c.confidence!.toLowerCase()}-confidence comps` : ""}` });
  } else parts.push({ key: "upside", label: "Grading upside", value: null, weight: w.upside, note: "needs raw, PSA 9 and PSA 10 prices" });

  if (price !== null && maxBid) {
    const r = price / maxBid;
    parts.push({ key: "steal", label: "Steal", value: r <= 1 ? 0.5 + 0.5 * (1 - r) : clamp(0.5 - (r - 1)), weight: w.steal,
      note: `${fmt(price)} vs max bid ${fmt(maxBid)} (${Math.round(r * 100)}%)` });
  } else parts.push({ key: "steal", label: "Steal", value: null, weight: w.steal, note: price === null ? "no live auction" : "no max bid" });

  const rr = rarityValue(c);
  parts.push({ key: "rarity", label: "Rarity", value: rr.value, weight: w.rarity, note: rr.note });

  parts.push({ key: "signal", label: "Signal", value: pl.signal === "BUY" ? 1 : pl.signal === "HOLD" ? 0.5 : 0, weight: w.signal, note: pl.signal });
  parts.push({ key: "tier", label: "Tier", value: pl.tier === "S" ? 1 : pl.tier === "A" ? 0.7 : 0.4, weight: w.tier, note: `tier ${pl.tier}` });

  if (pl.legend) parts.push({ key: "form", label: "Form", value: null, weight: 0, note: "legend: stats ignored" });
  else if (!pl.form) parts.push({ key: "form", label: "Form", value: null, weight: w.form, note: "no approved stats yet" });
  else { const f = formValue(pl.form); parts.push({ key: "form", label: "Form", value: f.value, weight: w.form, note: f.note }); }

  const used = parts.filter((p) => p.value !== null && p.weight > 0);
  const tw = used.reduce((s, p) => s + p.weight, 0);
  const score = tw ? Math.round((100 * used.reduce((s, p) => s + p.weight * p.value!, 0)) / tw) : null;
  return { score, maxBid, ev: g?.ev ?? null, profit, priceUsed, ratesAssumed: g?.assumed ?? false, parts };
}

const fmt = (n: number) => `$${n >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(2)}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
