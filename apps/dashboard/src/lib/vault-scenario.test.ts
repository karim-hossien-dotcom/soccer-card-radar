import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scenarioValue, effectiveScenario, cardValue, vaultTotals, parseOverrides, serializeOverrides, canOverride,
  readStoredOverrides, writeStoredOverrides, OVERRIDES_KEY, SCENARIOS, type ScenarioCard, type Scenario,
} from "./vault-scenario.ts";

// Synthetic cards only.
const card = (id: string, o: Partial<ScenarioCard>): ScenarioCard =>
  ({ id, status: "raw", valueNow: 40, psa10: 300, psa9: 120, psa8: 70, cost: 20, ...o });
const A = card("a", {});
const B = card("b", { valueNow: 60, psa10: 500, psa9: 150, psa8: 90, cost: 35 });
const NO10 = card("no10", { valueNow: 25, psa10: null, psa9: 80, psa8: 50, cost: 10 });
const AT = card("at", { status: "at_grader", valueNow: 100, psa10: 900, psa9: 250, psa8: 140, cost: 130 });
const GRADED = card("g", { status: "graded", valueNow: 210, psa10: 999, psa9: 999, psa8: 999, cost: 150 });
const SEALED = card("s", { status: "sealed", valueNow: 95, psa10: null, psa9: null, psa8: null, cost: 80 });
const NOCOST = card("nc", { cost: null, valueNow: 15, psa10: 90, psa9: 40, psa8: 25 });
const ALL = [A, B, NO10, AT, GRADED, SEALED, NOCOST];

test("no override: each card follows the global grade (Now/10/9/8)", () => {
  const want: Record<Scenario, number> = { now: 40, "10": 300, "9": 120, "8": 70 };
  for (const g of SCENARIOS) {
    assert.equal(effectiveScenario(g, {}, A), g);
    assert.deepEqual(cardValue(A, g, {}), { value: want[g], noComp: false, scenario: g, overridden: false });
  }
});

test("override 10 while global is 9: the card uses psa10, others still follow 9", () => {
  const ov = { a: "10" as const };
  assert.equal(effectiveScenario("9", ov, A), "10");
  assert.equal(cardValue(A, "9", ov).value, 300);
  assert.equal(cardValue(A, "9", ov).overridden, true);
  assert.equal(cardValue(B, "9", ov).value, 150);
  assert.equal(cardValue(AT, "9", { at: "8" }).value, 140);
});

test("override on a graded or sealed card is ignored and returns valueNow", () => {
  for (const c of [GRADED, SEALED]) {
    assert.equal(canOverride(c), false);
    for (const o of ["10", "9", "8"] as const) {
      assert.equal(effectiveScenario("9", { [c.id]: o }, c), "9");
      assert.deepEqual(cardValue(c, "9", { [c.id]: o }), { value: c.valueNow, noComp: false, scenario: "9", overridden: false });
    }
  }
  assert.equal(vaultTotals([GRADED, SEALED], "now", { g: "10", s: "10" }).overridden, 0);
});

test("override 10 with psa10 null: no comp, excluded from value and gain, cost still counts", () => {
  const r = cardValue(NO10, "9", { no10: "10" });
  assert.deepEqual(r, { value: null, noComp: true, scenario: "10", overridden: true });
  const base = vaultTotals([A, NO10], "9", {});
  const t = vaultTotals([A, NO10], "9", { no10: "10" });
  assert.equal(base.value, 120 + 80);
  assert.equal(t.value, 120);
  assert.equal(t.cost, 20 + 10);
  assert.equal(t.gain, 120 - 20);
  assert.equal(t.noComp, 1);
  assert.equal(t.overridden, 1);
});

test("global 10 with psa10 null and no override: falls back to valueNow, same as today", () => {
  assert.deepEqual(cardValue(NO10, "10", {}), { value: 25, noComp: false, scenario: "10", overridden: false });
  assert.equal(scenarioValue(NO10, "10"), 25);
  assert.equal(vaultTotals([NO10], "10", {}).noComp, 0);
});

test("vaultTotals counts overridden only for cards in the list passed in (stale ids ignored)", () => {
  const ov = { a: "10" as const, b: "8" as const, gone: "10" as const, g: "10" as const };
  assert.equal(vaultTotals([A], "9", ov).overridden, 1);
  assert.equal(vaultTotals([A, B, GRADED], "9", ov).overridden, 2);
  assert.equal(vaultTotals([], "9", ov).overridden, 0);
});

test("vaultTotals by hand: global 9, A -> 10, no10 -> 10", () => {
  const t = vaultTotals(ALL, "9", { a: "10", no10: "10" });
  // value: A 300 + B 150 + no10 (no comp) + AT 250 + graded 210 + sealed 95 + nocost 40
  assert.equal(t.value, 300 + 150 + 250 + 210 + 95 + 40);
  assert.equal(t.cost, 20 + 35 + 10 + 130 + 150 + 80);
  assert.equal(t.gain, (300 - 20) + (150 - 35) + (250 - 130) + (210 - 150) + (95 - 80));
  assert.deepEqual([t.overridden, t.noComp], [2, 1]);
});

// AC2 regression: main's totals and sort keys, copied verbatim from collection-view.tsx before V1.
function mainScenarioValue(c: ScenarioCard, sc: Scenario): number | null {
  if (sc === "now" || c.status === "graded" || c.status === "sealed") return c.valueNow;
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

test("no overrides: totals and per-card values equal main at every global setting", () => {
  const withNulls = [...ALL, card("nv", { valueNow: null, psa10: null, psa9: null, psa8: null, cost: 5 })];
  for (const g of SCENARIOS) {
    const { value, cost, gain, overridden, noComp } = vaultTotals(withNulls, g, {});
    assert.deepEqual({ value, cost, gain }, mainTotals(withNulls, g), g);
    assert.deepEqual([overridden, noComp], [0, 0]);
    for (const c of withNulls) assert.equal(cardValue(c, g, {}).value, mainScenarioValue(c, g), `${g} ${c.id}`);
  }
});

test("parseOverrides never throws and cleans bad input; a valid map round-trips", () => {
  for (const raw of [null, "", "garbage", "[]", '["10"]', "null", "42", '"10"', '{"x":"11"}', '{"x":10}', '{"x":null}', '{"__proto__":"10"}']) {
    const m = parseOverrides(raw);
    assert.deepEqual(m, {}, String(raw));
    assert.equal(Object.getPrototypeOf(m), Object.prototype);
  }
  assert.deepEqual(parseOverrides('{"a":"10","b":"11","c":"now","d":{"x":1}}'), { a: "10", c: "now" });
  const valid = { a: "10", b: "9", c: "8", d: "now" } as const;
  assert.deepEqual(parseOverrides(serializeOverrides(valid)), valid);
});

test("storage helpers: missing or throwing localStorage never throws", () => {
  const throwing = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("denied"); } };
  assert.deepEqual(readStoredOverrides(throwing), {});
  assert.deepEqual(readStoredOverrides(undefined), {});
  assert.equal(writeStoredOverrides(throwing, { a: "10" }), false);
  assert.equal(writeStoredOverrides(throwing, {}), false);
  assert.equal(writeStoredOverrides(undefined, { a: "10" }), false);

  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  assert.equal(writeStoredOverrides(store, { a: "10" }), true);
  assert.equal(mem.get(OVERRIDES_KEY), '{"a":"10"}');
  assert.deepEqual(readStoredOverrides(store), { a: "10" });
  writeStoredOverrides(store, {}); // reset clears the key
  assert.equal(mem.has(OVERRIDES_KEY), false);
  assert.equal(OVERRIDES_KEY, "vault.gradeOverrides.v1");
});
