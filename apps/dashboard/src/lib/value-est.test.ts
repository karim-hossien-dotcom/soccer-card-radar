import { test } from "node:test";
import assert from "node:assert/strict";
import { valueEst, toCompRow, estTileTag, estDrawerText, isMissingColumn, COMP_COLS, COMP_COLS_LEGACY } from "./value-est.ts";
import { vaultComp, type VaultComp } from "./vault-comp.ts";

// Synthetic numbers (TB1 case A'), not Karim's prices.
const base = { grade: "PSA 8", asOf: "2026-11-02" };
const thin: VaultComp = { ...base, price: 76.74, method: "thin_blend", source: "estimate", low: 47.38, high: 120, confidence: 2 };
const handApplied: VaultComp = { ...base, price: 55, method: "thin_blend", source: "estimate" };
const sale: VaultComp = { ...base, price: 60, method: "median", source: "cardladder_manual", low: null, high: null, confidence: null };

test("estimate comp with range -> valueEst filled in", () => {
  assert.deepEqual(valueEst(thin), { low: 47.38, high: 120, confidence: 2, method: "thin_blend" });
});

test("sale comp -> valueEst null (also with no comp)", () => {
  assert.equal(valueEst(sale), null);
  assert.equal(valueEst(undefined), null);
});

test("estimate comp without range (hand-applied, or columns not migrated yet) -> method only", () => {
  assert.deepEqual(valueEst(handApplied), { low: null, high: null, confidence: null, method: "thin_blend" });
});

test("toCompRow: missing columns read as null; numeric strings become numbers", () => {
  const legacy = toCompRow({ cardId: "x", grade: "raw", price: "12.50", method: "median", source: "ebay_sold", asOf: "2026-11-01" });
  assert.deepEqual(legacy, { grade: "raw", price: 12.5, method: "median", source: "ebay_sold", asOf: "2026-11-01", low: null, high: null, confidence: null });
  const full = toCompRow({ cardId: "x", ...base, price: "76.74", method: "thin_blend", source: "estimate", low: "47.38", high: "120.00", confidence: 2 });
  assert.equal(full.low, 47.38);
  assert.equal(full.high, 120);
  assert.equal(full.confidence, 2);
});

test("vaultComp still picks the newest comp; valueEst follows it", () => {
  const older = { ...thin, asOf: "2026-10-01" };
  assert.equal(valueEst(vaultComp([older, sale], "PSA 8")), null);
  assert.deepEqual(valueEst(vaultComp([sale, { ...thin, asOf: "2026-11-03" }], "PSA 8"))?.confidence, 2);
});

test("tile tag: ' est. 2/5' with confidence, ' est.' without, nothing for sale comps", () => {
  assert.equal(estTileTag(valueEst(thin)), " est. 2/5");
  assert.equal(estTileTag(valueEst(handApplied)), " est.");
  assert.equal(estTileTag(null), null);
});

test("drawer 'Value now' text", () => {
  assert.equal(estDrawerText(76.74, valueEst(thin)), "$76.74 · $47–$120 · thin_blend · 2/5");
  assert.equal(estDrawerText(55, valueEst(handApplied)), "$55.00 · est. · thin_blend");
  assert.equal(estDrawerText(60, null), "$60.00");
  assert.equal(estDrawerText(null, null), "—");
  // Range without confidence, or confidence without range: show only what exists, never an invented part.
  assert.equal(estDrawerText(76.74, { low: 47.38, high: 120, confidence: null, method: "thin_blend" }), "$76.74 · $47–$120 · thin_blend");
  assert.equal(estDrawerText(76.74, { low: null, high: null, confidence: 3, method: "thin_blend" }), "$76.74 · thin_blend · 3/5");
});

test("tolerant read: missing-column errors are recognised, others are not", () => {
  assert.ok(isMissingColumn({ code: "42703", message: 'column CardComp.low does not exist' }));
  assert.ok(isMissingColumn({ message: 'column CardComp.confidence does not exist' }));
  assert.ok(!isMissingColumn({ code: "42501", message: "permission denied for table CardComp" }));
  assert.ok(!isMissingColumn(null));
  assert.match(COMP_COLS, /low, high, confidence/);
  assert.doesNotMatch(COMP_COLS_LEGACY, /low|high|confidence/);
});
