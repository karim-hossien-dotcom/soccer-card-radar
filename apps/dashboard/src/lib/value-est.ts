import type { VaultComp } from "./vault-comp";

/** TB2: an estimate's 80% range, confidence (1-5) and method. Range/confidence are null on older hand-applied rows. */
export type ValueEst = { low: number | null; high: number | null; confidence: number | null; method: string };

/** CardComp select. COMP_COLS_LEGACY is the fallback while 20261103b_card_comp_range.sql is not applied. */
export const COMP_COLS = '"cardId", grade, price, method, source, "asOf", low, high, confidence';
export const COMP_COLS_LEGACY = '"cardId", grade, price, method, source, "asOf"';

/** Postgres undefined_column (42703), as PostgREST reports it. */
export const isMissingColumn = (err: { code?: string; message?: string } | null | undefined) =>
  !!err && (err.code === "42703" || /column .* does not exist/i.test(err.message ?? ""));

const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

type RawComp = { grade: string; price: unknown; method: string; source: string; asOf: string; low?: unknown; high?: unknown; confidence?: unknown };

/** DB or fixture row -> CompRow. Missing range/confidence fields read as null. */
export const toCompRow = (c: RawComp): VaultComp => ({
  grade: c.grade, price: Number(c.price), method: c.method, source: c.source, asOf: c.asOf,
  low: numOrNull(c.low), high: numOrNull(c.high), confidence: numOrNull(c.confidence),
});

/** Set only when the comp behind "Value now" is an estimate. */
export const valueEst = (c: VaultComp | undefined): ValueEst | null =>
  c && c.source === "estimate" ? { low: c.low ?? null, high: c.high ?? null, confidence: c.confidence ?? null, method: c.method } : null;

const usd = (n: number, d: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });

/** Grid tile tag after the value (scenario "now"). */
export const estTileTag = (e: ValueEst | null) => (e ? ` est.${e.confidence !== null ? ` ${e.confidence}/5` : ""}` : null);

/** Drawer "Value now": "$76.74 · $47–$120 · thin_blend · 2/5"; without range or confidence "$55.00 · est. · thin_blend". */
export function estDrawerText(value: number | null, e: ValueEst | null): string {
  if (value === null) return "—";
  if (!e) return usd(value, 2);
  const range = e.low !== null && e.high !== null ? `${usd(e.low, 0)}–${usd(e.high, 0)}` : null;
  if (range === null && e.confidence === null) return `${usd(value, 2)} · est. · ${e.method}`;
  return [usd(value, 2), range, e.method, e.confidence !== null ? `${e.confidence}/5` : null].filter(Boolean).join(" · ");
}
