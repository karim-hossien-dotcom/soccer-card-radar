/**
 * V3a: the sales behind a Vault value (CompSale rows, kept and rejected by the card-comps "Sale check").
 * Display only: never changes a value, total or max bid.
 */

export type SaleSource = "ebay" | "cardladder" | "psa_apr";
/**
 * Sale-check reject codes. The automated ones are comp-guard's sale-level error codes (packages/shared comp-guard.ts),
 * so a job can store comp-guard output as is; card (check 1) and unclear (check 6) are set by the person/agent checking.
 */
export type RejectReason =
  | "card" | "parallel_word" | "auto_mismatch" | "grade_mismatch" | "lot" | "own_sale" | "unclear" | "sale_age";

/** One CompSale row as /api/comps?cardId= returns it. */
export type CompSaleRow = {
  compId: number; date: string; price: number; title: string; source: SaleSource; url: string | null;
  kept: boolean; rejectReason: RejectReason | null;
};

/** Sale-check codes (checks 1-7, 'lot' split out of check 4) -> drawer labels. */
export const REASON_LABEL: Record<RejectReason, string> = {
  card: "other card",
  parallel_word: "other parallel",
  auto_mismatch: "auto/relic",
  grade_mismatch: "other grade/grader",
  lot: "lot",
  own_sale: "Karim's own sale/buy",
  unclear: "unclear title/photo",
  sale_age: "older than 90 days",
};

export const SOURCE_LABEL: Record<SaleSource, string> = { ebay: "eBay", cardladder: "Card Ladder", psa_apr: "PSA APR" };

export const NO_EVIDENCE = "no evidence — old value";
export const NO_EXACT_SALE = "no exact sale — estimate";

export type KeptSale = { date: string; price: number; title: string; url: string | null; source: SaleSource };
export type RejectedCount = { reason: RejectReason; label: string; count: number };

export type CompEvidence =
  | { kind: "sales"; n: number; from: string; to: string; sources: SaleSource[]; kept: KeptSale[]; rejected: RejectedCount[] }
  | { kind: "none"; text: string; rejected: RejectedCount[] };

/**
 * Evidence for one comp. Only kept rows count toward n, the range and the list; rejected rows only as counts per
 * reason. Zero kept sales -> amber "none" (estimates say "no exact sale — estimate", every other comp "no evidence — old value").
 */
export function compEvidence(
  comp: { id?: number | null; source: string },
  sales: CompSaleRow[],
): CompEvidence {
  const mine = comp.id === null || comp.id === undefined ? [] : sales.filter((r) => Number(r.compId) === comp.id);
  const counts = new Map<RejectReason, number>();
  for (const r of mine) if (!r.kept && r.rejectReason) counts.set(r.rejectReason, (counts.get(r.rejectReason) ?? 0) + 1);
  const rejected = [...counts.entries()]
    .map(([reason, count]) => ({ reason, label: REASON_LABEL[reason] ?? reason, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)); // tie: by the label shown

  const kept = mine
    .filter((r) => r.kept && !r.rejectReason)
    .map((r) => ({ date: r.date, price: Number(r.price), title: r.title, url: r.url ?? null, source: r.source }))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (kept.length === 0) return { kind: "none", text: comp.source === "estimate" ? NO_EXACT_SALE : NO_EVIDENCE, rejected };

  // Distinct sources, most kept sales first (tie: newest sale first).
  const perSource = new Map<SaleSource, number>();
  for (const k of kept) perSource.set(k.source, (perSource.get(k.source) ?? 0) + 1);
  const sources = [...perSource.keys()].sort((a, b) => perSource.get(b)! - perSource.get(a)!);
  return { kind: "sales", n: kept.length, from: kept[kept.length - 1].date, to: kept[0].date, sources, kept, rejected };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (d: string, withYear: boolean) => {
  const [y, m, dd] = d.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(dd)}${withYear ? ` ${y}` : ""}`;
};

/** "Aug 20 – Nov 9"; one date -> "Nov 9"; across years -> "Dec 20 2025 – Jan 9 2026". */
export function dateRange(from: string, to: string): string {
  if (from === to) return day(to, false);
  const years = from.slice(0, 4) !== to.slice(0, 4);
  return `${day(from, years)} – ${day(to, years)}`;
}

/** Evidence line: "n=5 · Aug 20 – Nov 9 · eBay, Card Ladder". */
export const evidenceLine = (e: Extract<CompEvidence, { kind: "sales" }>) =>
  `n=${e.n} · ${dateRange(e.from, e.to)} · ${e.sources.map((s) => SOURCE_LABEL[s] ?? s).join(", ")}`;

/** "3 rejected: 2 other parallel, 1 Karim's own sale/buy"; nothing rejected -> null. */
export function rejectedLine(rejected: RejectedCount[]): string | null {
  const total = rejected.reduce((s, r) => s + r.count, 0);
  if (total === 0) return null;
  return `${total} rejected: ${rejected.map((r) => `${r.count} ${r.label}`).join(", ")}`;
}

/** Postgres undefined_table (42P01) or PostgREST "not in the schema cache" (PGRST205): CompSale not migrated yet. */
export const isMissingTable = (err: { code?: string; message?: string } | null | undefined) =>
  !!err && (err.code === "42P01" || err.code === "PGRST205" || /relation .* does not exist|could not find the table/i.test(err.message ?? ""));

/** Only http(s) links are rendered (titles come from scraped data). */
export const safeUrl = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);
