import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGrade, compTemplate, parseCompPaste, refOf } from "./comp-paste.ts";
import { popFromSpec, specFromCert, frontImage, refreshPsa, type PsaFetch } from "./psa.ts";

const A = "6f1c2a9e-1111-5000-8000-000000000001";
const B = "7a2b3c4d-2222-5000-8000-000000000002";
const cards = [
  { id: A, cert: "12345678", item: "2018 Prizm WC Salah #1", player: "Salah", grade: "PSA 9", extraGrades: [] },
  { id: B, cert: null, item: "2014 Prizm WC Ronaldo #161", player: "Ronaldo", grade: "raw", extraGrades: ["PSA 10", "PSA 9"] },
];

test("normalizeGrade", () => {
  assert.equal(normalizeGrade("psa10"), "PSA 10");
  assert.equal(normalizeGrade("10"), "PSA 10");
  assert.equal(normalizeGrade("BGS 9.5"), "BGS 9.5");
  assert.equal(normalizeGrade("Raw"), "raw");
  assert.equal(normalizeGrade("psa 11"), null);
  assert.equal(normalizeGrade("mint"), null);
});

test("template -> filled paste round-trips", () => {
  const t = compTemplate(cards, (id, g) => (id === B && g === "raw" ? { price: 40, asOf: "2026-10-01" } : null));
  const lines = t.split("\n");
  assert.equal(lines.length, 1 + 1 + 3);
  assert.deepEqual(lines[2].split("\t"), [refOf(B), "Ronaldo — 2014 Prizm WC Ronaldo #161", "raw", "40.00", "2026-10-01", "", ""]);
  const filled = lines.map((l, i) => (i === 2 ? l.replace(/\t\t$/, "\t$1,050.50\t3") : i === 1 ? l.replace(/\t\t$/, "\t310\t") : l)).join("\n");
  const r = parseCompPaste(filled, cards, "2026-10-15");
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.rows.map(({ line, ...x }) => x), [
    { cardId: A, grade: "PSA 9", price: 310, sampleSize: 1, asOf: "2026-10-15" },
    { cardId: B, grade: "raw", price: 1050.5, sampleSize: 3, asOf: "2026-10-15" },
  ]);
});

test("headerless lines: cert ref, as-of, errors, duplicates", () => {
  const r = parseCompPaste(
    ["12345678,psa9,300,2,2026-10-10", `${refOf(B)},10,900`, "zzzzzzzz,raw,5", `${refOf(B)},mint,5`, `${refOf(B)},raw,-1`, `${refOf(B)},raw,5,1,2027-01-01`, `${refOf(B)},PSA 10,950`].join("\n"),
    cards,
    "2026-10-15",
  );
  assert.deepEqual(r.rows.map((x) => [x.cardId, x.grade, x.price, x.sampleSize, x.asOf]), [
    [A, "PSA 9", 300, 2, "2026-10-10"],
    [B, "PSA 10", 900, 1, "2026-10-15"],
  ]);
  assert.deepEqual(r.errors.map((e) => [e.line, e.reason]), [
    [3, "no card matches ref"], [4, "unknown grade"], [5, "bad price"], [6, "bad date (YYYY-MM-DD, not in future)"], [7, "duplicate of line 2"],
  ]);
});

test("PSA parsers", () => {
  assert.deepEqual(popFromSpec({ SpecID: 1, PSAPop: { Total: 210, Auth: 10, Grade10: 50, Grade9: 90 } }), { total: 210, gem10: 50, pop9: 90, gemRate: 0.25 });
  assert.equal(popFromSpec({}), null);
  assert.equal(specFromCert({ PSACert: { SpecID: 4242 } }), 4242);
  assert.equal(specFromCert({ PSACert: {} }), null);
  assert.equal(frontImage([{ IsFrontImage: false, ImageURL: "https://x/b.jpg" }, { IsFrontImage: true, ImageURL: "https://x/f.jpg" }]), "https://x/f.jpg");
  assert.equal(frontImage([{ ImageURL: "javascript:alert(1)" }]), null);
  assert.equal(frontImage(null), null);
});

const fake = (routes: Record<string, { status: number; body: unknown }>, log: string[]): PsaFetch => async (p) => {
  log.push(p);
  return routes[p] ?? { status: 404, body: null };
};

test("refreshPsa: spec cache, images, budget, errors", async () => {
  const log: string[] = [];
  const f = fake({
    "/cert/GetByCertNumber/1": { status: 200, body: { PSACert: { SpecID: 7 } } },
    "/pop/GetPSASpecPopulation/7": { status: 200, body: { PSAPop: { Total: 100, Grade10: 20, Grade9: 40 } } },
    "/cert/GetImagesByCertNumber/1": { status: 200, body: [{ IsFrontImage: true, ImageURL: "https://img/1.jpg" }] },
  }, log);
  const r = await refreshPsa(
    [
      { cardId: "a", cert: "1", specId: null, needsImage: true },
      { cardId: "b", cert: "2", specId: 7, needsImage: false }, // shares spec 7: cached, 0 calls
      { cardId: "c", cert: "3", specId: null, needsImage: false }, // cert 404 -> error, continue
      { cardId: "d", cert: "4", specId: 9, needsImage: true }, // needs 2 calls, 1 left: over budget
    ],
    f,
    5,
  );
  assert.equal(r.calls, 4);
  assert.deepEqual(r.specIds, [{ cardId: "a", specId: 7 }]);
  assert.deepEqual(r.pops.map((p) => [p.cardId, p.gemRate]), [["a", 0.2], ["b", 0.2]]);
  assert.deepEqual(r.images, [{ cardId: "a", url: "https://img/1.jpg" }]);
  assert.deepEqual(r.errors.map((e) => e.cardId), ["c"]);
  assert.equal(r.stopped, "call budget used");
  assert.equal(r.pending, 1);
});

test("refreshPsa stops on 429 and bad token", async () => {
  const r = await refreshPsa([{ cardId: "a", cert: "1", specId: 3, needsImage: false }], async () => ({ status: 429, body: null }), 90);
  assert.equal(r.stopped, "PSA daily limit reached");
  assert.equal(r.pending, 1);
  const r2 = await refreshPsa([{ cardId: "a", cert: "1", specId: 3, needsImage: false }], async () => ({ status: 401, body: null }), 90);
  assert.match(r2.stopped!, /token/);
});
