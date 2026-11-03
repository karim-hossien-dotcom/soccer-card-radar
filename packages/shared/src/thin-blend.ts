/**
 * thin_blend (TB1): value for a card with few recent exact sales.
 * Every input becomes a log-value with a variance; signals are combined by
 * precision (inverse-variance) weighting. Pure functions, no I/O; `now` is a
 * parameter. Approved by Karim 2026-11-03 (card-comps skill). σ0, H and σ_m
 * are uncalibrated benchmarks.
 */

export type GradeState = "raw" | "graded";
export type SignalKind = "exact" | "grade_ratio" | "parallel_ratio" | "base_move" | "purchase" | "proxy";

export interface DatedSale {
  price: number;
  date: string | Date;
  indexFactor?: number; // I_now / I_at_sale; defaults to 1 (flagged as indexAssumed)
}

export interface ThinSignal {
  kind: SignalKind;
  gradeState: GradeState;
  sales: DatedSale[];
  ratios?: number[]; // pair ratios for grade_ratio / parallel_ratio / base_move
}

export interface ThinBlendInput {
  now: Date | string;
  target: { gradeState: GradeState; grade?: string | number | null };
  signals: ThinSignal[];
  higherGradeSales?: { price: number; date: string | Date }[];
  scarcerParallelSales?: { price: number; date: string | Date }[];
  lowestBin?: number | null;
}

export interface SignalResult {
  kind: SignalKind;
  n: number; // sales used
  r: number; // ratio applied
  sigmaM: number; // method noise
  m: number; // log level
  var: number;
  weightShare: number;
}

export interface Excluded {
  kind: SignalKind | "input" | "cap";
  reason: string;
}

export type Cap = "higher_grade" | "scarcer_parallel" | "bin";

export type ThinBlendResult =
  | { applies: false; reason: string; method: "thin_blend" }
  | {
      applies: true;
      value: number | null;
      low: number | null;
      high: number | null;
      sd: number | null;
      confidence: number | null;
      confidenceUncapped: number | null;
      capsApplied: Cap[];
      conflict: boolean;
      indexAssumed: boolean;
      signals: SignalResult[];
      excluded: Excluded[];
      method: "thin_blend";
    };

export const SIGMA0 = 0.25;
export const HALF_LIFE_DAYS = 180;
export const Z80 = 1.2816;
export const GATE_DAYS = 90;
export const GATE_SALES = 3;
export const PURCHASE_MAX_DAYS = 730;
export const CAP_WINDOW_DAYS = 180;
export const RECENT_EXACT_DAYS = 365;
export const MIN_RATIOS = 3;
const SIGMA_M_FIXED: Partial<Record<SignalKind, number>> = { exact: 0, purchase: 0.2, proxy: 0.5 };
const RATIO_KINDS: SignalKind[] = ["grade_ratio", "parallel_ratio", "base_move"];
const KINDS: SignalKind[] = ["exact", ...RATIO_KINDS, "purchase", "proxy"];
const DAY_MS = 86_400_000;

export function confidenceFromSd(sd: number): number {
  if (sd <= 0.15) return 5;
  if (sd <= 0.25) return 4;
  if (sd <= 0.4) return 3;
  if (sd <= 0.6) return 2;
  return 1;
}

export function saleVariance(ageDays: number): number {
  return SIGMA0 * SIGMA0 * (1 + ageDays / HALF_LIFE_DAYS);
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
};

/** 1.4826 × MAD of ln(ratios) around their median. */
export function robustLogSd(ratios: number[]): number {
  const logs = ratios.map(Math.log);
  const med = median(logs);
  return 1.4826 * median(logs.map((l) => Math.abs(l - med)));
}

const toTime = (d: unknown): number => {
  if (d instanceof Date) return d.getTime();
  if (typeof d === "string" || typeof d === "number") return new Date(d).getTime();
  return NaN;
};
const isPos = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x > 0;
const cents = (x: number) => Math.round(x * 100) / 100;

/** Age in days, or null for a bad or future (> 1 day) date. Same-day skew clamps to 0. */
const ageOf = (date: unknown, now: number): number | null => {
  const t = toTime(date);
  if (!Number.isFinite(t)) return null;
  const age = (now - t) / DAY_MS;
  if (age < -1) return null;
  return Math.max(0, age);
};

function emptyResult(excluded: Excluded[]): ThinBlendResult {
  return {
    applies: true,
    value: null,
    low: null,
    high: null,
    sd: null,
    confidence: null,
    confidenceUncapped: null,
    capsApplied: [],
    conflict: false,
    indexAssumed: false,
    signals: [],
    excluded,
    method: "thin_blend",
  };
}

interface Usable {
  kind: SignalKind;
  sales: { price: number; age: number; index: number; indexGiven: boolean }[];
  ratios: number[];
}

export function thinBlend(input: ThinBlendInput): ThinBlendResult {
  try {
    return compute(input);
  } catch (e) {
    return emptyResult([{ kind: "input", reason: `error: ${e instanceof Error ? e.message : String(e)}` }]);
  }
}

function compute(input: ThinBlendInput): ThinBlendResult {
  const excluded: Excluded[] = [];
  if (!input || typeof input !== "object") return emptyResult([{ kind: "input", reason: "no input; no usable signals" }]);
  const now = toTime(input.now);
  if (!Number.isFinite(now)) return emptyResult([{ kind: "input", reason: "bad now; no usable signals" }]);
  const targetState = input.target?.gradeState;
  if (targetState !== "raw" && targetState !== "graded") {
    return emptyResult([{ kind: "input", reason: "target gradeState missing; no usable signals" }]);
  }
  const rawSignals: unknown[] = Array.isArray(input.signals) ? input.signals : [];

  // 1. Validate signals and sales.
  const usable: Usable[] = [];
  for (const raw of rawSignals) {
    const sig = raw as Partial<ThinSignal> | null;
    if (!sig || typeof sig !== "object" || !KINDS.includes(sig.kind as SignalKind)) {
      excluded.push({ kind: "input", reason: "unknown signal kind" });
      continue;
    }
    const kind = sig.kind as SignalKind;
    if (sig.gradeState !== targetState) {
      excluded.push({ kind, reason: "grade state" });
      continue;
    }
    let ratios: number[] = [];
    if (RATIO_KINDS.includes(kind)) {
      ratios = (Array.isArray(sig.ratios) ? sig.ratios : []).filter(isPos);
      if (ratios.length < MIN_RATIOS) {
        excluded.push({ kind, reason: `fewer than ${MIN_RATIOS} ratios (${ratios.length})` });
        continue;
      }
    }
    const sales: Usable["sales"] = [];
    for (const s of Array.isArray(sig.sales) ? sig.sales : []) {
      if (!s || !isPos(s.price)) {
        excluded.push({ kind, reason: "zero, negative or missing price" });
        continue;
      }
      const age = ageOf(s.date, now);
      if (age === null) {
        excluded.push({ kind, reason: "bad or future date" });
        continue;
      }
      if (kind === "purchase" && age > PURCHASE_MAX_DAYS) {
        excluded.push({ kind, reason: `purchase older than ${PURCHASE_MAX_DAYS} days` });
        continue;
      }
      const indexGiven = s.indexFactor !== undefined && s.indexFactor !== null;
      if (indexGiven && !isPos(s.indexFactor)) {
        excluded.push({ kind, reason: "bad indexFactor" });
        continue;
      }
      sales.push({ price: s.price, age, index: indexGiven ? (s.indexFactor as number) : 1, indexGiven });
    }
    if (!sales.length) {
      excluded.push({ kind, reason: "no usable sales" });
      continue;
    }
    usable.push({ kind, sales, ratios });
  }

  // 2. Gate: 3+ exact sales within 90 days -> the plain median rule stands.
  const recentExact = usable
    .filter((u) => u.kind === "exact")
    .reduce((n, u) => n + u.sales.filter((s) => s.age <= GATE_DAYS).length, 0);
  if (recentExact >= GATE_SALES) {
    return { applies: false, reason: `${recentExact} exact sales within ${GATE_DAYS} days: use the 90-day median`, method: "thin_blend" };
  }

  // 3. Proxy only when there is no exact or ratio signal.
  const hasStrong = usable.some((u) => u.kind === "exact" || RATIO_KINDS.includes(u.kind));
  const used = usable.filter((u) => {
    if (u.kind === "proxy" && hasStrong) {
      excluded.push({ kind: "proxy", reason: "proxy not used: an exact or ratio signal exists" });
      return false;
    }
    return true;
  });
  if (!used.length) return emptyResult([...excluded, { kind: "input", reason: "no usable signals" }]);

  // 4. Per-signal level and variance.
  const sigs = used.map((u) => {
    const r = RATIO_KINDS.includes(u.kind) ? median(u.ratios) : 1;
    const sigmaM = RATIO_KINDS.includes(u.kind) ? robustLogSd(u.ratios) : SIGMA_M_FIXED[u.kind]!;
    let sp = 0;
    let spl = 0;
    for (const s of u.sales) {
      const p = 1 / saleVariance(s.age);
      sp += p;
      spl += p * Math.log(s.price * s.index * r);
    }
    return { kind: u.kind, n: u.sales.length, r, sigmaM, m: spl / sp, var: 1 / sp + sigmaM * sigmaM };
  });

  // 5. Combine.
  const P = sigs.map((s) => 1 / s.var);
  const sumP = P.reduce((a, b) => a + b, 0);
  const lnV = sigs.reduce((a, s, i) => a + P[i] * s.m, 0) / sumP;
  const sd = 1 / Math.sqrt(sumP);
  let value = Math.exp(lnV);
  let low = value * Math.exp(-Z80 * sd);
  let high = value * Math.exp(Z80 * sd);

  // 6. Confidence and caps on it.
  const confidenceUncapped = confidenceFromSd(sd);
  let confidence = confidenceUncapped;
  const exactWithinYear = used.some((u) => u.kind === "exact" && u.sales.some((s) => s.age <= RECENT_EXACT_DAYS));
  const onlyWeak = used.every((u) => u.kind === "purchase" || u.kind === "proxy");
  if (!exactWithinYear || onlyWeak) confidence = Math.min(confidence, 2);

  // 7. Hard caps after combining.
  const capsApplied: Cap[] = [];
  const lowestRecent = (sales: unknown, cap: Cap): number | null => {
    if (!Array.isArray(sales)) return null;
    let min: number | null = null;
    for (const s of sales) {
      if (!s || !isPos(s.price)) {
        excluded.push({ kind: "cap", reason: `${cap}: zero, negative or missing price` });
        continue;
      }
      const age = ageOf(s.date, now);
      if (age === null || age > CAP_WINDOW_DAYS) continue;
      if (min === null || s.price < min) min = s.price;
    }
    return min;
  };
  const caps: [Cap, number | null][] = [
    ["higher_grade", lowestRecent(input.higherGradeSales, "higher_grade")],
    ["scarcer_parallel", lowestRecent(input.scarcerParallelSales, "scarcer_parallel")],
    ["bin", isPos(input.lowestBin) ? input.lowestBin : null],
  ];
  for (const [name, cap] of caps) {
    if (cap === null || cap >= high) continue;
    capsApplied.push(name);
    high = cap;
    value = Math.min(value, cap);
  }
  low = Math.min(low, value);

  // 8. Conflict: any two signals more than 2 sd apart in log terms.
  let conflict = false;
  for (let i = 0; i < sigs.length; i++)
    for (let j = i + 1; j < sigs.length; j++)
      if (Math.abs(sigs[i].m - sigs[j].m) > 2 * Math.sqrt(sigs[i].var + sigs[j].var)) conflict = true;

  return {
    applies: true,
    value: cents(value),
    low: cents(low),
    high: cents(high),
    sd,
    confidence,
    confidenceUncapped,
    capsApplied,
    conflict,
    indexAssumed: used.some((u) => u.sales.some((s) => !s.indexGiven)),
    signals: sigs.map((s, i) => ({ ...s, weightShare: P[i] / sumP })),
    excluded,
    method: "thin_blend",
  };
}

/** For the CLI / weekly job: JSON with ISO date strings; `now` defaults to the current time. */
export function thinBlendFromJson(json: unknown): ThinBlendResult {
  if (!json || typeof json !== "object") return thinBlend(json as ThinBlendInput);
  const o = json as Record<string, unknown>;
  return thinBlend({ ...(o as unknown as ThinBlendInput), now: (o.now as string | undefined) ?? new Date() });
}
