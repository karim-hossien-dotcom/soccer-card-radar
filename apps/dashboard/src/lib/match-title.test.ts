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

test("numbered: serials excluded, season years are not serials", () => {
  const inc = ["2023", "chrome", "yamal", "64", "refractor"], exc = ["numbered", "color match"];
  assert.equal(matchesTarget("LAMINE YAMAL 2023-24 TOPPS CHROME UCC #64 ROOKIE COLOR MATCH REFRACTOR RC 66/99", inc, exc), false);
  assert.equal(matchesTarget("2023-24 Topps Chrome UCC Lamine Yamal #64 Refractor RC /150", inc, ["numbered"]), false);
  assert.equal(matchesTarget("2023-24 Topps Chrome UCC Lamine Yamal #64 Refractor #/99", inc, ["numbered"]), false);
  assert.equal(matchesTarget("2023-24 Topps Chrome UCC Lamine Yamal #64 Refractor RC", inc, ["numbered"]), true);
  assert.equal(matchesTarget("2023/24 Topps Chrome UCC Lamine Yamal #64 Refractor RC", inc, ["numbered"]), true, "2023/24 season is not a serial");
});
