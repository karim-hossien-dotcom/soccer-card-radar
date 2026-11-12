/** V1: Vault "Price as" scenario plus per-card grade overrides. Pure: no React, no I/O (storage is passed in). */

export type Scenario = "now" | "10" | "9" | "8";
export const SCENARIOS: readonly Scenario[] = ["now", "10", "9", "8"];
export type Overrides = Record<string, Scenario>;
export const OVERRIDES_KEY = "vault.gradeOverrides.v1";

export type ScenarioCard = {
  id: string;
  status: string;
  valueNow: number | null;
  psa10: number | null;
  psa9: number | null;
  psa8: number | null;
  cost: number | null;
};

const isScenario = (v: unknown): v is Scenario => typeof v === "string" && (SCENARIOS as readonly string[]).includes(v);
const gradeValue = (c: ScenarioCard, sc: Exclude<Scenario, "now">) => (sc === "10" ? c.psa10 : sc === "9" ? c.psa9 : c.psa8);

/** Only raw and at-grader cards change with the grade; graded and sealed cards are worth their own comp. */
export const canOverride = (c: Pick<ScenarioCard, "status">) => c.status === "raw" || c.status === "at_grader";

/** Global "Price as" value: a missing grade value falls back to value now (unchanged from before V1). */
export function scenarioValue(c: ScenarioCard, sc: Scenario): number | null {
  if (sc === "now" || !canOverride(c)) return c.valueNow;
  return gradeValue(c, sc) ?? c.valueNow;
}

export function effectiveScenario(global: Scenario, overrides: Overrides, card: ScenarioCard): Scenario {
  const o = canOverride(card) && Object.prototype.hasOwnProperty.call(overrides, card.id) ? overrides[card.id] : undefined;
  return isScenario(o) ? o : global;
}

export type CardValue = { value: number | null; noComp: boolean; scenario: Scenario; overridden: boolean };

/** A per-card override to a grade with no value is "no comp" (no fallback); the global path keeps its fallback. */
export function cardValue(card: ScenarioCard, global: Scenario, overrides: Overrides): CardValue {
  const scenario = effectiveScenario(global, overrides, card);
  const overridden = canOverride(card) && isScenario(overrides[card.id]);
  if (overridden && scenario !== "now" && gradeValue(card, scenario) === null) return { value: null, noComp: true, scenario, overridden };
  return { value: scenarioValue(card, scenario), noComp: false, scenario, overridden };
}

export const cardGain = (card: ScenarioCard, global: Scenario, overrides: Overrides) => {
  const v = cardValue(card, global, overrides).value;
  return v === null || card.cost === null ? null : v - card.cost;
};

export function vaultTotals(cards: ScenarioCard[], global: Scenario, overrides: Overrides) {
  let value = 0, cost = 0, gain = 0, overridden = 0, noComp = 0;
  for (const c of cards) {
    const r = cardValue(c, global, overrides);
    if (r.overridden) overridden++;
    if (r.noComp) noComp++;
    if (r.value !== null) value += r.value;
    if (c.cost !== null) { cost += c.cost; if (r.value !== null) gain += r.value - c.cost; }
  }
  return { value, cost, gain, overridden, noComp };
}

/** Never throws: corrupt JSON, non-objects and unknown grades give an empty or cleaned map. */
export function parseOverrides(raw: string | null): Overrides {
  let o: unknown;
  try { o = raw ? JSON.parse(raw) : null; } catch { return {}; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  const out: Overrides = {};
  for (const [k, v] of Object.entries(o)) if (k !== "__proto__" && isScenario(v)) out[k] = v;
  return out;
}

export const serializeOverrides = (m: Overrides) => JSON.stringify(parseOverrides(JSON.stringify(m)));

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readStoredOverrides(store: Store | undefined | null): Overrides {
  try { return store ? parseOverrides(store.getItem(OVERRIDES_KEY)) : {}; } catch { return {}; }
}

/** Empty map removes the key. Returns false when storage is missing or throws (private mode, quota). */
export function writeStoredOverrides(store: Store | undefined | null, m: Overrides): boolean {
  if (!store) return false;
  try {
    if (Object.keys(m).length) store.setItem(OVERRIDES_KEY, serializeOverrides(m)); else store.removeItem(OVERRIDES_KEY);
    return true;
  } catch { return false; }
}
