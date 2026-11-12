import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compGuard, serialsIn, authenticGrader, GRADE_LABEL_RE, type CompGuardInput, type GuardSale } from "./comp-guard.ts";

// All cards, prices, titles and sellers below are made up (the repo is public).
const NOW = "2026-11-12T12:00:00Z";
const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.parse(NOW) - d * DAY).toISOString();
const day = (d: number) => ago(d).slice(0, 10);

const sale = (price: number, days: number, title: string, extra: Partial<GuardSale> = {}): GuardSale => ({
  date: ago(days),
  price,
  title,
  source: "ebay_sold",
  url: "https://example.invalid/sale",
  kept: true,
  ...extra,
});

/** A clean base raw card with 3 kept sales, median 20. */
const base = (): CompGuardInput => ({
  now: NOW,
  card: { item: "2019 Fictional Chrome Test Player #7", year: "2019", set: "Fictional Chrome", number: "7", parallel: null, printRun: null, isAuto: false, grader: null, grade: null, status: "raw" },
  proposed: { grade: "raw", price: 20, low: 18, high: 22, sampleSize: 3, source: "ebay_sold", method: "median", confidence: 3 },
  sales: [
    sale(18, 10, "2019 Fictional Chrome Test Player #7"),
    sale(20, 30, "2019 Fictional Chrome Test Player #7 RC"),
    sale(22, 60, "Test Player 2019 Fictional Chrome #7 Rookie"),
  ],
  ledger: [{ date: day(200), amount: 15, kind: "purchase" }],
  ownSellerIds: ["my-own-account"],
});

/** Same card, graded PSA 10 comp. */
const graded = (): CompGuardInput => {
  const g = base();
  g.card = { ...g.card, grader: "PSA", grade: "10", status: "graded" };
  g.proposed = { ...g.proposed, grade: "PSA 10", price: 100 };
  g.sales = [
    sale(90, 10, "2019 Fictional Chrome Test Player #7 PSA 10"),
    sale(100, 20, "2019 Fictional Chrome Test Player #7 PSA 10 GEM MINT"),
    sale(110, 40, "Test Player #7 PSA GEM MT 10 Fictional Chrome"),
  ];
  return g;
};

const codes = (inp: CompGuardInput) => compGuard(inp).errors.map((e) => e.code);
const onlyCode = (inp: CompGuardInput, code: string, saleIdx?: number) => {
  const r = compGuard(inp);
  assert.equal(r.ok, false, `expected ${code}`);
  assert.deepEqual([...new Set(r.errors.map((e) => e.code))], [code], JSON.stringify(r.errors));
  if (saleIdx !== undefined) assert.ok(r.errors.every((e) => e.sale === saleIdx), JSON.stringify(r.errors));
};

test("clean raw and graded proposals pass", () => {
  const r = compGuard(base());
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.errors, []);
  const g = compGuard(graded());
  assert.equal(g.ok, true, JSON.stringify(g.errors));
});

test("grade_label: CGC AUTH, Authentic, Altered and free text are rejected; raw / PSA 10 / BGS 9.5 pass", () => {
  for (const bad of ["CGC AUTH", "Authentic", "PSA Altered", "PSA10", "psa 10", "VGC 9", "Raw", ""]) {
    const inp = base();
    inp.proposed.grade = bad;
    assert.ok(codes(inp).includes("grade_label"), bad);
  }
  for (const ok of ["raw", "PSA 10", "BGS 9.5", "SGC 9", "CGC 8.5"]) assert.ok(GRADE_LABEL_RE.test(ok), ok);
});

test("source_forbidden: workbook_import", () => {
  const inp = base();
  inp.proposed.source = "workbook_import";
  onlyCode(inp, "source_forbidden");
});

test("no_evidence: market source with zero kept sales; estimate / owner_set / ratio_to_base are exempt", () => {
  const inp = base();
  inp.proposed.sampleSize = 0;
  inp.sales = inp.sales.map((s) => ({ ...s, kept: false, rejectReason: "parallel" }));
  onlyCode(inp, "no_evidence");
  for (const source of ["estimate", "owner_set", "ratio_to_base"]) {
    const ok = base();
    ok.proposed = { ...ok.proposed, source, method: source === "estimate" ? "proxy" : "owner", sampleSize: 1, confidence: 1 };
    ok.sales = [];
    assert.deepEqual(codes(ok), [], source);
  }
});

test("n_mismatch: sampleSize differs from kept sales", () => {
  const inp = base();
  inp.proposed.sampleSize = 5;
  onlyCode(inp, "n_mismatch");
});

test("not_median: price is not the median of kept prices (±0.01)", () => {
  const inp = base();
  inp.proposed.price = 20.02;
  onlyCode(inp, "not_median");
  const near = base();
  near.proposed.price = 20.01;
  assert.deepEqual(codes(near), []);
  const even = base();
  even.sales.pop();
  even.proposed = { ...even.proposed, sampleSize: 2, price: 19 }; // median(18, 20)
  assert.deepEqual(codes(even), []);
});

test("sale_age: kept sale over 90 days for a market comp; over 24 months for an estimate", () => {
  const inp = base();
  inp.sales[2] = sale(22, 91, "2019 Fictional Chrome Test Player #7");
  onlyCode(inp, "sale_age", 2);

  const est = base();
  est.proposed = { ...est.proposed, source: "estimate", method: "thin_blend", price: 21, confidence: 1 };
  est.sales = [sale(20, 400, "2019 Fictional Chrome Test Player #7"), sale(22, 731, "2019 Fictional Chrome Test Player #7")];
  onlyCode(est, "sale_age", 1);
  assert.ok(compGuard(est).warnings.some((w) => w.code === "no_market_12m"));
});

test("parallel_word: colour word or serial on a base card", () => {
  const inp = base();
  inp.sales[1] = sale(20, 30, "2019 Fictional Chrome Test Player #7 Purple Refractor");
  onlyCode(inp, "parallel_word", 1);
  const serial = base();
  serial.sales[1] = sale(20, 30, "2019 Fictional Chrome Test Player #7 12/99");
  onlyCode(serial, "parallel_word", 1);
});

test("parallel_word: parallel card keeps its own parallel and print run only", () => {
  const card = () => {
    const inp = base();
    inp.card = { ...inp.card, parallel: "Gold Refractor", printRun: 50 };
    inp.sales = [
      sale(18, 10, "2019 Fictional Chrome Test Player #7 Gold Refractor /50"),
      sale(20, 30, "2019 Fictional Chrome Test Player #7 Gold Refractor 07/50"),
      sale(22, 60, "2019 Fictional Chrome Test Player #7 Gold Ref #/50"),
    ];
    return inp;
  };
  assert.deepEqual(codes(card()), []);
  const rose = card();
  rose.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 Rose Gold Refractor /50");
  onlyCode(rose, "parallel_word", 0);
  const run = card();
  run.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 Gold Refractor /25");
  onlyCode(run, "parallel_word", 0);
});

test("serialsIn ignores four-digit season years, treats 24/25 as a serial (ambiguous)", () => {
  assert.deepEqual(serialsIn("2024/25 Fictional Set Player"), []);
  assert.deepEqual(serialsIn("Fictional Set 24/25 Player"), [25]);
  assert.deepEqual(serialsIn("Player 09/10 Gold"), [10]);
  assert.deepEqual(serialsIn("Player #/99"), [99]);
});

test("auto_mismatch: non-auto card with auto/patch title; auto card without auto word", () => {
  const inp = base();
  inp.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 Auto");
  onlyCode(inp, "auto_mismatch", 0);
  const relic = base();
  relic.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 Patch");
  onlyCode(relic, "auto_mismatch", 0);

  const auto = base();
  auto.card = { ...auto.card, isAuto: true };
  auto.sales = auto.sales.map((s) => ({ ...s, title: `${s.title} Autograph` }));
  assert.deepEqual(codes(auto), []);
  auto.sales[2] = sale(22, 60, "2019 Fictional Chrome Test Player #7");
  onlyCode(auto, "auto_mismatch", 2);
});

test("grade_mismatch: raw comp with a graded sale; PSA 10 comp with PSA 9, BGS, Authentic or no grade", () => {
  const raw = base();
  raw.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 PSA 9");
  onlyCode(raw, "grade_mismatch", 0);

  for (const title of [
    "2019 Fictional Chrome Test Player #7 PSA 9",
    "2019 Fictional Chrome Test Player #7 BGS 10",
    "2019 Fictional Chrome Test Player #7 PSA Authentic",
    "2019 Fictional Chrome Test Player #7",
  ]) {
    const g = graded();
    g.sales[0] = sale(90, 10, title);
    onlyCode(g, "grade_mismatch", 0);
  }
});

test("grade_mismatch: a player name containing a grader's letters is not a grader", () => {
  const raw = base();
  raw.card.item = "2019 Fictional Chrome Isakov #7";
  raw.sales[0] = sale(18, 10, "2019 Fictional Chrome Isakov #7");
  assert.deepEqual(codes(raw), []);
});

test("lot: lot, bundle, x2, set of", () => {
  for (const extra of ["Lot", "Bundle", "x2", "Set of 3"]) {
    const inp = base();
    inp.sales[0] = sale(18, 10, `2019 Fictional Chrome Test Player #7 ${extra}`);
    onlyCode(inp, "lot", 0);
  }
});

test("own_sale: own seller id, or same date and price (±1%) as a ledger purchase", () => {
  const seller = base();
  seller.sales[0] = { ...seller.sales[0], seller: "My-Own-Account" };
  onlyCode(seller, "own_sale", 0);

  const led = base();
  led.ledger = [{ date: day(30), amount: 20.15, kind: "purchase" }];
  onlyCode(led, "own_sale", 1);

  const off = base();
  off.ledger = [{ date: day(30), amount: 21, kind: "purchase" }]; // 5% off
  assert.deepEqual(codes(off), []);
});

test("thin: one sale with no low/high and confidence above 2", () => {
  const inp = base();
  inp.sales = [sale(20, 10, "2019 Fictional Chrome Test Player #7")];
  inp.proposed = { ...inp.proposed, sampleSize: 1, low: null, high: null, confidence: 3 };
  onlyCode(inp, "thin");
  inp.proposed.confidence = 2;
  assert.deepEqual(codes(inp), []);
});

test("rejected sales need a rejectReason; kept sales must not have one", () => {
  const inp = base();
  inp.sales.push(sale(500, 5, "2019 Fictional Chrome Test Player #7 Gold /10", { kept: false }));
  onlyCode(inp, "reject_reason_missing", 3);
  const ok = base();
  ok.sales.push(sale(500, 5, "2019 Fictional Chrome Test Player #7 Gold /10", { kept: false, rejectReason: "parallel" }));
  assert.deepEqual(codes(ok), []); // rejected sales are not re-checked
  const kept = base();
  kept.sales[0] = { ...kept.sales[0], rejectReason: "parallel" };
  onlyCode(kept, "reject_reason_on_kept", 0);
});

test("garbage input returns errors, never throws", () => {
  for (const bad of [null, undefined, {}, { now: NOW }, { now: "x", card: {}, proposed: {}, sales: [] }]) {
    const r = compGuard(bad as unknown as CompGuardInput);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === "input"));
  }
});

// CLI
const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "comp-guard.ts");
const run = (args: string[]) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });
const writeJson = (o: unknown) => {
  const file = join(mkdtempSync(join(tmpdir(), "comp-guard-")), "in.json");
  writeFileSync(file, JSON.stringify(o));
  return file;
};

test("CLI exits 0 when ok, 1 with errors, 2 on usage or bad JSON", () => {
  const ok = run([writeJson(base())]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(JSON.parse(ok.stdout).ok, true);

  const bad = base();
  bad.proposed.grade = "CGC AUTH";
  const r = run([writeJson(bad)]);
  assert.equal(r.status, 1, r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.ok, false);
  assert.equal(out.errors[0].code, "grade_label");

  assert.equal(run([]).status, 2);
  const file = join(mkdtempSync(join(tmpdir(), "comp-guard-")), "bad.json");
  writeFileSync(file, "{nope");
  const parse = run([file]);
  assert.equal(parse.status, 2);
  assert.ok(JSON.parse(parse.stdout).error);
});

// review(PC1): false rejects and false accepts found in review. All titles are made up.
const titled = (title: string, card: Partial<CompGuardInput["card"]> = {}, grade = "raw"): CompGuardInput => {
  const inp = base();
  inp.card = { ...inp.card, ...card };
  inp.proposed = { ...inp.proposed, grade, price: 20, sampleSize: 1, low: 18, high: 22, confidence: 2 };
  inp.sales = [sale(20, 10, title)];
  return inp;
};
const T = "2019 Fictional Chrome Test Player #7";

test("review(PC1) grader labels and club nicknames with colour words are not parallels", () => {
  for (const [title, grade] of [
    [`${T} BGS 10 Black Label`, "BGS 10"],
    [`${T} Beckett Black Label 10`, "BGS 10"],
    [`${T} SGC 10 Gold Label`, "SGC 10"],
    [`${T} BGS Pristine 10`, "BGS 10"],
    [`${T} PSA 10 Gem Mint`, "PSA 10"],
    [`${T} Red Bull Salzburg`, "raw"],
    [`${T} Red Star Belgrade`, "raw"],
    [`${T} Red Devils`, "raw"],
    [`${T} Chelsea Blues`, "raw"],
    [`${T} Ghana Black Stars`, "raw"],
    [`${T} Sunderland Black Cats`, "raw"],
    [`${T} Villarreal Yellow Submarine`, "raw"],
    [`${T} Japan Blue Samurai`, "raw"],
    [`${T} Rose Bowl`, "raw"],
  ]) {
    const inp = titled(title, grade === "raw" ? {} : { grader: grade.split(" ")[0], grade: grade.split(" ")[1], status: "graded" }, grade);
    assert.deepEqual(codes(inp), [], title);
  }
});

test("review(PC1) an insert name with colour words in the card's own item is allowed; other colours are not", () => {
  const card = { item: "2019 Fictional Chrome Black Gold Test Player #BG7", number: "BG7" };
  assert.deepEqual(codes(titled("2019 Fictional Chrome Black Gold Test Player #BG7", card)), []);
  onlyCode(titled("2019 Fictional Chrome Black Gold Test Player #BG7 Red", card), "parallel_word", 0);
});

test("review(PC1) base card rejects every parallel name and spelling", () => {
  for (const w of [
    "Silver", "Purple Mojo", "Tie-Dye", "Tie Dye", "TieDye", "Zebra", "Gold", "Rose Gold Shimmer", "White", "Red Wave",
    "Multi-Color", "Multicolor", "Multi Colour", "Blue Refractor", "Refractors", "X-Fractor", "Lava", "Wave", "Gold Vinyl",
    "Copper", "Lime Green", "Sepia", "Negative Refractor", "Cracked Ice", "Laser", "Logofractor", "Rainbow Foil", "Prizms",
  ]) {
    onlyCode(titled(`${T} ${w}`), "parallel_word", 0);
  }
});

test("review(PC1) parallel card: Gold is not Rose Gold, and Rose Gold Shimmer /299 is not Gold /50", () => {
  onlyCode(titled(`${T} Gold`, { parallel: "Rose Gold Shimmer", printRun: 299 }), "parallel_word", 0);
  onlyCode(titled(`${T} Gold /50`, { parallel: "Rose Gold Shimmer", printRun: 299 }), "parallel_word", 0);
  assert.deepEqual(codes(titled(`${T} Rose Gold Shimmer /299`, { parallel: "Rose Gold Shimmer", printRun: 299 })), []);
  const g = titled(`${T} Rose Gold Shimmer /299`, { parallel: "Gold", printRun: 50 });
  onlyCode(g, "parallel_word", 0);
  assert.equal(compGuard(g).errors.length, 2); // the phrase and the serial
  assert.deepEqual(codes(titled(`${T} Gold Refractors 07/50`, { parallel: "Gold Refractor", printRun: 50 })), []);
  onlyCode(titled(`${T} Gold Wave /50`, { parallel: "Gold", printRun: 50 }), "parallel_word", 0);
  onlyCode(titled(`${T} Blue`, { parallel: "Blue Wave", printRun: null }), "parallel_word", 0);
});

test("review(PC1) parallel card with neither its name nor its print run in the title is kept with a warning", () => {
  const r = compGuard(titled(T, { parallel: "Gold", printRun: 50 }));
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => w.code === "parallel_unconfirmed" && w.sale === 0));
  for (const t of [`${T} Gold`, `${T} 12/50`]) {
    const ok = compGuard(titled(t, { parallel: "Gold", printRun: 50 }));
    assert.ok(!ok.warnings.some((w) => w.code === "parallel_unconfirmed"), t);
  }
  assert.ok(!compGuard(titled(T)).warnings.some((w) => w.code === "parallel_unconfirmed"), "base card");
});

test("review(PC1) serials: 1 of 1, numbered to, any /xx not the print run; seasons are not serials", () => {
  for (const t of [`${T} 1 of 1`, `${T} 07 of 10`, `${T} numbered to 25`, `${T} #'d /99`, `${T} 1/1`, `${T} #24/25`]) {
    onlyCode(titled(t, { year: "2024-25" }), "parallel_word", 0);
  }
  assert.deepEqual(serialsIn("2024/2025 Fictional Set Player"), []);
  assert.deepEqual(serialsIn("Fictional Set Player 1 of 1"), [1]);
  assert.deepEqual(serialsIn("Top Player of 2024"), []);
  assert.deepEqual(codes(titled("2024/2025 Fictional Chrome Test Player #7", { year: "2024-25" })), []);
  // "24/25" is the season when the card is 2024-25 (or Card Ladder's "2025"); for a 2019 card it stays a serial.
  assert.deepEqual(codes(titled("24/25 Fictional Chrome Test Player #7", { year: "2024-25" })), []);
  assert.deepEqual(codes(titled("24/25 Fictional Chrome Test Player #7", { year: "2025" })), []);
  onlyCode(titled("24/25 Fictional Chrome Test Player #7", { year: "2019" }), "parallel_word", 0);
  onlyCode(titled("24/25 Fictional Chrome Test Player #7 05/25", { year: "2024-25" }), "parallel_word", 0);
});

test("review(PC1) auto: non-auto rejects AU/signed/RPA; patch auto and on-card auto are different cards", () => {
  for (const w of ["AU", "Signed", "Signature", "Autographed", "RPA", "Relic", "Jersey"]) onlyCode(titled(`${T} ${w}`), "auto_mismatch", 0);
  const onCard = { isAuto: true, item: "2019 Fictional Chrome Test Player Autograph #A7", number: "A7" };
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player Autograph #A7", onCard)), []);
  onlyCode(titled("2019 Fictional Chrome Test Player #A7 RPA", onCard), "auto_mismatch", 0);
  onlyCode(titled("2019 Fictional Chrome Test Player #A7 Auto Patch", onCard), "auto_mismatch", 0);
  onlyCode(titled("2019 Fictional Chrome Test Player #A7", onCard), "auto_mismatch", 0);
  const patch = { isAuto: true, item: "2019 Fictional Chrome Test Player Auto Patch #AP7", number: "AP7" };
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player Auto Patch #AP7", patch)), []);
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player #AP7 RPA", patch)), []);
  onlyCode(titled("2019 Fictional Chrome Test Player #AP7 On Card Auto", patch), "auto_mismatch", 0);
});

test("review(PC1) grade: CGC AUTH / Authentic / Altered and PSA qualifiers are not the grade", () => {
  const psa9 = { grader: "PSA", grade: "9", status: "graded" };
  for (const t of [`${T} PSA 9 OC`, `${T} PSA 9 (ST)`, `${T} PSA 9 MK`]) onlyCode(titled(t, psa9, "PSA 9"), "grade_mismatch", 0);
  assert.deepEqual(codes(titled(`${T} PSA 9 MINT`, psa9, "PSA 9")), []);
  const cgc = { grader: "CGC", grade: "10", status: "graded" };
  for (const t of [`${T} CGC AUTH`, `${T} CGC Authentic`, `${T} CGC 10 Altered`]) onlyCode(titled(t, cgc, "CGC 10"), "grade_mismatch", 0);
  onlyCode(titled(`${T} CGC Authentic`), "grade_mismatch", 0);
});

test("review(PC1) own_sale: ledger match on the next UTC calendar day; a ledger sale stored negative", () => {
  const next = base();
  next.sales[0] = { ...next.sales[0], date: `${day(9)}T23:30:00Z` };
  next.ledger = [{ date: day(10), amount: 18, kind: "purchase" }];
  onlyCode(next, "own_sale", 0);
  const two = base();
  two.sales[0] = { ...two.sales[0], date: `${day(8)}T00:30:00Z` };
  two.ledger = [{ date: day(10), amount: 18, kind: "purchase" }];
  assert.deepEqual(codes(two), []);
  const sold = base();
  sold.ledger = [{ date: day(10), amount: -18, kind: "sale" }];
  onlyCode(sold, "own_sale", 0);
  const fee = base();
  fee.ledger = [{ date: day(10), amount: 18, kind: "shipping" }];
  assert.deepEqual(codes(fee), []);
});

test("review(PC1) not_median also checks method single", () => {
  const inp = titled(T);
  inp.proposed = { ...inp.proposed, method: "single", price: 25 };
  onlyCode(inp, "not_median");
});

// ---- PC1b: card identity, estimate signals, value_jump, method (made-up cards only) ----

test("PC1b card: number with or without hyphen / #; missing number rejects", () => {
  const r1 = { number: "R-1", item: "2019 Fictional Chrome Test Player Rookie Rush #R-1" };
  for (const t of ["2019 Fictional Chrome Test Player R-1", "2019 Fictional Chrome Test Player R1", "2019 Fictional Chrome Test Player #R1", "2019 Fictional Chrome #R-1 Test Player"]) {
    assert.deepEqual(codes(titled(t, r1)), [], t);
  }
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player #07")), []); // leading zero
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player 7 RC")), []); // bare number
  onlyCode(titled("2019 Fictional Chrome Test Player RC"), "card", 0);
  onlyCode(titled("2019 Fictional Chrome Test Player R-11", r1), "card", 0);
});

test("PC1b card: a different #nnn rejects", () => {
  onlyCode(titled("2019 Fictional Chrome Test Player #103"), "card", 0);
  onlyCode(titled("2019 Fictional Chrome Test Player #7 #103"), "card", 0);
  onlyCode(titled("2019 Fictional Chrome Test Player #R-2 7", { number: "7" }), "card", 0);
});

test("PC1b card: the number is not found inside a grade, serial or print run", () => {
  const ten = { number: "10", item: "2019 Fictional Chrome Test Player #10" };
  onlyCode(titled("2019 Fictional Chrome Test Player PSA 10", { ...ten, grader: "PSA", grade: "10", status: "graded" }, "PSA 10"), "card", 0);
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player #10 PSA 10", { ...ten, grader: "PSA", grade: "10", status: "graded" }, "PSA 10")), []);
  const gold = { ...ten, parallel: "Gold", printRun: 10 };
  onlyCode(titled("2019 Fictional Chrome Test Player Gold 07/10", gold), "card", 0);
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player #10 Gold 07/10", gold)), []);
  // "#/10" and "#'d to 10" are serials, not a card number
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player #10 Gold #/10", gold)), []);
});

test("PC1b card: another season or year rejects; the card's own season forms pass", () => {
  onlyCode(titled("2021 Fictional Chrome Test Player #7"), "card", 0); // review(PC1b): bare 2020 now needs number + set
  onlyCode(titled("2020 Other Set Test Player #7"), "card", 0);
  onlyCode(titled("2017-18 Fictional Chrome Test Player #7"), "card", 0);
  assert.deepEqual(codes(titled("2018-19 Fictional Chrome Test Player #7")), []); // single year 2019 is in the season
  assert.deepEqual(codes(titled("2019-20 Fictional Chrome Test Player #7")), []);
  const season = { year: "2024-25", item: "2024-25 Fictional Chrome Test Player #7" };
  for (const t of ["2024-25 Fictional Chrome Test Player #7", "2024/25 Fictional Chrome Test Player #7", "2024/2025 Fictional Chrome Test Player #7", "24-25 Fictional Chrome Test Player #7", "2025 Fictional Chrome Test Player #7", "Fictional Chrome Test Player #7"]) {
    assert.deepEqual(codes(titled(t, season)), [], t);
  }
  onlyCode(titled("2023-24 Fictional Chrome Test Player #7", season), "card", 0);
  onlyCode(titled("23-24 Fictional Chrome Test Player #7", season), "card", 0);
  onlyCode(titled("2025-26 Fictional Chrome Test Player #7", season), "card", 0);
  // a year in the card's own set name is not another season; no card year = no season check
  const wc = { year: "2021", set: "Fictional Cup 2022", item: "2021 Fictional Cup 2022 Test Player #7" };
  assert.deepEqual(codes(titled("2021 Fictional Cup 2022 Test Player #7", wc)), []);
  assert.deepEqual(codes(titled("2020 Fictional Chrome Test Player #7", { year: null })), []);
});

const estimate = (): CompGuardInput => {
  const e = base();
  e.proposed = { ...e.proposed, source: "estimate", method: "parallel_ratio", sampleSize: 0, low: null, high: null, price: 40, confidence: 1 };
  e.card = { ...e.card, parallel: "Gold", printRun: 50 };
  e.sales = [];
  e.signals = [
    { kind: "parallel_ratio", ratio: 2, sales: [sale(20, 30, "2019 Fictional Chrome Test Player #7"), sale(30, 400, "2018 Fictional Chrome Test Player #12 Gold /50")] },
    { kind: "grade_ratio", ratio: 0.5, grade: "PSA 10", sales: [sale(80, 50, "2019 Fictional Chrome Test Player #7 PSA 10")] },
  ];
  return e;
};

test("PC1b signals: other parallel / number / season / grade pass; only the listed checks run", () => {
  const r = compGuard(estimate());
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("PC1b signals: auto, grade label, lot, own sale and 24-month age are checked, with signal + sale index", () => {
  const auto = estimate();
  auto.signals![0].sales[1] = sale(30, 400, "2018 Fictional Chrome Test Player Gold /50 Auto");
  onlyCode(auto, "auto_mismatch", 1);
  assert.equal(compGuard(auto).errors[0].signal, 0);

  const label = estimate();
  label.signals![1].sales[0] = sale(80, 50, "2019 Fictional Chrome Test Player #7 PSA 9 OC");
  onlyCode(label, "grade_label", 0);
  const authentic = estimate();
  authentic.signals![1].sales[0] = sale(80, 50, "2019 Fictional Chrome Test Player #7 CGC Authentic");
  onlyCode(authentic, "grade_label", 0);
  const badGrade = estimate();
  badGrade.signals![1].grade = "CGC AUTH";
  onlyCode(badGrade, "grade_label");

  const lot = estimate();
  lot.signals![0].sales[0] = sale(20, 30, "Lot of 3 2019 Fictional Chrome Test Player");
  onlyCode(lot, "lot", 0);

  const own = estimate();
  own.signals![0].sales[0] = { ...own.signals![0].sales[0], seller: "my-own-account" };
  onlyCode(own, "own_sale", 0);
  const ledger = estimate();
  ledger.ledger = [{ date: day(50), amount: 80, kind: "purchase" }];
  onlyCode(ledger, "own_sale", 0);
  assert.equal(compGuard(ledger).errors[0].signal, 1);

  const old = estimate();
  old.signals![0].sales[1] = sale(30, 731, "2018 Fictional Chrome Test Player #12 Gold /50");
  onlyCode(old, "sale_age", 1);
});

test("PC1b signals: reject bookkeeping, purchase kind, bad ratio, market comp with signals", () => {
  const rej = estimate();
  rej.signals![0].sales[1] = { ...rej.signals![0].sales[1], kept: false };
  onlyCode(rej, "reject_reason_missing", 1);
  const dropped = estimate();
  dropped.signals![0].sales[1] = { ...sale(30, 400, "2018 Fictional Chrome Lot x3"), kept: false, rejectReason: "lot" };
  assert.deepEqual(codes(dropped), []);
  const purchase = estimate();
  purchase.signals!.push({ kind: "purchase", sales: [] });
  onlyCode(purchase, "input");
  const ratio = estimate();
  ratio.signals![0].ratio = 0;
  onlyCode(ratio, "input");
  const market = base();
  market.signals = [{ kind: "proxy", sales: [] }];
  onlyCode(market, "input");
  // exact-card sales of an estimate still get the full check
  const exact = estimate();
  exact.sales = [sale(40, 100, "2019 Fictional Chrome Test Player #12 Gold /50")];
  onlyCode(exact, "card", 0);
});

test("PC1b value_jump: >50% from the previous comp of the same grade needs a reason", () => {
  const up = base();
  up.previous = { grade: "raw", price: 13 }; // 20 is +54%
  onlyCode(up, "value_jump");
  up.reason = "new parallel identified on the cert page";
  assert.deepEqual(codes(up), []);
  const down = base();
  down.previous = { grade: "raw", price: 41 }; // 20 is -51%
  onlyCode(down, "value_jump");
  const edge = base();
  edge.previous = { grade: "raw", price: 40 }; // exactly -50%: allowed
  assert.deepEqual(codes(edge), []);
  const blank = base();
  blank.previous = { grade: "raw", price: 100 };
  blank.reason = "   ";
  onlyCode(blank, "value_jump");
  const otherGrade = base();
  otherGrade.previous = { grade: "PSA 10", price: 100 };
  assert.deepEqual(codes(otherGrade), []);
});

test("PC1b method_forbidden: mean / average never; market comps median or single only", () => {
  for (const m of ["mean", "Average", "avg"]) {
    const inp = base();
    inp.proposed.method = m;
    onlyCode(inp, "method_forbidden");
  }
  const est = base();
  est.proposed = { ...est.proposed, source: "estimate", method: "mean", confidence: 1 };
  onlyCode(est, "method_forbidden");
  const other = base();
  other.proposed.method = "thin_blend";
  onlyCode(other, "method_forbidden");
  const owner = base();
  owner.proposed = { ...owner.proposed, source: "owner_set", method: "owner", sampleSize: 0 };
  owner.sales = [];
  assert.deepEqual(codes(owner), []);
});

// ---- review(PC1b): false rejects / accepts found in review (made-up cards only) ----

test("review(PC1b) one-year card: the other year of its season alone passes only with card number and set", () => {
  assert.deepEqual(codes(titled("2020 Fictional Chrome Test Player #7")), []);
  assert.deepEqual(codes(titled("2018 Fictional Chrome Test Player #7")), []);
  assert.deepEqual(codes(titled("2024 Fictional Chrome Test Player #7", { year: "2025" })), []);
  onlyCode(titled("2020 Other Set Test Player #7"), "card", 0); // set missing
  onlyCode(titled("2020 Chrome Test Player #7"), "card", 0); // only part of the set
  onlyCode(titled("2020 Fictional Chrome Test Player #7", { set: null }), "card", 0); // no set to check
  onlyCode(titled("2020 Fictional Chrome Test Player #7", { number: null }), "card", 0); // no number to check
  onlyCode(titled("2020 Fictional Chrome Test Player #7 #12"), "card", 0); // another number
  const noNum = compGuard(titled("2020 Fictional Chrome Test Player"));
  assert.equal(noNum.errors.length, 2, JSON.stringify(noNum.errors)); // number missing and the year is not excused
  onlyCode(titled("2017 Fictional Chrome Test Player #7"), "card", 0); // not adjacent
  onlyCode(titled("2021 Fictional Chrome Test Player #7"), "card", 0);
  onlyCode(titled("2023 Fictional Chrome Test Player #7", { year: "2024-25" }), "card", 0); // season cards unchanged
});

test("review(PC1b) 24/25 is a season only when it is the card's season; 24-25 is not card #24 / #25", () => {
  assert.deepEqual(codes(titled("24/25 Fictional Chrome Test Player #7", { year: "2024-25" })), []);
  onlyCode(titled("23/24 Fictional Chrome Test Player #7", { year: "2024-25" }), "parallel_word", 0);
  onlyCode(titled("25/26 Fictional Chrome Test Player #7", { year: "2024-25" }), "parallel_word", 0);
  for (const n of ["24", "25"]) {
    onlyCode(titled("24-25 Fictional Chrome Test Player", { year: "2024-25", number: n }), "card", 0);
    assert.deepEqual(codes(titled(`24-25 Fictional Chrome Test Player #${n}`, { year: "2024-25", number: n })), []);
  }
});

test("review(PC1b) a print run written after the number with a space keeps the number", () => {
  const gold = { parallel: "Gold", printRun: 25 };
  assert.deepEqual(codes(titled(`${T} /25`, gold)), []);
  assert.deepEqual(codes(titled("2019 Fictional Chrome Test Player 7 /25", gold)), []);
  onlyCode(titled("2019 Fictional Chrome Test Player Gold 07/25", { ...gold, number: "25" }), "card", 0);
});

/** PC1c: the made-up base card as a CGC Authentic slab, valued on the raw key. */
const authSlab = (grade = "AUTH", grader: string | null = "CGC"): CompGuardInput => {
  const a = base();
  a.card = { ...a.card, grader, grade, status: "graded" };
  return a;
};

test("PC1c authenticGrader: AUTH / Authentic (any case, grader from card.grader or the grade text); numbers and Altered are not", () => {
  assert.equal(authenticGrader({ grader: "CGC", grade: "AUTH" }), "CGC");
  assert.equal(authenticGrader({ grader: "cgc", grade: "Authentic" }), "CGC");
  assert.equal(authenticGrader({ grader: null, grade: "PSA Authentic" }), "PSA");
  assert.equal(authenticGrader({ grader: "Beckett", grade: "auth" }), "BGS");
  assert.equal(authenticGrader({ grader: "CGC", grade: "10" }), null);
  assert.equal(authenticGrader({ grader: "CGC", grade: "Altered" }), null);
  assert.equal(authenticGrader({ grader: null, grade: "AUTH" }), null);
  assert.equal(authenticGrader({ grader: null, grade: null }), null);
});

test("PC1c grade_mismatch: an Authentic card's raw comp keeps same-grader Authentic sales and raw sales", () => {
  for (const [grade, grader] of [["AUTH", "CGC"], ["Authentic", "CGC"], ["CGC AUTH", null]] as const) {
    const a = authSlab(grade, grader);
    a.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 CGC Authentic");
    a.sales[1] = sale(20, 30, "2019 Fictional Chrome Test Player #7 CGC AUTH");
    const r = compGuard(a);
    assert.equal(r.ok, true, `${grader} ${grade}: ${JSON.stringify(r.errors)}`);
  }
});

test("PC1c grade_mismatch: an Authentic card still rejects number grades, another grader and Altered", () => {
  for (const title of [
    "2019 Fictional Chrome Test Player #7 CGC 9.5",
    "2019 Fictional Chrome Test Player #7 CGC Authentic 10",
    "2019 Fictional Chrome Test Player #7 CGC Auth DNA 9.5",
    "2019 Fictional Chrome Test Player #7 CGC Authentic PSA 9",
    "2019 Fictional Chrome Test Player #7 PSA Authentic",
    "2019 Fictional Chrome Test Player #7 CGC Altered",
    "2019 Fictional Chrome Test Player #7 CGC Authentic Altered",
    "2019 Fictional Chrome Test Player #7 CGC",
  ]) {
    const a = authSlab();
    a.sales[0] = sale(18, 10, title);
    onlyCode(a, "grade_mismatch", 0);
  }
});

test("PC1c: a raw card (not Authentic) still rejects an Authentic slab sale", () => {
  const raw = base();
  raw.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 CGC Authentic");
  onlyCode(raw, "grade_mismatch", 0);
  const altered = authSlab("Altered");
  altered.sales[0] = sale(18, 10, "2019 Fictional Chrome Test Player #7 CGC Authentic");
  onlyCode(altered, "grade_mismatch", 0);
});
