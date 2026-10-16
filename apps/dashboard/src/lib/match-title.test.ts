import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesTarget } from "./match-title.ts";

const base = { must: ["2014", "prizm", "ronaldo", "161"], ex: ["silver", "psa", "lot", "stars", "red"] };

test("matches the right card, rejects parallels, graded and wrong numbers", () => {
  assert.ok(matchesTarget("2014 Panini Prizm World Cup #161 Cristiano Ronaldo Portugal", base.must, base.ex));
  assert.equal(matchesTarget("2014 Panini Prizm World Cup #161 Cristiano Ronaldo SILVER", base.must, base.ex), false);
  assert.equal(matchesTarget("2014 Prizm World Cup Ronaldo #161 PSA 9", base.must, base.ex), false);
  assert.equal(matchesTarget("2014 Prizm World Cup Ronaldo #1610", base.must, base.ex), false, "whole numbers only");
  assert.equal(matchesTarget("2014 Prizm World Cup Stars Ronaldo #161", base.must, base.ex), false);
  assert.ok(matchesTarget("2014 Prizm Ronaldo 161 Real Madrid", base.must, base.ex), "red does not match inside Madrid");
});

test("accents and alternatives", () => {
  assert.ok(matchesTarget("2018 Panini Prizm World Cup Kylian Mbappé #80 RC", ["2018", "prizm", "mbappe", "80"], []));
  assert.ok(matchesTarget("Yamal UCC 64 Topps Chrome 2023-24", ["2023|2023-24", "chrome", "yamal", "64"], []));
});
