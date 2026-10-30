/** G5 live scan: pure checks on each preview frame. The browser finds the card's corners (scanic);
 * these decide whether the shot is good enough to auto-capture and what hint to show. */

export type Pt = { x: number; y: number };
export type Quad = { topLeft: Pt; topRight: Pt; bottomRight: Pt; bottomLeft: Pt };

/** A standard card is 63.5 x 88.9 mm: short side / long side. */
export const CARD_RATIO = 63.5 / 88.9;

export const LIMITS = {
  minFill: 0.45, // card area / frame area: smaller and the edges are too few pixels to measure
  maxFill: 0.92, // bigger and an edge is probably cut off
  ratioTol: 0.07, // allowed relative error vs CARD_RATIO (shape check: catches tilt and wrong objects)
  maxAngleDev: 6, // degrees off 90 at any corner (tilt / keystone)
  maxSkew: 0.05, // opposite sides must match within 5%: a phone held at an angle shrinks the far edge
  margin: 0.015, // corners must sit this far inside the frame (fraction of the short side)
  maxGlare: 0.02, // share of the card's area that is a solid blown-out patch (foil specks don't count)
  minSharp: 60, // Laplacian variance on the preview frame
  steadyMove: 0.012, // max corner movement between frames, fraction of the short side
  steadyFrames: 6, // consecutive good frames before auto-capture
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
