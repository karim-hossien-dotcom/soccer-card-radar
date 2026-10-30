export type VaultComp = { grade: string; price: number; method: string; source: string; asOf: string };

/** Approved owner values (Karim's yes). Workbook "Value used" rows (source workbook_import) are old prices, not overrides. */
const OWNER_SOURCES = new Set(["owner_set", "ratio_to_base"]);
export const isOwnerValue = (c: Pick<VaultComp, "source">) => OWNER_SOURCES.has(c.source);

/** Same-date rank: owner values first, workbook imports last, every other source in between. */
const tieRank = (c: VaultComp) => (isOwnerValue(c) ? 0 : c.source === "workbook_import" ? 2 : 1);

/**
 * Newest comp wins; same date: owner values win, workbook imports lose to any other source. Within one rank the
 * earlier rule stays (value_used before sale comps, then input order).
 */
export const byRecency = (a: VaultComp, b: VaultComp) =>
  b.asOf.localeCompare(a.asOf) || tieRank(a) - tieRank(b) || Number(b.method === "value_used") - Number(a.method === "value_used");

/** A sale comp (median of sales), not a chosen value: excludes value_used rows, workbook or owner. */
export const isSaleComp = (c: Pick<VaultComp, "method">) => c.method !== "value_used";

/** Price-record label: where a chosen value came from; sale comps show their method. */
export const compLabel = (c: Pick<VaultComp, "method" | "source">) =>
  isOwnerValue(c) ? "owner value" : c.method === "value_used" ? "workbook value" : c.method;

/**
 * Card-comps Vault rule: a card's value at a grade = newest CardComp for that grade (tie-break: byRecency).
 * Comps only: never band/multiple estimates. Used for the Vault "Value now", the max-bid inputs, the grading-table
 * sale comps and the Snipe prefill.
 */
export const vaultComp = <T extends VaultComp>(comps: T[], grade: string): T | undefined =>
  comps.filter((c) => c.grade === grade).sort(byRecency)[0];

/** C5: Vault max-bid inputs follow the Vault value at each grade. */
export const maxBidInputs = (comps: VaultComp[]) => ({
  raw: vaultComp(comps, "raw")?.price ?? null,
  psa9: vaultComp(comps, "PSA 9")?.price ?? null,
  psa10: vaultComp(comps, "PSA 10")?.price ?? null,
});
