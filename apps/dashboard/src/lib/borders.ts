/** G7: the 8 centering lines (4 cut edges, 4 printed borders) in mm on the straightened card, and the splits they give.
 * Mirrors tools/grade-screen/borders.py. Outer lines: offset of each cut edge from where the photo put it (+ = inward).
 * Inner lines: depth from the nominal edge at the two ends of the side (5% and 95% along it, top->bottom or left->right). */

export const SIDES = ["top", "right", "bottom", "left"] as const;
export type SideName = (typeof SIDES)[number];
export const CARD_W = 63.5, CARD_H = 88.9;
export const NUDGE_MM = 0.05;

export type Lines = { outer: Record<SideName, number>; inner: Record<SideName, [number, number]> };
type InnerLine = { depth_mm: number; ends_mm: [number, number]; slope: number; inliers: number; rms_mm: number; strength: number } | null;
export type Borders = {
  status: "ok" | "needs_manual" | "refused";
  px_per_mm: number;
  why: string[];
  inner: Partial<Record<SideName, InnerLine>>;
  centering?: Partial<Record<"lr" | "tb", { mid: number; worst: number; wider: string }>>;
  alternates: Partial<Record<SideName, number[]>>;
  straight?: { px_per_mm: number; margin_px: number };
  image?: string | null;
};

/** Lines as measured; a side with no border found starts at 3 mm so it can be dragged into place. */
export function initialLines(b: Borders): Lines {
  const inner = {} as Lines["inner"];
  for (const s of SIDES) {
    const l = b.inner[s];
    inner[s] = l ? [l.ends_mm[0], l.ends_mm[1]] : [3, 3];
  }
  return { outer: { top: 0, right: 0, bottom: 0, left: 0 }, inner };
}

const width = (L: Lines, s: SideName, i: 0 | 1) => L.inner[s][i] - L.outer[s];
const share = (a: number, b: number) => (a + b > 0 ? Math.max(a, b) / (a + b) : NaN);

export type Split = { mid: number; worst: number; wider: SideName; widths: Record<string, number> };

/** L/R and T/B: larger share (0.5-1) at mid-side and at the worse end. */
export function splits(L: Lines): { lr: Split; tb: Split } {
  const one = (a: SideName, b: SideName): Split => {
    const wa = [width(L, a, 0), width(L, a, 1)], wb = [width(L, b, 0), width(L, b, 1)];
    const ma = (wa[0] + wa[1]) / 2, mb = (wb[0] + wb[1]) / 2;
    const mid = share(ma, mb);
    return { mid, worst: Math.max(mid, share(wa[0], wb[0]), share(wa[1], wb[1])), wider: ma >= mb ? a : b, widths: { [a]: ma, [b]: mb } };
  };
  return { lr: one("left", "right"), tb: one("top", "bottom") };
}

export const fmtSplit = (x: number) => (Number.isFinite(x) ? `${Math.round(x * 100)}/${Math.round((1 - x) * 100)}` : "—");

// Written tolerances (worse side), front / back: same tables as condition.py.
const PSA: [number, number, number][] = [[10, 0.55, 0.75], [9, 0.6, 0.9], [8, 0.65, 0.9], [7, 0.7, 0.9]];
const BGS: [number, number, number][] = [[10, 0.52, 0.6], [9.5, 0.55, 0.6], [9, 0.55, 0.7], [8, 0.6, 0.8]];

/** Best PSA / BGS grade whose centering tolerance this split meets ("6" / "7" when below the tables). */
export function centeringGrade(worse: number, back = false): { psa: number; bgs: number } {
  const i = back ? 2 : 1;
  return {
    psa: PSA.find((r) => worse <= r[i])?.[0] ?? 6,
    bgs: BGS.find((r) => worse <= r[i])?.[0] ?? 7,
  };
}

/** Move one line: outer (whole edge) or one/both ends of an inner line. Steps in mm, + = toward the card's centre. */
export function nudge(L: Lines, side: SideName, kind: "outer" | "inner", by: number, end?: 0 | 1): Lines {
  const r = (x: number) => Math.round(x * 1000) / 1000;
  if (kind === "outer") return { ...L, outer: { ...L.outer, [side]: r(L.outer[side] + by) } };
  const [a, b] = L.inner[side];
  const next: [number, number] = end === undefined ? [r(a + by), r(b + by)] : end === 0 ? [r(a + by), b] : [a, r(b + by)];
  return { ...L, inner: { ...L.inner, [side]: next } };
}

/** Sanity limits for saved lines: borders between 0 and 20 mm, cut edges within 2 mm of the photo's. */
export function validLines(x: unknown): x is Lines {
  if (typeof x !== "object" || x === null) return false;
  const L = x as Lines;
  return SIDES.every((s) => {
    const o = L.outer?.[s], i = L.inner?.[s];
    return typeof o === "number" && Math.abs(o) <= 2 && Array.isArray(i) && i.length === 2 &&
      i.every((v) => typeof v === "number" && Number.isFinite(v) && v - o > 0 && v - o < 20);
  });
}

/** Where a line sits on the straightened image, in image px (for drawing): two points. */
export function linePx(L: Lines, side: SideName, kind: "outer" | "inner", R: number, M: number): [number, number, number, number] {
  const W = CARD_W * R, H = CARD_H * R;
  const d = kind === "outer" ? [L.outer[side], L.outer[side]] : L.inner[side];
  const along = side === "top" || side === "bottom" ? [0.05 * W, 0.95 * W] : [0.05 * H, 0.95 * H];
  if (kind === "outer") { along[0] = 0; along[1] = side === "top" || side === "bottom" ? W : H; }
  switch (side) {
    case "top": return [M + along[0], M + d[0] * R, M + along[1], M + d[1] * R];
    case "bottom": return [M + along[0], M + H - d[0] * R, M + along[1], M + H - d[1] * R];
    case "left": return [M + d[0] * R, M + along[0], M + d[1] * R, M + along[1]];
    default: return [M + W - d[0] * R, M + along[0], M + W - d[1] * R, M + along[1]];
  }
}

/** 3-shot repeatability: worst-point splits from each still of the same side. Spread in points (max - min);
 * over 1.5 points the measurement isn't trustworthy. Shots that couldn't be measured are listed as null. */
export const MAX_SPREAD_POINTS = 1.5;
export type Repeats = { lr: (number | null)[]; tb: (number | null)[] };
export function repeatability(r: Repeats): { lr: number | null; tb: number | null; ok: boolean; measured: number } {
  const spread = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null && Number.isFinite(x));
    return v.length >= 2 ? Math.round((Math.max(...v) - Math.min(...v)) * 1000) / 10 : null;
  };
  const lr = spread(r.lr), tb = spread(r.tb);
  const measured = Math.min(r.lr.filter((x) => x !== null).length, r.tb.filter((x) => x !== null).length);
  return { lr, tb, measured, ok: measured >= 3 && lr !== null && tb !== null && lr <= MAX_SPREAD_POINTS && tb <= MAX_SPREAD_POINTS };
}
