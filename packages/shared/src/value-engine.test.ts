import { test } from "node:test";
import assert from "node:assert/strict";
import { valueCard, maxBid, bandFor, configFromAssumptions, type CardInput } from "./value-engine.ts";

// Assumption table as imported to Supabase 2026-10-16.
const cfg = configFromAssumptions({
  fee_to_grade_a_raw_in_hand_card: 32.99,
  psa_10_psa_9_multiple_no_psa_10_comp: 2.5,
  psa_9_psa_10_multiple_no_psa_9_comp: 0.4,
  psa_8_psa_9_multiple_no_psa_8_comp: 0.65,
  band_rare_25_or_less_ssp_psa10: 2.76, band_rare_25_or_less_ssp_psa9: 0.95,
  band_raw_100_psa10: 2.15, band_raw_100_psa9: 1,
  band_raw_25_100_psa10: 2.31, band_raw_25_100_psa9: 1.39,
  band_raw_under_25_psa10: 5, band_raw_under_25_psa9: 1.78,
});

type Fx = { item: string; status: CardInput["status"]; cost: number; valueUsed: number; c10: number | null; c9: number | null; c8: number | null; craw: number | null;
  exp: { psa10: number; psa9: number; psa8: number; net10: number; net9: number; net8: number; decision: string | null } };

// Expected values copied from card_collection_master.xlsx (All Cards O:T, AB) on 2026-10-16.
const fixtures: Fx[] = [
  { item: "2026 PANINI PRIZM FIFA WORLD CUP 2026 MANGA #8 RAPHINHA", status: "raw", cost: 349.36, valueUsed: 419.99, c10: 1090, c9: null, c8: null, craw: 432, exp: { psa10: 1090, psa9: 436, psa8: 283.4, net10: 707.65, net9: 53.65, net8: -98.95, decision: "Grade only if likely PSA 10" } },
  { item: "2025-2026 TOPPS UEFA CLUB COMPETITIONS 8BIT SHOTS #8B-19 MOHAMED SALAH ORANGE FOIL", status: "raw", cost: 123.63, valueUsed: 162.5, c10: null, c9: null, c8: null, craw: 151, exp: { psa10: 324.65, psa9: 151, psa8: 98.15, net10: 168.03, net9: -5.62, net8: -58.47, decision: "Grade only if likely PSA 10" } },
  { item: "2025-26 Topps Chrome UCC Jude Bellingham Black Lazer Auto Green /99", status: "raw", cost: 230.59, valueUsed: 209, c10: 550, c9: 178, c8: null, craw: null, exp: { psa10: 550, psa9: 178, psa8: 115.7, net10: 286.42, net9: -85.58, net8: -147.88, decision: "Grade only if likely PSA 10" } },
  { item: "2025-26 Panini Select LaLiga Pedri Fun Club Field Level White /20", status: "raw", cost: 25.26, valueUsed: 23, c10: null, c9: null, c8: null, craw: null, exp: { psa10: 63.48, psa9: 21.85, psa8: 14.2, net10: 5.23, net9: -36.4, net8: -44.05, decision: "Grade only if likely PSA 10" } },
  { item: "2018-19 Panini Donruss Cristiano Ronaldo #158 Optic Purple Velocity /125", status: "raw", cost: 54.63, valueUsed: 63, c10: 210.5, c9: 89.88, c8: null, craw: null, exp: { psa10: 210.5, psa9: 89.88, psa8: 58.42, net10: 122.88, net9: 2.26, net8: -29.2, decision: "Grade only if likely PSA 10" } },
  { item: "2024 Topps UEFA Kobbie Mainoo Gold /50", status: "raw", cost: 10.6, valueUsed: 9, c10: null, c9: null, c8: null, craw: null, exp: { psa10: 45, psa9: 16.02, psa8: 10.41, net10: 1.41, net9: -27.57, net8: -33.18, decision: "Grade only if likely PSA 10" } },
  { item: "2023-24 Panini Prizm Premier League Kobbie Mainoo Blue Mosaic RC", status: "raw", cost: 7.2, valueUsed: 10, c10: 70, c9: null, c8: null, craw: null, exp: { psa10: 70, psa9: 28, psa8: 18.2, net10: 29.81, net9: -12.19, net8: -21.99, decision: "Grade only if likely PSA 10" } },
  { item: "2026 Panini Prizm World Cup Zizo Red RC /50", status: "raw", cost: 10.74, valueUsed: 5, c10: null, c9: null, c8: null, craw: null, exp: { psa10: 25, psa9: 8.9, psa8: 5.79, net10: -18.73, net9: -34.83, net8: -37.95, decision: "Keep raw" } },
  { item: "2024-25 Topps Chrome UCC Roman Numeral Mohamed Salah III/XI SSP", status: "raw", cost: 226.3, valueUsed: 202.51, c10: null, c9: 590, c8: null, craw: null, exp: { psa10: 1475, psa9: 590, psa8: 383.5, net10: 1215.71, net9: 330.71, net8: 124.21, decision: "Grade: beats raw even at PSA 9" } },
  { item: "2017 Topps Chrome UCL #24 Mohamed Salah Blue Refractor /150", status: "at_grader", cost: 256.63, valueUsed: 195.04, c10: 514, c9: 196, c8: 122, craw: 188, exp: { psa10: 514, psa9: 196, psa8: 122, net10: 257.37, net9: -60.63, net8: -134.63, decision: null } },
  { item: "2024 Topps Chrome Logofractor UCC #9 Erling Haaland Black Starball /10", status: "at_grader", cost: 234.07, valueUsed: 150, c10: null, c9: null, c8: null, craw: 150, exp: { psa10: 414, psa9: 142.5, psa8: 92.62, net10: 179.93, net9: -91.57, net8: -141.44, decision: null } },
  { item: "2022 Panini Prizm World Cup Qatar Scorers Club #10 Lionel Messi", status: "at_grader", cost: 24.99, valueUsed: 20, c10: 269, c9: 77, c8: 30, craw: 20, exp: { psa10: 269, psa9: 77, psa8: 30, net10: 244.01, net9: 52.01, net8: 5.01, decision: null } },
];

const close = (a: number | null, b: number, label: string) => {
  if (a === null) return assert.fail(`${label} is null`);
  assert.ok(Math.abs(a - b) <= 0.01, `${label}: got ${a}, expected ${b}`);
};

for (const f of fixtures) {
  test(`matches workbook: ${f.item.slice(0, 60)}`, () => {
    const v = valueCard({ status: f.status, item: f.item, cost: f.cost, valueUsed: f.valueUsed, comps: { psa10: f.c10, psa9: f.c9, psa8: f.c8, raw: f.craw } }, cfg);
    close(v.psa10, f.exp.psa10, "psa10"); close(v.psa9, f.exp.psa9, "psa9"); close(v.psa8, f.exp.psa8, "psa8");
    close(v.net10, f.exp.net10, "net10"); close(v.net9, f.exp.net9, "net9"); close(v.net8, f.exp.net8, "net8");
    assert.equal(v.decision, f.exp.decision);
  });
}

test("max bid = min(PSA 9 / 2, PSA 10 / 4): 2014 Prizm WC #161 Ronaldo", () => {
  assert.equal(maxBid(84, 331), 42);
  assert.equal(maxBid(null, 331), null);
});

test("graded, sealed and lots are not valued for grading", () => {
  for (const [status, item] of [["graded", "x"], ["sealed", "Booster Box"], ["raw", "Topps Now #46 Salah (Qty 40, base)"]] as const) {
    const v = valueCard({ status, item, cost: 10, valueUsed: 10, comps: {} }, cfg);
    assert.equal(v.psa10, null);
    assert.equal(v.decision, null);
  }
});

test("bands: print run, SSP, raw price", () => {
  assert.equal(bandFor("Something /10", 500), "Rare (/25 or less, SSP)");
  assert.equal(bandFor("Roman Numeral SSP", 5), "Rare (/25 or less, SSP)");
  assert.equal(bandFor("Base /99", 150), "Raw $100+");
  assert.equal(bandFor("Base", 50), "Raw $25-100");
  assert.equal(bandFor("Base", 10), "Raw under $25");
  assert.equal(bandFor("Base", null), null);
});

test("no comps and no raw value -> No comps", () => {
  const v = valueCard({ status: "raw", item: "Unknown card", cost: 5, valueUsed: null, comps: {} }, cfg);
  assert.equal(v.decision, "No comps");
});
