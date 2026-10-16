import { test } from "node:test";
import assert from "node:assert/strict";
import { snipeScore, expectedGraded, snipeMaxBid, rarityValue, formValue, DEFAULT_CONFIG, type SnipeCard, type SnipePlayer } from "./snipe-score.ts";

const WORKBOOK = { ...DEFAULT_CONFIG, gemHaircut: 1, psa9Haircut: 1 };

// Grade Screen row: 2014 Prizm WC #161 Ronaldo base (raw 25, PSA 9 84, PSA 10 331, pop 6599 / 3981 / 1755).
const ronaldo161: SnipeCard = { raw: 25, psa9: 84, psa10: 331, popTotal: 6599, pop9: 3981, pop10: 1755, printRun: null, ssp: false };
const legend: SnipePlayer = { signal: "BUY", tier: "S", legend: true, form: null };

test("matches the workbook Grade Screen for #161", () => {
  const g = expectedGraded(ronaldo161, WORKBOOK)!;
  assert.equal(g.ev, 141.97); // workbook 141.97
  assert.equal(snipeMaxBid(84, 331), 42); // workbook max buy 42
  const r = snipeScore(ronaldo161, null, legend, WORKBOOK);
  assert.equal(r.profit, 83.98); // workbook expected profit 83.98 (raw price)
});

test("haircuts scale pop PSA 10 and PSA 9 rates; the rest is valued at raw", () => {
  const g = expectedGraded(ronaldo161)!; // defaults 0.6 / 0.5
  const pop10 = 1755 / 6599, pop9 = 3981 / 6599;
  assert.ok(Math.abs(g.gem - pop10 * 0.6) < 1e-9);
  assert.ok(Math.abs(g.r9 - pop9 * 0.5) < 1e-9);
  const ev = pop10 * 0.6 * 331 + pop9 * 0.5 * 84 + (1 - pop10 * 0.6 - pop9 * 0.5) * 25;
  assert.equal(g.ev, Math.round(ev * 100) / 100);
  assert.ok(g.ev < 141.97);
});

test("low-confidence comps scale grading upside", () => {
  const silver: SnipeCard = { raw: 810, psa9: 2499, psa10: 11100, popTotal: 182, pop9: 112, pop10: 38, printRun: null, ssp: false };
  const up = (confidence: string) => snipeScore({ ...silver, confidence }, null, legend).parts.find((p) => p.key === "upside")!.value!;
  assert.equal(up("High"), 1);
  assert.equal(up("Low"), 0.6);
});

test("missing live price drops steal and renormalises; legend ignores form", () => {
  const r = snipeScore(ronaldo161, null, legend);
  const by = Object.fromEntries(r.parts.map((p) => [p.key, p]));
  assert.equal(by.steal.value, null);
  assert.equal(by.form.weight, 0);
  assert.match(by.form.note, /stats ignored/);
  // steal and form drop out: score = (25 x upside + 15 x 0.2 rarity + 12 signal + 8 tier) / 60
  assert.equal(r.score, Math.round((100 * (25 * by.upside.value + 15 * 0.2 + 12 + 8)) / 60));
});

test("steal curve: at max bid 0.5, half of max bid 0.75, 1.5x max bid 0", () => {
  const v = (price: number) => snipeScore(ronaldo161, price, legend).parts.find((p) => p.key === "steal")!.value;
  assert.equal(v(42), 0.5);
  assert.equal(v(21), 0.75);
  assert.equal(v(63), 0);
});

test("no pop data uses assumed rates and says so", () => {
  const haaland74: SnipeCard = { raw: 138, psa9: 220, psa10: 405, popTotal: null, pop9: null, pop10: null, printRun: null, ssp: false };
  const g = expectedGraded(haaland74)!;
  assert.equal(g.assumed, true);
  assert.equal(g.ev, Math.round((0.2 * 405 + 0.5 * 220 + 0.3 * 138) * 100) / 100);
  const r = snipeScore(haaland74, 150, { signal: "BUY", tier: "S", legend: false, form: null });
  assert.equal(r.ratesAssumed, true);
  assert.match(r.parts.find((p) => p.key === "form")!.note, /no approved stats/);
});

test("rarity bands and low-pop floor", () => {
  assert.equal(rarityValue({ ...ronaldo161, printRun: 10 }).value, 1);
  assert.equal(rarityValue({ ...ronaldo161, printRun: 25 }).value, 0.9);
  assert.equal(rarityValue({ ...ronaldo161, printRun: null, ssp: true }).value, 0.8);
  assert.equal(rarityValue({ ...ronaldo161, popTotal: 170 }).value, 0.7);
});

test("form: Yamal-like season scores high, injured youngster low on minutes", () => {
  const yamal = formValue({ apps: 8, minutes: 671, goals: 7, assists: 5, avgRating: 8.66, age: 19 }).value!;
  const kroupi = formValue({ apps: 0, minutes: 0, goals: 0, assists: 0, avgRating: null, age: 20 }).value!;
  assert.ok(yamal > 0.95, `yamal ${yamal}`);
  assert.equal(kroupi, 0.5); // minutes 0 and youth 1
  assert.equal(formValue({ apps: null, minutes: null, goals: null, assists: null, avgRating: null, age: null }).value, null);
});
