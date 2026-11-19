import { test } from "node:test";
import assert from "node:assert/strict";
import { valueCard, configFromAssumptions } from "./value-engine.ts";

const cfg = configFromAssumptions({ fee_to_grade_a_raw_in_hand_card: 32.99 });
const near = (a: number | null, b: number, label: string) => {
  if (a === null) return assert.fail(`${label} is null`);
  assert.ok(Math.abs(a - b) <= 0.01, `${label}: got ${a}, expected ${b}`);
};

test("all three graded comps: values are the comps, nets after cost (at PSA: fee already in cost)", () => {
  // 2017 Topps Chrome UCL #24 Salah Blue Refractor /150, at PSA (workbook check 2026-10-16).
  const v = valueCard({ status: "at_grader", item: "2017 Topps Chrome UCL #24 Mohamed Salah Blue Refractor /150", cost: 256.63, valueUsed: 195.04, comps: { psa10: 514, psa9: 196, psa8: 122, raw: 188 } }, cfg);
  assert.deepEqual([v.psa10, v.psa9, v.psa8], [514, 196, 122]);
  near(v.net10, 257.37, "net10"); near(v.net9, -60.63, "net9"); near(v.net8, -134.63, "net8");
  assert.equal(v.decision, null);
});

test("only a raw comp: no graded values and decision No comps (Nov 19 2026: no multiples or bands)", () => {
  const v = valueCard({ status: "raw", item: "2024-25 Topps Dynasty Mainoo Black 3/5", cost: 713.98, valueUsed: 601.55, comps: { raw: 601.55 } }, cfg);
  assert.deepEqual([v.psa10, v.psa9, v.psa8, v.net10, v.net9, v.net8], [null, null, null, null, null, null]);
  assert.equal(v.decision, "No comps");
});

test("a missing grade stays missing: PSA 10 comp only gives no PSA 9 or PSA 8", () => {
  const v = valueCard({ status: "raw", item: "2023-24 Prizm PL Mainoo Blue Mosaic RC", cost: 7.2, valueUsed: 10, comps: { psa10: 70 } }, cfg);
  assert.equal(v.psa10, 70); assert.equal(v.psa9, null); assert.equal(v.psa8, null);
  near(v.net10, 70 - 7.2 - 32.99, "net10");
  assert.equal(v.decision, "Grade only if likely PSA 10");
});

test("grade-or-keep call from real comps", () => {
  const base = { status: "raw" as const, item: "x", cost: 10, valueUsed: 20 };
  assert.equal(valueCard({ ...base, comps: { psa9: 100, psa10: 300, raw: 20 } }, cfg).decision, "Grade: beats raw even at PSA 9");
  assert.equal(valueCard({ ...base, comps: { psa9: 40, psa10: 300, raw: 20 } }, cfg).decision, "Grade only if likely PSA 10");
  assert.equal(valueCard({ ...base, comps: { psa9: 40, psa10: 50, raw: 20 } }, cfg).decision, "Keep raw");
});

test("graded, sealed and lots are not valued for grading", () => {
  for (const [status, item] of [["graded", "x"], ["sealed", "Booster Box"], ["raw", "Topps Now #46 Salah (Qty 40, base)"]] as const) {
    const v = valueCard({ status, item, cost: 10, valueUsed: 10, comps: { psa10: 100, psa9: 50 } }, cfg);
    assert.equal(v.psa10, null);
    assert.equal(v.decision, null);
  }
});

test("no comps and no raw value -> No comps", () => {
  const v = valueCard({ status: "raw", item: "Unknown card", cost: 5, valueUsed: null, comps: {} }, cfg);
  assert.equal(v.decision, "No comps");
});
