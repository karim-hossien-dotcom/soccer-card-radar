import type { Borders } from "./borders";

/**
 * G2: photo condition check. Parses the JSON from POST /api/condition (tools/grade-screen/condition.py via the
 * Vercel Python function) into plain lines for the Grading tab. Reject filter only: never a grade promise.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
/** Vercel caps a function request body at 4.5 MB: larger photos are re-encoded in the browser before upload. */
export const UPLOAD_SOFT_LIMIT = 2 * 1024 * 1024;
export const DOWNSCALE_LONG_SIDE = 3000;

type Edge = { side: string; specks: number | null; specks_per_10cm: number | null; notches: number | null; note: string | null };
type Corner = { corner: string; whitening_pct: number | null; rounding_vs_others_mm: number | null; note: string | null };
type Side = { px_per_mm: number; edges: Edge[]; corners: Corner[]; borders: Borders | null } | null;
export type CentKey = "front_lr" | "front_tb" | "back_lr" | "back_tb";
export const CENT_KEYS: CentKey[] = ["front_lr", "front_tb", "back_lr", "back_tb"];
type CentGrade = { split: string; psa: number; psa_tolerance: string | null; bgs: number; bgs_tolerance: string | null };
export type SurfaceFinding = { kind: string; where: string; source: "both" | "measured" | "claude"; size_mm?: number; note?: string | null };
export type SurfaceScan = { side: string; status: "measured" | "cant_judge"; why: string | null; findings: SurfaceFinding[]; overlay: string | null; ai: boolean };
export type ConditionReport = {
  front: Side; back: Side; holder: boolean; note: string;
  surface: SurfaceScan[];
  centering: Partial<Record<CentKey, string>>;
  centering_grades: Partial<Record<CentKey, CentGrade>>;
  ceiling: { psa: number | null; bgs: number | null; tag: number | null; why: string[]; look: string[] };
  cant_judge: { point: string; graders: string; why: string }[];
};

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Throws with a readable message when the response is not a condition report. */
export function parseReport(x: unknown): ConditionReport {
  if (!isObj(x)) throw new Error("Empty response from the check");
  if (typeof x.error === "string") throw new Error(x.error);
  const c = x.ceiling;
  if (!isObj(c) || !Array.isArray(c.why) || !Array.isArray(c.look) || !Array.isArray(x.cant_judge) || !isObj(x.centering))
    throw new Error("The check returned something unexpected");
  const side = (s: unknown): Side =>
    isObj(s) ? { px_per_mm: Number(s.px_per_mm), edges: Array.isArray(s.edges) ? (s.edges as Edge[]) : [], corners: Array.isArray(s.corners) ? (s.corners as Corner[]) : [],
      borders: isObj(s.borders) && isObj(s.borders.inner) ? (s.borders as unknown as Borders) : null } : null;
  return {
    front: side(x.front), back: side(x.back), holder: x.holder === true, note: typeof x.note === "string" ? x.note : "",
    surface: Array.isArray(x.surface_scan) ? (x.surface_scan as SurfaceScan[]).filter(isObj) : [],
    centering: x.centering as ConditionReport["centering"],
    centering_grades: (isObj(x.centering_grades) ? x.centering_grades : {}) as ConditionReport["centering_grades"],
    ceiling: { psa: c.psa as number | null, bgs: c.bgs as number | null, tag: c.tag as number | null, why: c.why as string[], look: c.look as string[] },
    cant_judge: x.cant_judge as ConditionReport["cant_judge"],
  };
}

/** Headline: the highest grade each company's written standard still allows, or why there is none. */
export function ceilingLine(r: ConditionReport): { capped: boolean; headline: string; reasons: string[] } {
  const { psa, bgs, tag, why } = r.ceiling;
  if (psa === null || bgs === null || tag === null) return { capped: false, headline: "No ceiling from this photo", reasons: why };
  if (psa === 10 && bgs === 10 && tag === 10) return { capped: false, headline: "No visible issue: PSA 10 / BGS 10 / TAG 10 not ruled out", reasons: why };
  return { capped: true, headline: `At best PSA ${psa} · BGS ${bgs} · TAG ${tag}`, reasons: why };
}

export type CentRow = { side: string; split: string; psa: string; bgs: string };

/** Centering per side and axis (worst point along the side) with the best PSA and BGS tolerance it still meets. */
export function centeringRows(r: ConditionReport): CentRow[] {
  return CENT_KEYS.flatMap((k) => {
    if (k.startsWith("back") && !r.back) return [];
    const side = `${k.startsWith("front") ? "Front" : "Back"} ${k.endsWith("lr") ? "L/R" : "T/B"}`;
    const g = r.centering_grades[k];
    const split = g?.split ?? r.centering[k];
    if (!split) return [{ side, split: "—", psa: "not measured", bgs: "not measured" }];
    if (!g) return [{ side, split, psa: "—", bgs: "—" }];
    return [{
      side, split,
      psa: g.psa_tolerance ? `PSA ${g.psa} (within ${g.psa_tolerance})` : `below PSA 7 tolerances`,
      bgs: g.bgs_tolerance ? `BGS ${g.bgs} (within ${g.bgs_tolerance})` : `below BGS 8 tolerances`,
    }];
  });
}

/** Edge chips and corner whitening per photographed side, in words. Empty side lists mean nothing was judged. */
export function wearFindings(r: ConditionReport): { side: string; lines: string[] }[] {
  const out: { side: string; lines: string[] }[] = [];
  for (const [label, s] of [["Front", r.front], ["Back", r.back]] as const) {
    if (!s) continue;
    const lines: string[] = [];
    if (!s.edges.length && !s.corners.length) { out.push({ side: label, lines: ["Edges and corners not judged"] }); continue; }
    for (const e of s.edges) {
      if (e.specks === null) lines.push(`${e.side} edge: not judged (${e.note ?? "border too light"})`);
      else lines.push(`${e.side} edge: ${e.specks === 0 ? "no chipping specks" : `${e.specks} chipping speck${e.specks === 1 ? "" : "s"}`}`);
    }
    for (const c of s.corners) {
      if (c.whitening_pct === null) lines.push(`${c.corner} corner: whitening not judged`);
      else lines.push(`${c.corner} corner: ${c.whitening_pct > 3 ? `whitening (${c.whitening_pct}% of the corner)` : "no whitening"}`);
    }
    out.push({ side: label, lines });
  }
  return out;
}

/** Client-side upload check: returns an error message or null. */
export function checkFile(f: { size: number; type: string; name?: string }, label: string): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return `${label} photo must be a jpg, png or webp`;
  if (f.size > MAX_IMAGE_BYTES) return `${label} photo is over 8 MB`;
  return null;
}

/** Target size for re-encoding a large photo: long side capped, aspect kept. null = send as is. */
export function downscaleSize(w: number, h: number, bytes: number): { w: number; h: number } | null {
  if (bytes <= UPLOAD_SOFT_LIMIT) return null;
  const k = Math.min(1, DOWNSCALE_LONG_SIDE / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

const SOURCE: Record<SurfaceFinding["source"], string> = { both: "measured and seen by Claude", measured: "measured", claude: "seen by Claude only" };

/** Surface lines with the number drawn on the overlay photo (measured findings are numbered in order; Claude-only ones are not drawn). */
export function surfaceLines(s: SurfaceScan): { n: number | null; text: string; source: SurfaceFinding["source"] }[] {
  let n = 0;
  return s.findings.map((f) => {
    const num = f.source === "claude" ? null : ++n;
    const size = f.size_mm && f.source !== "claude" ? `, about ${Math.round(f.size_mm)} mm` : "";
    return { n: num, text: `${f.kind[0].toUpperCase()}${f.kind.slice(1)}, ${f.where}${size}${f.note ? ` (${f.note})` : ""}: ${SOURCE[f.source]}`, source: f.source };
  });
}
