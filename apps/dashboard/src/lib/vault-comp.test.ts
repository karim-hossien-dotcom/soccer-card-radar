import { test } from "node:test";
import assert from "node:assert/strict";
import { vaultComp, maxBidInputs, type VaultComp } from "./vault-comp.ts";

const c = (grade: string, price: number, method: string, source: string, asOf: string): VaultComp => ({ grade, price, method, source, asOf });

// Fixture: Mainoo Inception 19/49 (at PSA).
const mainoo = [
  c("raw", 338.95, "value_used", "workbook_import", "2026-10-16"),
  c("PSA 10", 618, "median", "workbook_import", "2026-10-16"),
  c("PSA 9", 206, "median", "workbook_import", "2026-10-16"),
  c("raw", 529, "median", "cardladder_manual", "2026-10-16"),
];

test("max-bid inputs: same-date value_used wins over the sale median (Mainoo 19/49 raw 338.95, not 529)", () => {
  assert.deepEqual(maxBidInputs(mainoo), { raw: 338.95, psa9: 206, psa10: 618 });
  assert.equal(vaultComp(mainoo, "raw")?.price, 338.95);
});

test("max-bid inputs: newest comp wins, owner overrides count", () => {
  const comps = [
    c("raw", 100, "value_used", "workbook_import", "2026-10-01"),
    c("raw", 120, "median", "cardladder_manual", "2026-10-20"),
    c("PSA 10", 500, "median", "workbook_import", "2026-10-01"),
    c("PSA 10", 450, "median", "owner_set", "2026-10-25"),
    c("PSA 9", 200, "median", "workbook_import", "2026-10-01"),
    c("PSA 9", 247.66, "median", "ratio_to_base", "2026-10-30"),
  ];
  assert.deepEqual(maxBidInputs(comps), { raw: 120, psa9: 247.66, psa10: 450 });
});

test("max-bid inputs: comps only, no grade comp -> null (no band/multiple estimate)", () => {
  assert.deepEqual(maxBidInputs([c("raw", 50, "median", "cardladder_manual", "2026-10-20")]), { raw: 50, psa9: null, psa10: null });
  assert.deepEqual(maxBidInputs([]), { raw: null, psa9: null, psa10: null });
});
