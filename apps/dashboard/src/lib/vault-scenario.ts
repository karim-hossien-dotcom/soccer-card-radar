/** Vault "Price as" scenario and the V1 card selection totals. Pure: no React, no I/O (storage is passed in). */

export type Scenario = "now" | "10" | "9" | "8";
export const SCENARIOS: readonly Scenario[] = ["now", "10", "9", "8"];
export const SELECTION_KEY = "vault.selection.v1";

export type ScenarioCard = {
  id: string;
  status: string;
  valueNow: number | null;
  psa10: number | null;
  psa9: number | null;
  psa8: number | null;
  cost: number | null;
};

/** "Price as" value: graded and sealed cards keep their own comp; a missing grade value falls back to value now. */
export function scenarioValue(c: ScenarioCard, sc: Scenario): number | null {
  if (sc === "now" || c.status === "graded" || c.status === "sealed") return c.valueNow;
  const v = sc === "10" ? c.psa10 : sc === "9" ? c.psa9 : c.psa8;
  return v ?? c.valueNow;
}

export const cardGain = (c: ScenarioCard, sc: Scenario) => {
  const v = scenarioValue(c, sc);
  return v === null || c.cost === null ? null : v - c.cost;
};

/** Value sums every card with a value; cost every card with a cost; gain only cards with both. */
export function vaultTotals(cards: ScenarioCard[], sc: Scenario) {
  let cost = 0, value = 0, gain = 0;
  for (const c of cards) {
    const v = scenarioValue(c, sc);
    if (v !== null) value += v;
    if (c.cost !== null) { cost += c.cost; if (v !== null) gain += v - c.cost; }
  }
  return { cost, value, gain };
}

/** Totals for the checked cards, over all cards (not just the filtered list). Unknown ids (sold, removed) are ignored. */
export function selectionTotals(cards: ScenarioCard[], selected: Iterable<string>, sc: Scenario) {
  const ids = new Set(selected);
  const picked = cards.filter((c) => ids.has(c.id));
  return { count: picked.length, ...vaultTotals(picked, sc) };
}

export const toggleSelection = (sel: readonly string[], id: string): string[] =>
  sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id];

/** Never throws: anything but an array of strings gives [] or a cleaned, de-duplicated list. */
export function parseSelection(raw: string | null): string[] {
  let o: unknown;
  try { o = raw ? JSON.parse(raw) : null; } catch { return []; }
  if (!Array.isArray(o)) return [];
  return [...new Set(o.filter((x): x is string => typeof x === "string" && x.length > 0))];
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readStoredSelection(store: Store | undefined | null): string[] {
  try { return store ? parseSelection(store.getItem(SELECTION_KEY)) : []; } catch { return []; }
}

/** Empty list removes the key. Returns false when storage is missing or throws. */
export function writeStoredSelection(store: Store | undefined | null, sel: readonly string[]): boolean {
  if (!store) return false;
  try {
    if (sel.length) store.setItem(SELECTION_KEY, JSON.stringify(sel)); else store.removeItem(SELECTION_KEY);
    return true;
  } catch { return false; }
}
