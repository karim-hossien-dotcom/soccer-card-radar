import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGrading, snipeHref, prefillFromComps, findTarget, type GCard, type Submission } from "./grading.ts";

const card = (o: Partial<GCard>): GCard => ({
  id: o.id ?? "x", status: "raw", item: "item", player: "P", gradeLabel: "Raw", submissionId: null, cost: null, valueNow: null,
  psa10: null, psa9: null, net10: null, net9: null, decision: null, estimated: false, ...o,
});
const sub = (o: Partial<Submission>): Submission => ({ id: "s", subNumber: null, grader: "PSA", serviceLevel: null, feePerCard: null, status: null, arrivedOn: null, estComplete: null, ...o });

test("buildGrading: open subs carry their at-PSA cards and totals; completed subs with nothing left drop out", () => {
  const g = buildGrading(
    [
      card({ id: "a", status: "at_grader", submissionId: "1", cost: 30, psa9: 50, psa10: 120 }),
      card({ id: "b", status: "at_grader", submissionId: "1", cost: 20.5, psa9: null, psa10: null }),
      card({ id: "c", status: "graded", submissionId: "2", gradeLabel: "PSA 10", cost: 100, valueNow: 300 }),
      card({ id: "d", status: "raw", submissionId: "2", cost: 258.33, valueNow: 228 }),
    ],
    [sub({ id: "1", status: "Grading", arrivedOn: "2026-06-03" }), sub({ id: "2", status: "Completed" }), sub({ id: "3", status: "Completing" })],
  );
  assert.deepEqual(g.open.map((s) => s.id), ["1", "3"]);
  assert.equal(g.open[0].cards.length, 2);
  assert.equal(g.open[0].cost, 50.5);
  assert.equal(g.open[0].if9, 50);
  assert.equal(g.open[0].priced, 1);
  assert.deepEqual(g.back.map((c) => [c.id, c.cracked, c.gain]), [["c", false, 200], ["d", true, -30.33]]);
  assert.deepEqual(g.backTotals.grades, [["PSA 10", 1], ["Cracked", 1]]);
  assert.equal(g.backTotals.gain, 169.67);
});

test("buildGrading: candidates are raw, not yet submitted, engine says grade; best PSA 9 net first", () => {
  const g = buildGrading(
    [
      card({ id: "k", decision: "Keep raw", net9: 99 }),
      card({ id: "g1", decision: "Grade only if likely PSA 10", net9: -10 }),
      card({ id: "g2", decision: "Grade: beats raw even at PSA 9", net9: 40 }),
      card({ id: "s", decision: "Grade: beats raw even at PSA 9", net9: 80, submissionId: "2" }),
    ],
    [],
  );
  assert.deepEqual(g.candidates.map((c) => c.id), ["g2", "g1"]);
});

test("prefillFromComps + snipeHref: latest real comp per grade, oldest date, PSA cert only", () => {
  const p = prefillFromComps("2019 Chrome #33 Vinicius Blue", "Vinicius Jr", "71600501", "PSA", [
    { grade: "raw", price: 40, method: "median", asOf: "2026-10-01" },
    { grade: "raw", price: 55, method: "median", asOf: "2026-10-20" },
    { grade: "PSA 9", price: 90, method: "value_used", asOf: "2026-10-25" },
    { grade: "PSA 9", price: 80, method: "median", asOf: "2026-10-10" },
  ]);
  assert.deepEqual(p, { card: "2019 Chrome #33 Vinicius Blue", player: "Vinicius Jr", raw: 55, psa9: 80, psa10: undefined, asOf: "2026-10-10", cert: "71600501" });
  const u = new URL(snipeHref(p), "http://x");
  assert.equal(u.pathname, "/snipe");
  assert.equal(u.searchParams.get("add"), p.card);
  assert.equal(u.searchParams.get("psa10"), null);
  assert.equal(prefillFromComps("c", "p", "123", "SGC", []).cert, undefined);
});

test("findTarget: by PSA cert or same card text", () => {
  const ts = [{ id: "1", card: "2018 Prizm WC #1 Ronaldo  Silver", psaCert: null }, { id: "2", card: "Other", psaCert: "555" }];
  assert.equal(findTarget(ts, "2018 prizm wc #1 ronaldo silver")?.id, "1");
  assert.equal(findTarget(ts, "nope", "555")?.id, "2");
  assert.equal(findTarget(ts, "nope"), null);
});
