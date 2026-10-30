import { test } from "node:test";
import assert from "node:assert/strict";
import { initialLines, splits, nudge, centeringGrade, validLines, fmtSplit, linePx, type Borders } from "./borders.ts";

const line = (a: number, b = a) => ({ depth_mm: (a + b) / 2, ends_mm: [a, b] as [number, number], slope: 0, inliers: 1, rms_mm: 0.01, strength: 40 });
const measured: Borders = { status: "ok", px_per_mm: 24, why: [], alternates: {}, inner: { left: line(2.5), right: line(3.5), top: line(3), bottom: line(4) } };

test("splits match the python engine: 58/42 L/R, 57/43 T/B", () => {
  const s = splits(initialLines(measured));
  assert.equal(fmtSplit(s.lr.mid), "58/42");
  assert.equal(fmtSplit(s.tb.mid), "57/43");
  assert.equal(s.lr.wider, "right");
});

test("a tilted border: worst end is worse than mid", () => {
  const s = splits(initialLines({ ...measured, inner: { ...measured.inner, left: line(3, 3.8), right: line(3) } }));
  assert.ok(s.lr.worst > s.lr.mid + 0.02);
});

test("nudging the cut edge in shrinks that border; nudging an inner end tilts it", () => {
  const L = initialLines(measured);
  const n = nudge(L, "left", "outer", 0.5);
  assert.equal(splits(n).lr.widths.left, 2);
  const t = nudge(L, "left", "inner", 0.05, 1);
  assert.deepEqual(t.inner.left, [2.5, 2.55]);
});

test("missing side starts at 3 mm; grades follow the written tolerances", () => {
  assert.deepEqual(initialLines({ ...measured, inner: { ...measured.inner, top: null } }).inner.top, [3, 3]);
  assert.deepEqual(centeringGrade(0.55), { psa: 10, bgs: 9.5 });
  assert.deepEqual(centeringGrade(0.58), { psa: 9, bgs: 8 });
  assert.deepEqual(centeringGrade(0.8, true), { psa: 9, bgs: 8 });
});

test("validLines rejects junk and negative borders", () => {
  assert.ok(validLines(initialLines(measured)));
  assert.ok(!validLines({ outer: { top: 0 }, inner: {} }));
  assert.ok(!validLines(nudge(initialLines(measured), "left", "outer", 3)));
});

test("linePx places the left inner line 2.5 mm in", () => {
  const [x1, , x2] = linePx(initialLines(measured), "left", "inner", 20, 30);
  assert.equal(x1, 80); assert.equal(x2, 80);
});

test("repeatability: spread in points, needs 3 measured shots", async () => {
  const { repeatability } = await import("./borders.ts");
  assert.deepEqual(repeatability({ lr: [0.58, 0.583, 0.575], tb: [0.57, 0.57, 0.571] }), { lr: 0.8, tb: 0.1, measured: 3, ok: true });
  assert.equal(repeatability({ lr: [0.58, 0.6, 0.575], tb: [0.57, 0.57, 0.57] }).ok, false); // 2.5 points
  assert.equal(repeatability({ lr: [0.58, null, 0.58], tb: [0.57, null, 0.57] }).ok, false); // one shot unmeasured
});
