import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scenarioValue, cardGain, vaultTotals, selectionTotals, toggleSelection, parseSelection,
  readStoredSelection, writeStoredSelection, SELECTION_KEY, SCENARIOS, type ScenarioCard, type Scenario,
} from "./vault-scenario.ts";

// Synthetic cards only.
const card = (id: string, o: Partial<ScenarioCard>): ScenarioCard =>
  ({ id, status: "raw", valueNow: 40, psa10: 300, psa9: 120, psa8: 70, cost: 20, ...o });
const A = card("a", {});
const B = card("b", { valueNow: 60, psa10: 500, psa9: 150, psa8: 90, cost: 35 });
const NO10 = card("no10", { valueNow: 25, psa10: null, psa9: 80, psa8: 50, cost: 10 });
const AT = card("at", { status: "at_grader", valueNow: 100, psa10: 900, psa9: 250, psa8: 140, cost: 130 });
const GRADED = card("g", { status: "graded", valueNow: 210, psa10: 999, psa9: 999, psa8: 999, cost: 150 });
const NOCOST = card("nc", { cost: null, valueNow: 15, psa10: 90, psa9: 40, psa8: 25 });
const NOVAL = card("nv", { valueNow: null, psa10: null, psa9: null, psa8: null, cost: 12 });
const ALL = [A, B, NO10, AT, GRADED, NOCOST, NOVAL];

// main's Vault code before V1 (regression reference); V2 removed the sealed branch (no sealed rows in the Vault).
function mainScenarioValue(c: ScenarioCard, sc: Scenario): number | null {
  if (sc === "now" || c.status === "graded") return c.valueNow;
  const v = sc === "10" ? c.psa10 : sc === "9" ? c.psa9 : c.psa8;
  return v ?? c.valueNow;
}
function mainTotals(list: ScenarioCard[], scen: Scenario) {
  let cost = 0, value = 0, withCost = 0;
  for (const c of list) {
    const v = mainScenarioValue(c, scen);
    if (v !== null) value += v;
    if (c.cost !== null) { cost += c.cost; if (v !== null) withCost += v - c.cost; }
  }
  return { cost, value, gain: withCost };
}

test("scenarioValue and vaultTotals equal main at every Price as setting", () => {
  for (const sc of SCENARIOS) {
    for (const c of ALL) assert.equal(scenarioValue(c, sc), mainScenarioValue(c, sc), `${c.id} @ ${sc}`);
    assert.deepEqual(vaultTotals(ALL, sc), mainTotals(ALL, sc), `totals @ ${sc}`);
  }
});

test("Price as falls back to value now when the grade has no value; graded uses value now", () => {
  assert.equal(scenarioValue(NO10, "10"), 25);
  assert.equal(scenarioValue(GRADED, "10"), 210);
  assert.equal(cardGain(A, "10"), 280);
  assert.equal(cardGain(NOCOST, "10"), null);
  assert.equal(cardGain(NOVAL, "10"), null);
});

test("selectionTotals: 3 cards at PSA 10 add up by hand", () => {
  const t = selectionTotals(ALL, ["a", "b", "at"], "10");
  assert.deepEqual(t, { count: 3, value: 300 + 500 + 900, cost: 20 + 35 + 130, gain: 280 + 465 + 770 });
});

test("selectionTotals follows Price as for the same selection (Now/10/9/8)", () => {
  const sel = ["a", "at"];
  const want: Record<Scenario, number> = { now: 140, "10": 1200, "9": 370, "8": 210 };
  for (const sc of SCENARIOS) {
    const t = selectionTotals(ALL, sel, sc);
    assert.equal(t.value, want[sc], sc);
    assert.equal(t.cost, 150);
    assert.equal(t.gain, want[sc] - 150);
  }
});

test("selectionTotals uses the tile fallback: no grade value -> value now; graded -> value now", () => {
  const t = selectionTotals(ALL, ["no10", "g"], "10");
  assert.deepEqual(t, { count: 2, value: 25 + 210, cost: 10 + 150, gain: 15 + 60 });
});

test("selectionTotals: no cost adds value only; no value adds cost only (as the Vault totals do)", () => {
  assert.deepEqual(selectionTotals(ALL, ["nc", "nv"], "9"), { count: 2, value: 40, cost: 12, gain: 0 });
});

test("selectionTotals ignores unknown ids and duplicates, and is independent of the filter list", () => {
  assert.deepEqual(selectionTotals(ALL, ["a", "a", "gone"], "now"), { count: 1, value: 40, cost: 20, gain: 20 });
  assert.deepEqual(selectionTotals(ALL, [], "10"), { count: 0, value: 0, cost: 0, gain: 0 });
  // Selection of all cards equals the Vault totals.
  for (const sc of SCENARIOS) {
    const { count, ...rest } = selectionTotals(ALL, ALL.map((c) => c.id), sc);
    assert.equal(count, ALL.length);
    assert.deepEqual(rest, vaultTotals(ALL, sc));
  }
});

test("toggleSelection adds and removes without mutating the input", () => {
  const s0: string[] = [];
  const s1 = toggleSelection(s0, "a");
  const s2 = toggleSelection(s1, "b");
  const s3 = toggleSelection(s2, "a");
  assert.deepEqual(s0, []);
  assert.deepEqual(s1, ["a"]);
  assert.deepEqual(s2, ["a", "b"]);
  assert.deepEqual(s3, ["b"]);
});

test("parseSelection never throws and keeps unique non-empty strings", () => {
  for (const raw of [null, "", "garbage", "{}", '{"a":1}', "42", "null"]) assert.deepEqual(parseSelection(raw), []);
  assert.deepEqual(parseSelection('["a", 1, "", null, "b", "a"]'), ["a", "b"]);
  assert.deepEqual(parseSelection(JSON.stringify(["x", "y"])), ["x", "y"]);
});

test("stored selection: round-trips, empty removes the key, missing or throwing storage is safe", () => {
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  assert.equal(writeStoredSelection(store, ["a", "b"]), true);
  assert.deepEqual(readStoredSelection(store), ["a", "b"]);
  assert.equal(writeStoredSelection(store, []), true);
  assert.equal(mem.has(SELECTION_KEY), false);
  const bad = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("denied"); } };
  assert.deepEqual(readStoredSelection(bad), []);
  assert.equal(writeStoredSelection(bad, ["a"]), false);
  assert.deepEqual(readStoredSelection(null), []);
  assert.equal(writeStoredSelection(undefined, ["a"]), false);
});
