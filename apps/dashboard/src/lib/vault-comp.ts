export type VaultComp = {
  id?: number | null; // V3a: CardComp.id, links the comp to its CompSale rows (absent in older fixtures)
  grade: string; price: number; method: string; source: string; asOf: string;
  // TB2: estimate range + confidence (null/absent on sale comps, hand-applied estimates and before the migration).
  low?: number | null; high?: number | null; confidence?: number | null;
};

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

/** PC1c: slab grades with no number (Authentic / AUTH / Altered, any grader). */
const NO_NUMBER_GRADE_RE = /^(auth|authentic|altered)$/i;
export const isNoNumberGrade = (grade: string | null | undefined) => !!grade && NO_NUMBER_GRADE_RE.test(grade.trim());
/** Graders whose number grades have their own comp key; any other grader's slab is valued as raw. */
const VALUED_GRADERS = ["PSA", "BGS", "SGC", "CGC"];

/**
 * Comp key a Vault card is valued on: "<grader> <grade>" for a number grade; "raw" for a raw card, a card at the
 * grader, (PC1c) an Authentic / Altered slab, which is valued from the same card's raw sales, and (review(PC1c)) a
 * slab from a grader other than PSA / BGS / SGC / CGC.
 */
export const vaultGradeKey = (grader: string | null | undefined, grade: string | null | undefined) => {
  // review(PC1c): graders other than PSA, BGS, SGC and CGC (e.g. VGC) are valued as raw cards (CLAUDE.md).
  const g = (grader ?? "").trim().toUpperCase().replace("BECKETT", "BGS");
  return grade && grade.trim() && VALUED_GRADERS.includes(g) && !isNoNumberGrade(grade) ? `${g} ${grade.trim()}` : "raw";
};

/** Drawer / list grade label: "PSA 10", "CGC Authentic" (AUTH or Authentic), "CGC Altered"; "At PSA" or "Raw" otherwise. */
export const vaultGradeLabel = (grader: string | null | undefined, grade: string | null | undefined, status: string) => {
  if (grader && grade) {
    const g = grade.trim();
    if (!isNoNumberGrade(g)) return `${grader} ${grade}`;
    return `${grader} ${/^alt/i.test(g) ? "Altered" : "Authentic"}`;
  }
  return status === "at_grader" ? "At PSA" : "Raw";
};

/** C5: Vault max-bid inputs follow the Vault value at each grade. */
export const maxBidInputs = (comps: VaultComp[]) => ({
  raw: vaultComp(comps, "raw")?.price ?? null,
  psa9: vaultComp(comps, "PSA 9")?.price ?? null,
  psa10: vaultComp(comps, "PSA 10")?.price ?? null,
});
