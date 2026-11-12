/**
 * PC3: OpenItem rows (migration 20261112e) for the "Open items (N)" block in Radar home's "Latest runs" panel,
 * plus the upsert rule jobs follow (same rule as the SQL in the migration). Pure: no IO, never throws on bad rows.
 */
export type OpenItemRow = {
  id: string; job: string; cardId: string | null; title: string; reason: string;
  firstSeen: string; lastSeen: string; closedAt: string | null; closedHow: string | null;
};
export type OpenItemView = {
  id: string; job: string; jobLabel: string; cardId: string | null; title: string; reason: string;
  firstSeen: string; ageDays: number; age: string;
};

const LABEL: Record<string, string> = { prices: "Prices", players: "Players", photos: "Photos" };
const DAY = 86_400_000;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);

/** Whole days since firstSeen (never negative). */
export function ageDays(firstSeen: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(firstSeen)) / DAY));
}
export const ageLabel = (d: number) => `${d} ${d === 1 ? "day" : "days"}`;

/** Open items only (closed drop off), oldest firstSeen first; ties by job then title. Unreadable rows skipped. */
export function openItems(rows: OpenItemRow[] | null | undefined, now: Date): OpenItemView[] {
  const out: (OpenItemView & { t: number })[] = [];
  for (const r of rows ?? []) {
    if (!r || typeof r !== "object" || r.closedAt) continue;
    const title = str(r.title), job = str(r.job), first = str(r.firstSeen);
    const t = first ? Date.parse(first) : NaN;
    if (!title || !job || Number.isNaN(t)) continue;
    const d = ageDays(first!, now);
    out.push({
      id: String(r.id ?? `${job}|${r.cardId ?? ""}|${title}`), job, jobLabel: LABEL[job] ?? job, cardId: str(r.cardId),
      title, reason: typeof r.reason === "string" ? r.reason : "", firstSeen: first!, ageDays: d, age: ageLabel(d), t,
    });
  }
  out.sort((a, b) => a.t - b.t || a.job.localeCompare(b.job) || a.title.localeCompare(b.title));
  return out.map(({ t: _t, ...v }) => v);
}

/** What one run reports: items still open, and items it resolved (closedHow required). */
export type RunItems = {
  open: { cardId: string | null; title: string; reason: string }[];
  resolved: { cardId: string | null; title: string; closedHow: string }[];
};
export type UpsertPlan = {
  insert: Omit<OpenItemRow, "id">[];
  touch: { id: string; lastSeen: string; reason: string }[];
  close: { id: string; closedAt: string; closedHow: string }[];
};

const key = (job: string, cardId: string | null, title: string) => `${job}\u0000${cardId ?? ""}\u0000${title}`;

/**
 * Upsert by (job, cardId, title) against that job's OPEN rows: new -> insert, still open -> lastSeen (+ latest reason),
 * resolved -> closedAt + closedHow. A resolved item with no open row, or without closedHow, is ignored. Open rows the run
 * does not mention are left open. A key closed earlier that comes back is inserted as a new row (new firstSeen).
 */
export function planUpsert(existing: OpenItemRow[], job: string, run: RunItems, now: Date): UpsertPlan {
  const at = now.toISOString();
  const open = new Map<string, OpenItemRow>();
  for (const r of existing) if (r.job === job && !r.closedAt) open.set(key(r.job, r.cardId, r.title), r);
  const plan: UpsertPlan = { insert: [], touch: [], close: [] };
  const seen = new Set<string>();
  for (const r of run.resolved) {
    const k = key(job, r.cardId, r.title), row = open.get(k), how = str(r.closedHow);
    if (!row || !how || seen.has(k)) continue;
    seen.add(k);
    plan.close.push({ id: row.id, closedAt: at, closedHow: how });
  }
  for (const o of run.open) {
    const k = key(job, o.cardId, o.title);
    if (!str(o.title) || seen.has(k)) continue;
    seen.add(k);
    const row = open.get(k);
    if (row) plan.touch.push({ id: row.id, lastSeen: at, reason: o.reason });
    else plan.insert.push({ job, cardId: o.cardId, title: o.title, reason: o.reason, firstSeen: at, lastSeen: at, closedAt: null, closedHow: null });
  }
  return plan;
}
