import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReport, ceilingLine, centeringRows, wearFindings, surfaceLines, checkFile, downscaleSize } from "./condition-report.ts";

const edge = (side: string, specks: number | null) => ({ side, judged_mm: 70, specks, specks_per_10cm: null, roughness_mm: null, waviness_mm: null, notches: null, note: specks === null ? "border too light to see whitening or chipping" : null });
const corner = (corner: string, whitening_pct: number | null) => ({ corner, rounding_mm: null, whitening_pct, note: null, rounding_vs_others_mm: null });
const side = (specks = 0, wh = 0) => ({ file: null, px_per_mm: 16, lr_offset_mm: 0, lr_symmetry: 0.9, surface: {},
  edges: [edge("top", 0), edge("bottom", null), edge("left", specks), edge("right", 0)],
  corners: [corner("top-left", wh), corner("top-right", 0), corner("bottom-left", null), corner("bottom-right", 0)] });
const raw = (o: Record<string, unknown> = {}) => ({
  front: side(8), back: side(), holder: false, note: "provisional",
  centering: { front_lr: "51/49", back_lr: "58/42" },
  centering_grades: {
    front_lr: { split: "51/49", psa: 10, psa_tolerance: "55/45", bgs: 10, bgs_tolerance: "52/48" },
    back_lr: { split: "58/42", psa: 10, psa_tolerance: "75/25", bgs: 10, bgs_tolerance: "60/40" },
  },
  ceiling: { psa: 8, bgs: 8.5, tag: 8, why: ["front edges: chipping specks along 1 side(s), 8 total -> PSA 8, BGS 8.5, TAG 8"], look: [] },
  cant_judge: [{ point: "top/bottom centering", graders: "PSA, BGS, TAG", why: "not symmetric" }],
  ...o,
});

test("parseReport: accepts the API shape, surfaces API errors, rejects junk", () => {
  const r = parseReport(raw());
  assert.equal(r.front?.edges.length, 4);
  assert.equal(r.ceiling.bgs, 8.5);
  assert.throws(() => parseReport({ error: "Wrong admin token" }), /Wrong admin token/);
  assert.throws(() => parseReport(null), /Empty/);
  assert.throws(() => parseReport({ ceiling: {} }), /unexpected/);
});

test("ceilingLine: capped, clean, and no-ceiling cases", () => {
  assert.deepEqual(ceilingLine(parseReport(raw())), { capped: true, headline: "At best PSA 8 · BGS 8.5 · TAG 8", reasons: raw().ceiling.why });
  const clean = ceilingLine(parseReport(raw({ ceiling: { psa: 10, bgs: 10, tag: 10, why: [], look: [] } })));
  assert.equal(clean.capped, false);
  assert.match(clean.headline, /not ruled out/);
  const none = ceilingLine(parseReport(raw({ ceiling: { psa: null, bgs: null, tag: null, why: ["in a holder: only centering checked, no condition ceiling"], look: [] } })));
  assert.equal(none.headline, "No ceiling from this photo");
  assert.deepEqual(none.reasons, ["in a holder: only centering checked, no condition ceiling"]);
});

test("centeringRows: tolerance met per side, unmeasured back, below the lowest band", () => {
  assert.deepEqual(centeringRows(parseReport(raw())), [
    { side: "Front", split: "51/49", psa: "PSA 10 (within 55/45)", bgs: "BGS 10 (within 52/48)" },
    { side: "Back", split: "58/42", psa: "PSA 10 (within 75/25)", bgs: "BGS 10 (within 60/40)" },
  ]);
  const rows = centeringRows(parseReport(raw({ centering: { front_lr: "72/28" }, centering_grades: { front_lr: { split: "72/28", psa: 6, psa_tolerance: null, bgs: 7, bgs_tolerance: null } } })));
  assert.deepEqual(rows[0], { side: "Front", split: "72/28", psa: "below PSA 7 tolerances", bgs: "below BGS 8 tolerances" });
  assert.deepEqual(rows[1], { side: "Back", split: "—", psa: "not measured", bgs: "not measured" });
});

test("wearFindings: chips, unjudged edges, whitening, holder", () => {
  const w = wearFindings(parseReport(raw({ front: side(8, 12.5), back: null })));
  assert.equal(w.length, 1);
  assert.ok(w[0].lines.includes("left edge: 8 chipping specks"));
  assert.ok(w[0].lines.includes("top edge: no chipping specks"));
  assert.ok(w[0].lines.some((l) => l.startsWith("bottom edge: not judged")));
  assert.ok(w[0].lines.includes("top-left corner: whitening (12.5% of the corner)"));
  assert.ok(w[0].lines.includes("bottom-left corner: whitening not judged"));
  const h = wearFindings(parseReport(raw({ holder: true, front: { ...side(), edges: [], corners: [] }, back: null })));
  assert.deepEqual(h, [{ side: "Front", lines: ["Edges and corners not judged"] }]);
});

test("checkFile and downscaleSize: 8 MB, jpg/png/webp, re-encode only large photos", () => {
  assert.equal(checkFile({ size: 1000, type: "image/jpeg" }, "Front"), null);
  assert.equal(checkFile({ size: 1000, type: "image/gif" }, "Front"), "Front photo must be a jpg, png or webp");
  assert.equal(checkFile({ size: 8 * 1024 * 1024 + 1, type: "image/png" }, "Back"), "Back photo is over 8 MB");
  assert.equal(downscaleSize(4000, 3000, 1_000_000), null);
  assert.deepEqual(downscaleSize(4000, 3000, 6_000_000), { w: 3000, h: 2250 });
  assert.deepEqual(downscaleSize(2000, 1500, 6_000_000), { w: 2000, h: 1500 });
});

test("surfaceLines: measured findings are numbered like the overlay; Claude-only ones are not", () => {
  const lines = surfaceLines({ side: "Front", status: "measured", why: null, ai: true, overlay: null, findings: [
    { kind: "dent or dimple", where: "top right", source: "both", size_mm: 6.4 },
    { kind: "scratch", where: "centre", source: "claude", note: "fine line" },
    { kind: "crease", where: "middle left", source: "measured", size_mm: 24 },
  ] });
  assert.deepEqual(lines.map((l) => l.n), [1, null, 2]);
  assert.equal(lines[0].text, "Dent or dimple, top right, about 6 mm: measured and seen by Claude");
  assert.equal(lines[1].text, "Scratch, centre (fine line): seen by Claude only");
});
