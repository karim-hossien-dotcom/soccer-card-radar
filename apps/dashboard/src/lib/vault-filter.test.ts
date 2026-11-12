import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesShow, sportCount, toSport, type FilterCard, type ShowFilter } from "./vault-filter.ts";

// Synthetic cards only.
const c = (id: string, o: Partial<FilterCard>) => ({ id, status: "raw", stale: false, sport: "soccer" as const, ...o });
const CARDS = [
  c("s-raw", {}),
  c("s-graded", { status: "graded" }),
  c("s-at", { status: "at_grader", stale: true }),
  c("b-raw", { sport: "basketball" }),
  c("b-graded", { sport: "basketball", status: "graded", stale: true }),
];
const ids = (show: ShowFilter) => CARDS.filter((x) => matchesShow(x, show)).map((x) => x.id);

test("Basketball shows only sport='basketball'", () => {
  assert.deepEqual(ids("basketball"), ["b-raw", "b-graded"]);
  assert.equal(sportCount(CARDS, "basketball"), 2);
  assert.equal(sportCount(CARDS.filter((x) => x.sport === "soccer"), "basketball"), 0, "no basketball cards -> option hidden (count 0)");
});

test("every other option keeps all sports", () => {
  assert.deepEqual(ids("all"), CARDS.map((x) => x.id));
  assert.deepEqual(ids("raw"), ["s-raw", "b-raw"]);
  assert.deepEqual(ids("graded"), ["s-graded", "b-graded"]);
  assert.deepEqual(ids("at_grader"), ["s-at"]);
  assert.deepEqual(ids("stale"), ["s-at", "b-graded"]);
});

test("sport defaults to soccer", () => {
  assert.equal(toSport(undefined), "soccer");
  assert.equal(toSport(null), "soccer");
  assert.equal(toSport("soccer"), "soccer");
  assert.equal(toSport("basketball"), "basketball");
  assert.equal(toSport("hockey"), "soccer");
});
