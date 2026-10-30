/** G5 live scan: pure checks on each preview frame. The browser finds the card's corners (scanic);
 * these decide whether the shot is good enough to auto-capture and what hint to show. */

export type Pt = { x: number; y: number };
export type Quad = { topLeft: Pt; topRight: Pt; bottomRight: Pt; bottomLeft: Pt };

/** A standard card is 63.5 x 88.9 mm: short side / long side. */
export const CARD_RATIO = 63.5 / 88.9;

export const LIMITS = {
  minFill: 0.3, // card area / frame area: smaller and the edges are too few pixels to measure (still ~20 px/mm on a 12 MP photo)
  maxFill: 0.92, // bigger and an edge is probably cut off
  ratioTol: 0.1, // allowed relative error vs CARD_RATIO (shape check: catches tilt and wrong objects)
  maxAngleDev: 9, // degrees off 90 at any corner (tilt / keystone); hand-held phones need some slack
  maxSkew: 0.08, // opposite sides must match within 8%: a phone held at an angle shrinks the far edge
  margin: 0.015, // corners must sit this far inside the frame (fraction of the short side)
  maxGlare: 0.02, // share of the card's area that is a solid blown-out patch (foil specks don't count)
  minSharp: 25, // Laplacian variance on the preview frame (phone video is softer than stills)
  steadyMove: 0.025, // max movement of the smoothed corners between frames, fraction of the short side
  steadyFrames: 5, // good frames before auto-capture (a couple of bad frames in between are forgiven)
  forgive: 2, // bad frames tolerated before the count restarts
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const corners = (q: Quad) => [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft];

function area(q: Quad): number {
  const p = corners(q);
  let s = 0;
  for (let i = 0; i < 4; i++) s += p[i].x * p[(i + 1) % 4].y - p[(i + 1) % 4].x * p[i].y;
  return Math.abs(s) / 2;
}

function angleAt(prev: Pt, at: Pt, next: Pt): number {
  const a = Math.atan2(prev.y - at.y, prev.x - at.x), b = Math.atan2(next.y - at.y, next.x - at.x);
  let d = Math.abs(a - b) * (180 / Math.PI);
  if (d > 180) d = 360 - d;
  return d;
}

export type Shape = { fill: number; ratioErr: number; angleDev: number; skew: number; inside: boolean };

export function shape(q: Quad, w: number, h: number): Shape {
  const p = corners(q);
  const sides = p.map((c, i) => dist(c, p[(i + 1) % 4]));
  const a = (sides[0] + sides[2]) / 2, b = (sides[1] + sides[3]) / 2;
  const ratio = Math.min(a, b) / Math.max(a, b);
  const angleDev = Math.max(...p.map((c, i) => Math.abs(90 - angleAt(p[(i + 3) % 4], c, p[(i + 1) % 4]))));
  const m = LIMITS.margin * Math.min(w, h);
  const off = (x: number, y: number) => 1 - Math.min(x, y) / Math.max(x, y);
  return {
    skew: Math.max(off(sides[0], sides[2]), off(sides[1], sides[3])),
    fill: area(q) / (w * h),
    ratioErr: Math.abs(ratio - CARD_RATIO) / CARD_RATIO,
    angleDev,
    inside: p.every((c) => c.x >= m && c.y >= m && c.x <= w - m && c.y <= h - m),
  };
}

/** Glare share and sharpness inside the card's bounding box, on grayscale preview pixels. */
export function pixels(gray: Uint8ClampedArray | Uint8Array, w: number, h: number, q: Quad): { glare: number; sharp: number } {
  const p = corners(q);
  const x0 = Math.max(1, Math.floor(Math.min(...p.map((c) => c.x)))), x1 = Math.min(w - 2, Math.ceil(Math.max(...p.map((c) => c.x))));
  const y0 = Math.max(1, Math.floor(Math.min(...p.map((c) => c.y)))), y1 = Math.min(h - 2, Math.ceil(Math.max(...p.map((c) => c.y))));
  // Glare = 16x16 grid cells that are mostly blown out (>= 250). Foil specks are bright but scattered, so they don't fill a cell.
  const G = 16, cw = Math.max(1, (x1 - x0 + 1) / G), ch = Math.max(1, (y1 - y0 + 1) / G);
  const cellN = new Uint32Array(G * G), cellB = new Uint32Array(G * G);
  let n = 0, sum = 0, sum2 = 0;
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const i = y * w + x, v = gray[i];
      const lap = 4 * v - gray[i - 1] - gray[i + 1] - gray[i - w] - gray[i + w];
      const c = Math.min(G - 1, Math.floor((y - y0) / ch)) * G + Math.min(G - 1, Math.floor((x - x0) / cw));
      cellN[c]++; if (v >= 250) cellB[c]++;
      n++; sum += lap; sum2 += lap * lap;
    }
  }
  if (!n) return { glare: 0, sharp: 0 };
  let used = 0, blown = 0;
  for (let c = 0; c < G * G; c++) if (cellN[c]) { used++; if (cellB[c] >= 0.6 * cellN[c]) blown++; }
  const mean = sum / n;
  return { glare: blown / used, sharp: sum2 / n - mean * mean };
}

/** Largest corner movement between two quads, as a fraction of the frame's short side. */
export function moved(a: Quad, b: Quad, w: number, h: number): number {
  const pa = corners(a), pb = corners(b);
  return Math.max(...pa.map((c, i) => dist(c, pb[i]))) / Math.min(w, h);
}

export type Verdict = { ok: boolean; hint: string };

/** First problem wins, in the order the user should fix them. */
export function judge(q: Quad | null, s: Shape | null, px: { glare: number; sharp: number } | null): Verdict {
  if (!q || !s) return { ok: false, hint: "Put the card on a dark, plain surface inside the frame" };
  if (!s.inside || s.fill > LIMITS.maxFill) return { ok: false, hint: "Move back: all four edges must show" };
  if (s.fill < LIMITS.minFill) return { ok: false, hint: "Move closer" };
  if (s.angleDev > LIMITS.maxAngleDev || s.skew > LIMITS.maxSkew || s.ratioErr > LIMITS.ratioTol) return { ok: false, hint: "Hold the phone flat, straight above the card" };
  if (px && px.glare > LIMITS.maxGlare) return { ok: false, hint: "Glare: tilt the light or move away from it" };
  if (px && px.sharp < LIMITS.minSharp) return { ok: false, hint: "Hold still: the picture is blurry" };
  return { ok: true, hint: "Hold still…" };
}

/** Coarse 12x16 brightness grid of the card's bounding box: enough to tell "same shot again" from "relit" or "flipped". */
export function signature(gray: Uint8ClampedArray | Uint8Array, w: number, h: number, q: Quad): Float32Array {
  const p = [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft];
  const x0 = Math.max(0, Math.min(...p.map((c) => c.x))), x1 = Math.min(w - 1, Math.max(...p.map((c) => c.x)));
  const y0 = Math.max(0, Math.min(...p.map((c) => c.y))), y1 = Math.min(h - 1, Math.max(...p.map((c) => c.y)));
  const GX = 12, GY = 16, sum = new Float32Array(GX * GY), n = new Float32Array(GX * GY);
  for (let y = Math.floor(y0); y <= y1; y += 2) {
    for (let x = Math.floor(x0); x <= x1; x += 2) {
      const c = Math.min(GY - 1, Math.floor(((y - y0) / (y1 - y0 + 1)) * GY)) * GX + Math.min(GX - 1, Math.floor(((x - x0) / (x1 - x0 + 1)) * GX));
      sum[c] += gray[y * w + x]; n[c]++;
    }
  }
  return sum.map((s, i) => (n[i] ? s / n[i] / 255 : 0));
}

/** Mean absolute difference between two signatures (0 = identical, 1 = opposite). */
export const change = (a: Float32Array, b: Float32Array) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

/** How different the scene must be from the previous shot before the next one is taken. */
export const NEEDS_CHANGE = { light: 0.035, back: 0.05 };

/** Exponential smoothing of the corners: detection jitters a few pixels per frame on real video. */
export function smooth(prev: Quad | null, q: Quad, k = 0.5): Quad {
  if (!prev) return q;
  const m = (a: Pt, b: Pt): Pt => ({ x: a.x + k * (b.x - a.x), y: a.y + k * (b.y - a.y) });
  return { topLeft: m(prev.topLeft, q.topLeft), topRight: m(prev.topRight, q.topRight), bottomRight: m(prev.bottomRight, q.bottomRight), bottomLeft: m(prev.bottomLeft, q.bottomLeft) };
}

/** Corners as fractions of the frame, [[x, y] x 4] clockwise from top-left: what the server takes as `front_quad`. */
export const toFractions = (q: Quad, w: number, h: number) =>
  [q.topLeft, q.topRight, q.bottomRight, q.bottomLeft].map((p) => [Math.min(1, Math.max(0, p.x / w)), Math.min(1, Math.max(0, p.y / h))]);

/** Crop box around the card (corners as fractions of a w x h photo) with `pad` of the card's size on each side,
 * clamped to the photo, plus the corners re-expressed as fractions of the crop. Cropping instead of shrinking keeps
 * the card at the photo's full resolution (centering needs 12+ px per mm, 20+ is best). */
export function cropBox(fr: number[][], w: number, h: number, pad = 0.06) {
  const xs = fr.map((p) => p[0] * w), ys = fr.map((p) => p[1] * h);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = (x1 - x0) * pad, py = (y1 - y0) * pad;
  const x = Math.max(0, Math.floor(x0 - px)), y = Math.max(0, Math.floor(y0 - py));
  const cw = Math.min(w, Math.ceil(x1 + px)) - x, ch = Math.min(h, Math.ceil(y1 + py)) - y;
  return { x, y, w: cw, h: ch, quad: fr.map((p) => [(p[0] * w - x) / cw, (p[1] * h - y) / ch]) };
}
