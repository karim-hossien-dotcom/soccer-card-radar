import { test } from "node:test";
import assert from "node:assert/strict";
import { vaultComp, maxBidInputs, compLabel, type VaultComp } from "./vault-comp.ts";
import { snipeMaxBid, DEFAULT_CONFIG } from "../../../../packages/shared/src/snipe-score.ts";

const c = (grade: string, price: number, method: string, source: string, asOf: string): VaultComp => ({ grade, price, method, source, asOf });

// Fixture: Mainoo Inception 19/49 (at PSA).
const mainoo = [
  c("raw", 338.95, "value_used", "workbook_import", "2026-10-16"),
  c("PSA 10", 618, "median", "workbook_import", "2026-10-16"),
  c("PSA 9", 206, "median", "workbook_import", "2026-10-16"),
  c("raw", 529, "median", "cardladder_manual", "2026-10-16"),
];

test("workbook value_used loses a same-date tie to a sale median (Mainoo 19/49 raw 529, not 338.95)", () => {
  // Workbook "Value used" rows are old prices, not owner overrides. Both row orders (sort is stable).
  for (const rows of [mainoo, [...mainoo].reverse()]) {
    assert.deepEqual(maxBidInputs(rows), { raw: 529, psa9: 206, psa10: 618 });
    assert.equal(vaultComp(rows, "raw")?.source, "cardladder_manual");
  }
  // C5 max bid by hand (no pop -> assumed 20% PSA 10 / 50% PSA 9 / 30% raw; 13% sell fee, $32.99 grading, / 2, 80% raw cap):
  // EV = 0.2 x 618 + 0.5 x 206 + 0.3 x 529 = 385.30; (385.30 x 0.87 - 32.99) / 2 = 151.11 < cap 423.20.
  const bid = snipeMaxBid({ ...maxBidInputs(mainoo), popTotal: null, pop9: null, pop10: null, printRun: null, ssp: false }, DEFAULT_CONFIG);
  assert.equal(bid, 151.11);
});

test("owner values (owner_set, ratio_to_base) win same-date ties, in both row orders", () => {
  for (const source of ["owner_set", "ratio_to_base"]) {
    const rows = [
      c("raw", 400, "value_used", source, "2026-10-20"),
      c("raw", 529, "median", "cardladder_manual", "2026-10-20"),
      c("raw", 338.95, "value_used", "workbook_import", "2026-10-20"),
    ];
    for (const r of [rows, [...rows].reverse()]) assert.equal(vaultComp(r, "raw")?.price, 400, source);
  }
});

test("within one source the earlier tie-break stays: workbook value_used beats a same-date workbook median", () => {
  const rows = [c("PSA 9", 10, "median", "workbook_import", "2026-10-16"), c("PSA 9", 12, "value_used", "workbook_import", "2026-10-16")];
  for (const r of [rows, [...rows].reverse()]) assert.equal(vaultComp(r, "PSA 9")?.price, 12);
});

test("newest comp wins over any source", () => {
  const comps = [
    c("raw", 100, "value_used", "owner_set", "2026-10-01"),
    c("raw", 120, "median", "cardladder_manual", "2026-10-20"),
    c("PSA 10", 500, "median", "cardladder_manual", "2026-10-01"),
    c("PSA 10", 450, "value_used", "owner_set", "2026-10-25"),
    c("PSA 9", 200, "median", "cardladder_manual", "2026-10-01"),
    c("PSA 9", 247.66, "value_used", "ratio_to_base", "2026-10-30"),
    c("PSA 8", 80, "median", "cardladder_manual", "2026-10-01"),
    c("PSA 8", 90, "value_used", "workbook_import", "2026-10-16"),
  ];
  assert.deepEqual(maxBidInputs(comps), { raw: 120, psa9: 247.66, psa10: 450 });
  assert.equal(vaultComp(comps, "PSA 8")?.price, 90);
});

test("price-record labels: owner value / workbook value / sale method", () => {
  assert.equal(compLabel(c("raw", 1, "value_used", "owner_set", "2026-10-01")), "owner value");
  assert.equal(compLabel(c("raw", 1, "value_used", "ratio_to_base", "2026-10-01")), "owner value");
  assert.equal(compLabel(c("raw", 1, "value_used", "workbook_import", "2026-10-01")), "workbook value");
  assert.equal(compLabel(c("raw", 1, "median", "cardladder_manual", "2026-10-01")), "median");
});

test("max-bid inputs: comps only, no grade comp -> null (no band/multiple estimate)", () => {
  assert.deepEqual(maxBidInputs([c("raw", 50, "median", "cardladder_manual", "2026-10-20")]), { raw: 50, psa9: null, psa10: null });
  assert.deepEqual(maxBidInputs([]), { raw: null, psa9: null, psa10: null });
});
