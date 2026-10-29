import type { CollectionCard } from "./load";

/** ISO week key: the Monday (UTC) of the week containing `d`. */
export function weekOf(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export type SnapshotRow = {
  cardId: string;
  week: string;
  status: string;
  valueNow: number | null;
  psa10: number | null;
  psa9: number | null;
  psa8: number | null;
  cost: number | null;
};

const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

export function toSnapshotRows(cards: CollectionCard[], week: string): SnapshotRow[] {
  return cards.map((c) => ({ cardId: c.id, week, status: c.status, valueNow: r2(c.valueNow), psa10: r2(c.psa10), psa9: r2(c.psa9), psa8: r2(c.psa8), cost: r2(c.cost) }));
}

/** Rows whose values differ from what is stored for the same card+week (latest scan in a week wins). */
export function changedRows(next: SnapshotRow[], stored: SnapshotRow[]): SnapshotRow[] {
  const key = (r: SnapshotRow) => `${r.cardId}|${r.week}`;
  const have = new Map(stored.map((r) => [key(r), r]));
  return next.filter((r) => {
    const s = have.get(key(r));
    return !s || s.status !== r.status || s.valueNow !== r.valueNow || s.psa10 !== r.psa10 || s.psa9 !== r.psa9 || s.psa8 !== r.psa8 || s.cost !== r.cost;
  });
}

export type WeekTotal = { week: string; total: number; graded: number; raw: number; atGrader: number; cards: number };

export function weeklyTotals(rows: SnapshotRow[]): WeekTotal[] {
  const by = new Map<string, WeekTotal>();
  for (const r of rows) {
    if (r.status === "sealed") continue; // packs and boxes sit in their own Vault section, outside card totals
    const t = by.get(r.week) ?? { week: r.week, total: 0, graded: 0, raw: 0, atGrader: 0, cards: 0 };
    const v = r.valueNow ?? 0;
    t.total += v;
    t.cards += 1;
    if (r.status === "graded") t.graded += v;
    else if (r.status === "at_grader") t.atGrader += v;
    else t.raw += v;
    by.set(r.week, t);
  }
  return [...by.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export type CardTrend = { series: { week: string; value: number }[]; wow: number | null };

export function cardTrends(rows: SnapshotRow[]): Record<string, CardTrend> {
  const by: Record<string, { week: string; value: number }[]> = {};
  for (const r of rows) if (r.valueNow !== null) (by[r.cardId] ??= []).push({ week: r.week, value: r.valueNow });
  const out: Record<string, CardTrend> = {};
  for (const [id, s] of Object.entries(by)) {
    s.sort((a, b) => a.week.localeCompare(b.week));
    const n = s.length;
    out[id] = { series: s, wow: n >= 2 ? s[n - 1].value - s[n - 2].value : null };
  }
  return out;
}
