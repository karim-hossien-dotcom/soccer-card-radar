import { test } from "node:test";
import assert from "node:assert/strict";
import { shape, judge, moved, pixels, CARD_RATIO, type Quad } from "./scan-checks.ts";

const W = 1000, H = 1400;
const rect = (x: number, y: number, w: number, h: number): Quad => ({
  topLeft: { x, y }, topRight: { x: x + w, y }, bottomRight: { x: x + w, y: y + h }, bottomLeft: { x, y: y + h },
});
const card = (scale: number) => { const w = 900 * scale, h = w / CARD_RATIO; return rect((W - w) / 2, (H - h) / 2, w, h); };

test("a straight card filling most of the frame passes", () => {
  const s = shape(card(0.95), W, H);
  assert.ok(s.ratioErr < 0.01 && s.angleDev < 0.5 && s.inside);
  assert.deepEqual(judge(card(0.95), s, { glare: 0, sharp: 200 }), { ok: true, hint: "Hold still…" });
});

test("hints in fix order: closer, edges, tilt, glare, blur", () => {
  const small = card(0.5);
  assert.equal(judge(small, shape(small, W, H), null).hint, "Move closer");
  const big = rect(-5, 10, 1010, 1380);
  assert.match(judge(big, shape(big, W, H), null).hint, /Move back/);
  const keystone: Quad = { topLeft: { x: 150, y: 120 }, topRight: { x: 850, y: 120 }, bottomRight: { x: 950, y: 1300 }, bottomLeft: { x: 50, y: 1300 } };
  assert.match(judge(keystone, shape(keystone, W, H), null).hint, /flat/);
  const c = card(0.95), s = shape(c, W, H);
  assert.match(judge(c, s, { glare: 0.05, sharp: 200 }).hint, /Glare/);
  assert.match(judge(c, s, { glare: 0, sharp: 10 }).hint, /blurry/);
  assert.match(judge(null, null, null).hint, /dark, plain/);
});

test("movement is relative to the frame", () => {
  const a = card(0.9), b = rect(a.topLeft.x + 7, a.topLeft.y, a.topRight.x - a.topLeft.x, a.bottomLeft.y - a.topLeft.y);
  assert.ok(Math.abs(moved(a, b, W, H) - 0.007) < 1e-9);
});

test("pixels: flat gray is blurry and glare-free; noise is sharp; white is glare", () => {
  const w = 40, h = 40, q = rect(2, 2, 36, 36);
  const flat = new Uint8Array(w * h).fill(100);
  assert.deepEqual(pixels(flat, w, h, q), { glare: 0, sharp: 0 });
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) % 200) + 20;
  const noise = Uint8Array.from({ length: w * h }, rnd);
  assert.ok(pixels(noise, w, h, q).sharp > 1000);
  assert.equal(pixels(new Uint8Array(w * h).fill(255), w, h, q).glare, 1);
  // foil: 1 in 5 pixels blown, scattered -> not glare
  const W2 = 200, Q2 = rect(2, 2, 196, 196);
  const foil = Uint8Array.from({ length: W2 * W2 }, (_, i) => (i % 7 === 0 ? 255 : 90));
  assert.equal(pixels(foil, W2, W2, Q2).glare, 0);
  // a blown patch over the top-left quarter -> about a quarter of the cells
  const patch = Uint8Array.from({ length: W2 * W2 }, (_, i) => ((i % W2) < 100 && Math.floor(i / W2) < 100 ? 255 : 90));
  assert.ok(Math.abs(pixels(patch, W2, W2, Q2).glare - 0.25) < 0.05);
});
