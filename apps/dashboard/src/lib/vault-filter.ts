/** V2: Vault "Show" filter. Basketball narrows by sport; every other option shows all sports so totals are unchanged. */
export type Sport = "soccer" | "basketball";
export type ShowFilter = "all" | "graded" | "raw" | "at_grader" | "stale" | "basketball";
export type FilterCard = { status: string; stale: boolean; sport: Sport };

/** Card.sport is 'soccer' by default; anything missing or unknown reads as soccer. */
export const toSport = (v: unknown): Sport => (v === "basketball" ? "basketball" : "soccer");

export function matchesShow(c: FilterCard, show: ShowFilter): boolean {
  if (show === "all") return true;
  if (show === "basketball") return c.sport === "basketball";
  if (show === "stale") return c.stale;
  return c.status === show;
}

export const sportCount = (cards: readonly FilterCard[], sport: Sport) => cards.filter((c) => c.sport === sport).length;
