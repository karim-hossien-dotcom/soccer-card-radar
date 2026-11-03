import { test } from "node:test";
import assert from "node:assert/strict";
import {
  thinBlend,
  thinBlendFromJson,
  confidenceFromSd,
  type ThinBlendInput,
  type ThinBlendResult,
  type DatedSale,
} from "./thin-blend.ts";

// All prices below are synthetic (the repo is public).
const NOW = new Date("2026-11-03T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const sale = (price: number, days: number, indexFactor?: number): DatedSale =>
  indexFactor === undefined ? { price, date: ago(days) } : { price, date: ago(days), indexFactor };

const LOG = 0.002;
const USD = 0.1;
const near = (actual: number | null | undefined, expected: number, tol: number, what: string) => {
  assert.ok(actual !== null && actual !== undefined, `${what} is null`);
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} vs ${expected} (tol ${tol})`);
};
const applied = (r: ThinBlendResult) => {
  assert.equal(r.applies, true);
  if (!r.applies) throw new Error("unreachable");
  return r;
};

const psa9 = [sale(150, 30), sale(120, 90), sale(180, 150)];
const caseA: ThinBlendInput = {
  now: NOW,
  target: { gradeState: "graded", grade: "PSA 8" },
  signals: [
    { kind: "exact", gradeState: "graded", sales: [sale(40, 1460)] },
    { kind: "grade_ratio", gradeState: "graded", sales: psa9, ratios: [0.4, 0.55, 0.65, 0.85, 1.1] },
  ],
  higherGradeSales: psa9,
};

const caseB: ThinBlendInput = {
  now: NOW,
  target: { gradeState: "raw", grade: null },
  signals: [
    { kind: "purchase", gradeState: "raw", sales: [sale(100, 200)] },
    { kind: "proxy", gradeState: "raw", sales: [sale(70, 60), sale(80, 100)] },
  ],
};

test("AC1 case A': exact + grade_ratio, higher-grade cap, 365-day confidence cap", () => {
  const r = applied(thinBlend(caseA));
  const [s1, s2] = r.signals;
  assert.equal(s1.kind, "exact");
  near(s1.m, 3.6889, LOG, "m1");
  near(s1.var, 0.5694, LOG, "var1");
  assert.equal(s2.kind, "grade_ratio");
  near(s2.r, 0.65, 1e-9, "ratio");
  near(s2.sigmaM, 0.3977, LOG, "sigma_m");
  near(s2.m, 4.556, LOG, "m2");
  near(s2.var, 0.1884, LOG, "var2");
  near(Math.log(r.value!), 4.3405, LOG, "ln V");
  near(r.value, 76.74, USD, "V");
  near(r.sd, 0.3762, LOG, "sd");
  near(r.low, 47.38, USD, "low");
  near(r.high, 120.0, USD, "high (capped)");
  assert.ok(r.capsApplied.includes("higher_grade"));
  assert.equal(r.confidenceUncapped, 3);
  assert.equal(r.confidence, 2);
  assert.equal(r.conflict, false);
  near(s1.weightShare, 0.249, LOG, "exact weightShare");
  near(s1.weightShare + s2.weightShare, 1, 1e-9, "weight shares sum");
  assert.equal(r.indexAssumed, true);
  assert.equal(r.method, "thin_blend");
});

test("AC1 case A' uncapped range is $47.38-$124.29", () => {
  const r = applied(thinBlend({ ...caseA, higherGradeSales: [] }));
  near(r.low, 47.38, USD, "low");
  near(r.high, 124.29, USD, "high");
  assert.deepEqual(r.capsApplied, []);
});

test("AC2 case B': purchase + proxy, purchase/proxy-only confidence cap", () => {
  const r = applied(thinBlend(caseB));
  const purchase = r.signals.find((s) => s.kind === "purchase")!;
  const proxy = r.signals.find((s) => s.kind === "proxy")!;
  near(purchase.var, 0.1719, LOG, "purchase var");
  near(1 / purchase.var, 5.816, 0.01, "purchase P");
  near(purchase.m, 4.6052, LOG, "purchase m");
  near(proxy.m, 4.3101, LOG, "proxy m");
  near(proxy.var, 0.2949, LOG, "proxy var");
  near(1 / proxy.var, 3.391, 0.01, "proxy P");
  near(Math.log(r.value!), 4.4965, LOG, "ln V");
  near(r.value, 89.7, USD, "V");
  near(r.sd, 0.3296, LOG, "sd");
  near(r.low, 58.8, USD, "low");
  near(r.high, 136.85, USD, "high");
  assert.equal(r.confidenceUncapped, 3);
  assert.equal(r.confidence, 2);
  assert.deepEqual(r.capsApplied, []);
});

test("AC3 case B' with lowestBin 85 caps value and high, low unchanged", () => {
  const r = applied(thinBlend({ ...caseB, lowestBin: 85 }));
  near(r.value, 85, 0.001, "V");
  near(r.high, 85, 0.001, "high");
  near(r.low, 58.8, USD, "low");
  assert.ok(r.capsApplied.includes("bin"));
});

test("AC4 conflict flag when signals disagree beyond 2 sd", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [
        { kind: "exact", gradeState: "raw", sales: [sale(40, 0)] },
        { kind: "purchase", gradeState: "raw", sales: [sale(200, 0)] },
      ],
    }),
  );
  near(r.signals[0].var, 0.0625, LOG, "exact var");
  near(r.signals[1].var, 0.1025, LOG, "purchase var");
  assert.equal(r.conflict, true);
});

test("AC5 gate: 3 exact sales within 90 days -> applies false", () => {
  const r = thinBlend({
    now: NOW,
    target: { gradeState: "raw", grade: null },
    signals: [{ kind: "exact", gradeState: "raw", sales: [sale(30, 10), sale(32, 40), sale(34, 89)] }],
  });
  assert.equal(r.applies, false);
});

test("AC5 gate: 2 exact sales within 90 days (plus an older one) enter the blend", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [{ kind: "exact", gradeState: "raw", sales: [sale(30, 10), sale(36, 60), sale(50, 200)] }],
    }),
  );
  // m = precision-weighted mean of ln prices
  const vars = [10, 60, 200].map((a) => 0.0625 * (1 + a / 180));
  const ps = vars.map((v) => 1 / v);
  const m = (ps[0] * Math.log(30) + ps[1] * Math.log(36) + ps[2] * Math.log(50)) / (ps[0] + ps[1] + ps[2]);
  near(Math.log(r.value!), m, LOG, "ln V");
  assert.equal(r.signals[0].n, 3);
});

test("AC5 scope (a): a single exact sale within 90 days goes through thin_blend", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "graded", grade: "PSA 9" },
      signals: [{ kind: "exact", gradeState: "graded", sales: [sale(60, 45)] }],
    }),
  );
  near(r.value, 60, 0.001, "V");
  near(r.sd, Math.sqrt(0.0625 * 1.25), LOG, "sd");
  assert.equal(r.confidence, 3); // sd 0.2795
});

test("AC5 gate ignores exact sales in the wrong grade state", () => {
  const r = thinBlend({
    now: NOW,
    target: { gradeState: "graded", grade: "PSA 8" },
    signals: [
      { kind: "exact", gradeState: "raw", sales: [sale(30, 10), sale(32, 40), sale(34, 89)] },
      { kind: "exact", gradeState: "graded", sales: [sale(55, 20)] },
    ],
  });
  assert.equal(r.applies, true);
});

test("AC6 raw purchase for a graded target is excluded with 'grade state' and does not move V", () => {
  const withRaw = applied(
    thinBlend({ ...caseA, signals: [...caseA.signals, { kind: "purchase", gradeState: "raw", sales: [sale(300, 30)] }] }),
  );
  const base = applied(thinBlend(caseA));
  assert.equal(withRaw.value, base.value);
  assert.ok(withRaw.excluded.some((e) => e.kind === "purchase" && e.reason === "grade state"));
  assert.equal(withRaw.signals.length, 2);
});

test("AC7 scarcer-parallel cap below V caps value and high", () => {
  const r = applied(thinBlend({ ...caseA, higherGradeSales: [], scarcerParallelSales: [sale(70, 20), sale(95, 60)] }));
  near(r.value, 70, 0.001, "V");
  near(r.high, 70, 0.001, "high");
  assert.ok(r.low! <= r.value!);
  assert.ok(r.capsApplied.includes("scarcer_parallel"));
});

test("caps ignore higher-grade and parallel sales older than 180 days", () => {
  const r = applied(thinBlend({ ...caseA, higherGradeSales: [sale(50, 181)], scarcerParallelSales: [sale(50, 400)] }));
  assert.deepEqual(r.capsApplied, []);
});

test("cap below low pulls low down to V", () => {
  const r = applied(thinBlend({ ...caseB, lowestBin: 40 }));
  assert.equal(r.value, 40);
  assert.equal(r.high, 40);
  assert.equal(r.low, 40);
});

test("AC8 confidence thresholds", () => {
  assert.equal(confidenceFromSd(0.15), 5);
  assert.equal(confidenceFromSd(0.1501), 4);
  assert.equal(confidenceFromSd(0.25), 4);
  assert.equal(confidenceFromSd(0.2501), 3);
  assert.equal(confidenceFromSd(0.4), 3);
  assert.equal(confidenceFromSd(0.4001), 2);
  assert.equal(confidenceFromSd(0.6), 2);
  assert.equal(confidenceFromSd(0.6001), 1);
});

test("AC9 no usable signals -> value null with reasons, never throws", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [
        { kind: "exact", gradeState: "raw", sales: [{ price: 0, date: ago(5) }, { price: -3, date: ago(5) }] },
        { kind: "grade_ratio", gradeState: "raw", sales: [sale(50, 10)], ratios: [0.5, 0.6] },
        { kind: "purchase", gradeState: "raw", sales: [sale(80, 800)] },
      ],
    }),
  );
  assert.equal(r.value, null);
  assert.equal(r.low, null);
  assert.equal(r.high, null);
  assert.equal(r.confidence, null);
  assert.ok(r.excluded.some((e) => e.kind === "exact" && /price/.test(e.reason)));
  assert.ok(r.excluded.some((e) => e.kind === "grade_ratio" && /ratios/.test(e.reason)));
  assert.ok(r.excluded.some((e) => e.kind === "purchase" && /730/.test(e.reason)));
  assert.ok(r.excluded.some((e) => /no usable signals/.test(e.reason)));
});

test("AC9 garbage input does not throw", () => {
  for (const bad of [null, undefined, {}, { signals: "x" }, { target: {}, signals: [null, 5, { kind: "nope" }] }]) {
    const r = thinBlend(bad as unknown as ThinBlendInput);
    assert.equal(r.applies, true);
    if (r.applies) assert.equal(r.value, null);
  }
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [{ kind: "exact", gradeState: "raw", sales: [{ price: 50, date: "not a date" }, sale(NaN, 3)] }],
    }),
  );
  assert.equal(r.value, null);
});

test("zero or negative prices are excluded but other sales still count", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [{ kind: "exact", gradeState: "raw", sales: [sale(0, 5), sale(45, 30)] }],
    }),
  );
  near(r.value, 45, 0.001, "V");
  assert.equal(r.signals[0].n, 1);
  assert.ok(r.excluded.some((e) => /price/.test(e.reason)));
});

test("proxy is dropped when an exact or ratio signal exists", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [
        { kind: "exact", gradeState: "raw", sales: [sale(40, 400)] },
        { kind: "proxy", gradeState: "raw", sales: [sale(90, 10)] },
      ],
    }),
  );
  assert.deepEqual(r.signals.map((s) => s.kind), ["exact"]);
  assert.ok(r.excluded.some((e) => e.kind === "proxy"));
});

test("indexFactor scales each sale; indexAssumed false when every used sale has one", () => {
  const r = applied(
    thinBlend({
      now: NOW,
      target: { gradeState: "raw", grade: null },
      signals: [{ kind: "exact", gradeState: "raw", sales: [sale(50, 20, 1.1)] }],
    }),
  );
  near(r.value, 55, 0.001, "V");
  assert.equal(r.indexAssumed, false);
});

test("thinBlendFromJson parses ISO dates and now", () => {
  const json = JSON.parse(JSON.stringify({ ...caseB, now: NOW.toISOString() }));
  const r = applied(thinBlendFromJson(json));
  near(r.value, 89.7, USD, "V");
});
