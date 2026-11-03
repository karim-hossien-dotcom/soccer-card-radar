/**
 * J3: shapes JobRun rows (J1) for the "Latest runs" panel on Radar home. Pure: no IO, never throws on bad jsonb.
 */
export type JobKey = "prices" | "players" | "photos";
export type ChangeKind = "value" | "card_added" | "photo" | "estimate" | "cost";
export type JobRunRow = {
  job: string; ranAt: string; finishedAt: string | null; status: string; openCount: number;
  summary: string; reportPath: string | null; changes: unknown; photoList: unknown;
};
export type Change = { kind: ChangeKind; cardId: string; card: string; from?: unknown; to?: unknown; source?: string };
export type PhotoItem = { cardId: string; card: string; side: "front" | "back"; reason: string };
export type RunView = {
  statusLine: string; complete: boolean; summary: string; ranAt: string; finishedAt: string | null; reportPath: string | null;
  changes: Change[]; photoList: PhotoItem[]; counts: string; unreadable: number;
};
export type JobPanel = { job: JobKey; label: string; run: RunView | null; empty: string };

const JOBS: [JobKey, string][] = [["prices", "Prices"], ["players", "Players"], ["photos", "Photos"]];
const KINDS: [ChangeKind, string, string][] = [
  ["value", "value", "values"], ["card_added", "card added", "cards added"], ["cost", "cost", "costs"],
  ["photo", "photo", "photos"], ["estimate", "estimate", "estimates"],
];
const isKind = (k: unknown): k is ChangeKind => KINDS.some(([kk]) => kk === k);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);

/** Valid items plus how many were skipped. A non-array value counts as one unreadable item. */
function parseList<T>(v: unknown, one: (o: Record<string, unknown>) => T | null): [T[], number] {
  if (v === undefined || (Array.isArray(v) && !v.length)) return [[], 0];
  if (!Array.isArray(v)) return [[], 1];
  const out: T[] = [];
  let bad = 0;
  for (const x of v) {
    const o = obj(x), item = o && one(o);
    if (item) out.push(item); else bad++;
  }
  return [out, bad];
}

function parseChange(o: Record<string, unknown>): Change | null {
  const cardId = str(o.cardId);
  if (!cardId || !isKind(o.kind)) return null;
  const c: Change = { kind: o.kind, cardId, card: str(o.card) ?? cardId };
  if ("from" in o) c.from = o.from;
  if ("to" in o) c.to = o.to;
  if (str(o.source)) c.source = o.source as string;
  return c;
}

function parsePhoto(o: Record<string, unknown>): PhotoItem | null {
  const cardId = str(o.cardId);
  if (!cardId || (o.side !== "front" && o.side !== "back")) return null;
  return { cardId, card: str(o.card) ?? cardId, side: o.side, reason: typeof o.reason === "string" ? o.reason : "" };
}

/** "12 values, 3 cards added, 2 costs, 1 photo, 4 estimates" (+ ", n unreadable"). */
export function countsLine(changes: Change[], unreadable: number): string {
  const parts = KINDS.flatMap(([k, one, many]) => {
    const n = changes.filter((c) => c.kind === k).length;
    return n ? [`${n} ${n === 1 ? one : many}`] : [];
  });
  if (unreadable) parts.push(`${unreadable} unreadable`);
  return parts.length ? parts.join(", ") : "No changes";
}

const ET = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit", timeZoneName: "short",
});
/** Absolute date/time in Eastern time with EDT/EST, e.g. "Sun, Nov 8, 2026, 7:43 PM EST". */
export function formatEt(iso: string | null | undefined): string {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(t) ? "unknown time" : ET.format(new Date(t)).replace(/\s/g, " ");
}

/**
 * Drops the summary's first line when it repeats the status line ("Complete" / "Incomplete: N items open").
 * Kept when it disagrees with status/openCount, so a mismatch stays visible.
 */
export function summaryBody(summary: string, complete: boolean, open: number): string {
  const [first = "", ...rest] = summary.split("\n");
  const m = /^\s*(complete|incomplete)\s*(?::\s*(\d+)\b[^\n]*)?\s*$/i.exec(first);
  if (!m) return summary;
  const same = complete ? m[1]!.toLowerCase() === "complete" && !m[2] : m[1]!.toLowerCase() === "incomplete" && Number(m[2]) === open;
  return same ? rest.join("\n").replace(/^\s*\n/, "") : summary;
}

function toView(r: JobRunRow): RunView {
  const [changes, badC] = parseList(r.changes, parseChange);
  const [photoList, badP] = parseList(r.photoList, parsePhoto);
  const unreadable = badC + badP;
  const complete = r.status === "complete";
  const open = Number(r.openCount) || 0;
  return {
    statusLine: complete ? "Complete" : `Incomplete: ${open} open`, complete,
    summary: summaryBody(typeof r.summary === "string" ? r.summary : "", complete, open), ranAt: r.ranAt, finishedAt: r.finishedAt ?? null,
    reportPath: str(r.reportPath), changes, photoList, counts: countsLine(changes, unreadable), unreadable,
  };
}

/** Latest run per job (newest ranAt wins), in fixed order Prices, Players, Photos. */
export function latestRuns(rows: JobRunRow[]): JobPanel[] {
  const best = new Map<string, { t: number; r: JobRunRow }>();
  for (const r of rows ?? []) {
    const t = r && typeof r.ranAt === "string" ? Date.parse(r.ranAt) : NaN;
    if (!r || Number.isNaN(t)) continue;
    const cur = best.get(r.job);
    if (!cur || t > cur.t) best.set(r.job, { t, r });
  }
  return JOBS.map(([job, label]) => {
    const b = best.get(job);
    return { job, label, run: b ? toView(b.r) : null, empty: "No run logged yet" };
  });
}
