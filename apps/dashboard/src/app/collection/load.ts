import { supabase } from "@soccer-card-radar/db";
import { valueCard, configFromAssumptions, maxBid, type CardStatus, type Decision } from "@soccer-card-radar/shared";
import { weekOf, toSnapshotRows, changedRows, weeklyTotals, cardTrends, type SnapshotRow, type WeekTotal, type CardTrend } from "./snapshot";

export type CompRow = { grade: string; price: number; method: string; source: string; asOf: string };

export type CollectionCard = {
  id: string;
  status: CardStatus;
  item: string;
  player: string;
  gradeLabel: string; // "PSA 10", "BGS 9.5", "Raw"
  cert: string | null;
  qty: number;
  dateAdded: string | null;
  imagePath: string | null;
  notes: string | null;
  submissionId: string | null;
  cost: number | null;
  valueNow: number | null;
  psa10: number | null;
  psa9: number | null;
  psa8: number | null;
  net10: number | null;
  net9: number | null;
  net8: number | null;
  decision: Decision | null;
  estimated: boolean;
  band: string | null;
  maxBid: number | null;
  comps: CompRow[];
  ledger: { kind: string; amount: number; occurredOn: string | null; source: string | null }[];
};

const latest = (rows: CompRow[]) => [...rows].sort((a, b) => b.asOf.localeCompare(a.asOf))[0];

type CardRow = {
  id: string; status: CardStatus; item: string; player: string | null; grader: string | null; grade: string | null;
  cert: string | null; qty: number; submissionId: string | null; dateAdded: string | null; imagePath: string | null; notes: string | null;
};
export type RawRows = {
  cards: CardRow[];
  comps: ({ cardId: string } & CompRow)[];
  ledger: { cardId: string | null; kind: string; amount: number; occurredOn: string | null; source: string | null }[];
  assumptions: { key: string; value: number }[];
  snapshots: SnapshotRow[];
};

export type CollectionData = { cards: CollectionCard[]; weeks: WeekTotal[]; trends: Record<string, CardTrend>; thisWeek: string };

const fixtureMode = () => !!process.env.COLLECTION_FIXTURE && process.env.NODE_ENV !== "production";

async function fetchRows(): Promise<RawRows> {
  // Local UAT without database access: COLLECTION_FIXTURE=path/to/collection.json (ignored in production).
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    const rows = JSON.parse(await readFile(process.env.COLLECTION_FIXTURE!, "utf8")) as RawRows;
    return { ...rows, snapshots: rows.snapshots ?? [] };
  }
  const since = new Date(Date.now() - 13 * 7 * 86400_000).toISOString().slice(0, 10);
  const [cards, comps, ledger, assumptions, snapshots] = await Promise.all([
    supabase.from("Card").select("*"),
    supabase.from("CardComp").select('"cardId", grade, price, method, source, "asOf"'),
    supabase.from("LedgerEntry").select('"cardId", kind, amount, "occurredOn", source'),
    supabase.from("Assumption").select("key, value"),
    supabase.from("CardValueSnapshot").select('"cardId", week, status, "valueNow", psa10, psa9, psa8, cost').gte("week", since),
  ]);
  for (const r of [cards, comps, ledger, assumptions, snapshots]) if (r.error) throw new Error(r.error.message);
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    cards: cards.data ?? [], comps: comps.data ?? [], ledger: ledger.data ?? [], assumptions: assumptions.data ?? [],
    snapshots: (snapshots.data ?? []).map((r) => ({ ...r, valueNow: num(r.valueNow), psa10: num(r.psa10), psa9: num(r.psa9), psa8: num(r.psa8), cost: num(r.cost) })),
  } as RawRows;
}

/** Loads the collection and records this week's value snapshot (A5): only changed rows are written. */
export async function loadCollection(now: Date = new Date()): Promise<CollectionData> {
  const rows = await fetchRows();
  const cards = buildCollection(rows);
  const thisWeek = weekOf(now);
  const current = toSnapshotRows(cards, thisWeek);
  const changed = changedRows(current, rows.snapshots.filter((r) => r.week === thisWeek));
  if (changed.length && !fixtureMode()) {
    const { error } = await supabase.from("CardValueSnapshot").upsert(changed, { onConflict: "cardId,week" });
    if (error) console.error("snapshot upsert failed:", error.message);
  }
  const all = [...rows.snapshots.filter((r) => r.week !== thisWeek), ...current];
  return { cards, weeks: weeklyTotals(all), trends: cardTrends(all), thisWeek };
}

export function buildCollection(rows: RawRows): CollectionCard[] {
  const cfg = configFromAssumptions(Object.fromEntries(rows.assumptions.map((a) => [a.key, Number(a.value)])));

  const compsBy = new Map<string, CompRow[]>();
  for (const c of rows.comps) {
    const list = compsBy.get(c.cardId) ?? [];
    list.push({ grade: c.grade, price: Number(c.price), method: c.method, source: c.source, asOf: c.asOf });
    compsBy.set(c.cardId, list);
  }
  const ledgerBy = new Map<string, CollectionCard["ledger"]>();
  for (const l of rows.ledger) {
    if (!l.cardId) continue;
    const list = ledgerBy.get(l.cardId) ?? [];
    list.push({ kind: l.kind, amount: Number(l.amount), occurredOn: l.occurredOn, source: l.source });
    ledgerBy.set(l.cardId, list);
  }

  return rows.cards.map((card) => {
    const comps = compsBy.get(card.id) ?? [];
    const ledger = ledgerBy.get(card.id) ?? [];
    const gradeLabel = card.grader && card.grade ? `${card.grader} ${card.grade}` : card.status === "at_grader" ? "At PSA" : card.status === "sealed" ? "Sealed" : "Raw";
    const curGrade = card.grader && card.grade ? `${card.grader} ${card.grade}` : "raw";
    const at = (grade: string, pred: (c: CompRow) => boolean = () => true) => latest(comps.filter((c) => c.grade === grade && pred(c)))?.price ?? null;

    const valueNow = at(curGrade, (c) => c.method === "value_used") ?? at(curGrade);
    const cost = ledger.length ? ledger.reduce((s, l) => s + l.amount, 0) : null;
    const v = valueCard(
      {
        status: card.status,
        item: card.item,
        cost,
        valueUsed: valueNow,
        comps: {
          psa10: at("PSA 10", (c) => c.method !== "value_used"),
          psa9: at("PSA 9", (c) => c.method !== "value_used"),
          psa8: at("PSA 8", (c) => c.method !== "value_used"),
          raw: at("raw", (c) => c.method !== "value_used"),
        },
      },
      cfg,
    );

    return {
      id: card.id,
      status: card.status,
      item: card.item,
      player: card.player ?? "Unknown",
      gradeLabel,
      cert: card.cert,
      qty: card.qty,
      dateAdded: card.dateAdded,
      imagePath: card.imagePath,
      notes: card.notes,
      submissionId: card.submissionId,
      cost,
      valueNow,
      ...v,
      maxBid: maxBid(v.psa9, v.psa10),
      comps: [...comps].sort((a, b) => b.asOf.localeCompare(a.asOf)),
      ledger,
    };
  });
}
