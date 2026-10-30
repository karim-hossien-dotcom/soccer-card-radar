import { supabase } from "@soccer-card-radar/db";
import { valueCard, configFromAssumptions, snipeMaxBid, snipeConfigFromAssumptions, type CardStatus, type Decision } from "@soccer-card-radar/shared";
import { weekOf, toSnapshotRows, changedRows, weeklyTotals, cardTrends, type SnapshotRow, type WeekTotal, type CardTrend } from "./snapshot";
import { byRecency, vaultComp, maxBidInputs, isSaleComp, type VaultComp } from "@/lib/vault-comp";

export type CompRow = VaultComp;

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
  photoSourceFront: string | null;
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
  compGrade: string; // grade the current value is priced at ("raw" for raw / at PSA)
  compAsOf: string | null; // date of the comp behind valueNow
  stale: boolean; // compAsOf older than STALE_DAYS (or no comp)
  pop: PopRow | null; // latest PSA population for this card's spec
  ledger: { kind: string; amount: number; occurredOn: string | null; source: string | null }[];
};

export const STALE_DAYS = 14;
export type PopRow = { asOf: string; total: number | null; gem10: number | null; pop9: number | null; gemRate: number | null };

type CardRow = {
  id: string; status: CardStatus; item: string; player: string | null; grader: string | null; grade: string | null;
  cert: string | null; qty: number; submissionId: string | null; dateAdded: string | null; imagePath: string | null; notes: string | null;
  photoSourceFront?: string | null; // full photo of this copy for grading (seller's listing photo); imagePath is the card-only crop
};
export type RawRows = {
  cards: CardRow[];
  comps: ({ cardId: string } & CompRow)[];
  ledger: { cardId: string | null; kind: string; amount: number; occurredOn: string | null; source: string | null }[];
  assumptions: { key: string; value: number }[];
  snapshots: SnapshotRow[];
  pops?: ({ cardId: string } & PopRow)[];
};

export type CollectionData = { cards: CollectionCard[]; weeks: WeekTotal[]; trends: Record<string, CardTrend>; thisWeek: string };

export const fixtureMode = () => !!process.env.COLLECTION_FIXTURE && process.env.NODE_ENV !== "production";

export async function fetchRows(): Promise<RawRows> {
  // Local UAT without database access: COLLECTION_FIXTURE=path/to/collection.json (ignored in production).
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    const rows = JSON.parse(await readFile(process.env.COLLECTION_FIXTURE!, "utf8")) as RawRows;
    return { ...rows, snapshots: rows.snapshots ?? [], pops: rows.pops ?? [] };
  }
  const since = new Date(Date.now() - 13 * 7 * 86400_000).toISOString().slice(0, 10);
  const [cards, comps, ledger, assumptions, snapshots, pops] = await Promise.all([
    supabase.from("Card").select("*"),
    supabase.from("CardComp").select('"cardId", grade, price, method, source, "asOf"'),
    supabase.from("LedgerEntry").select('"cardId", kind, amount, "occurredOn", source'),
    supabase.from("Assumption").select("key, value"),
    supabase.from("CardValueSnapshot").select('"cardId", week, status, "valueNow", psa10, psa9, psa8, cost').gte("week", since),
    supabase.from("CardPop").select('"cardId", "asOf", total, gem10, pop9, "gemRate"'),
  ]);
  for (const r of [cards, comps, ledger, assumptions, snapshots, pops]) if (r.error) throw new Error(r.error.message);
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    cards: cards.data ?? [], comps: comps.data ?? [], ledger: ledger.data ?? [], assumptions: assumptions.data ?? [],
    pops: (pops.data ?? []).map((r) => ({ ...r, gemRate: num(r.gemRate) })),
    snapshots: (snapshots.data ?? []).map((r) => ({ ...r, valueNow: num(r.valueNow), psa10: num(r.psa10), psa9: num(r.psa9), psa8: num(r.psa8), cost: num(r.cost) })),
  } as RawRows;
}

/** Loads the collection and records this week's value snapshot (A5): only changed rows are written. */
export async function loadCollection(now: Date = new Date()): Promise<CollectionData> {
  const rows = await fetchRows();
  const cards = buildCollection(rows, now);
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

export function buildCollection(rows: RawRows, now: Date = new Date()): CollectionCard[] {
  const staleBefore = new Date(now.getTime() - STALE_DAYS * 86400_000).toISOString().slice(0, 10);
  const popBy = new Map<string, PopRow>();
  for (const { cardId, ...p } of rows.pops ?? []) if (!popBy.has(cardId) || popBy.get(cardId)!.asOf < p.asOf) popBy.set(cardId, p);
  const assumptions = Object.fromEntries(rows.assumptions.map((a) => [a.key, Number(a.value)]));
  const cfg = configFromAssumptions(assumptions);
  const snipeCfg = snipeConfigFromAssumptions(assumptions);

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
    const at = (grade: string) => vaultComp(comps.filter(isSaleComp), grade)?.price ?? null;

    const nowComp = vaultComp(comps, curGrade);
    const valueNow = nowComp?.price ?? null;
    const compAsOf = nowComp?.asOf ?? null;
    const cost = ledger.length ? ledger.reduce((s, l) => s + l.amount, 0) : null;
    const sales = { psa10: at("PSA 10"), psa9: at("PSA 9"), psa8: at("PSA 8"), raw: at("raw") };
    const v = valueCard({ status: card.status, item: card.item, cost, valueUsed: valueNow, comps: sales }, cfg);
    const pop = popBy.get(card.id) ?? null;
    // C5: same max bid as the Snipe board. Inputs follow the Vault value per grade (vaultComp rule; no band/multiple
    // estimates: no guesses). Pop rates when known, otherwise assumed rates.
    const maxBid = snipeMaxBid({
      ...maxBidInputs(comps),
      popTotal: pop?.total ?? null, pop9: pop?.pop9 ?? null, pop10: pop?.gem10 ?? null, printRun: null, ssp: false,
    }, snipeCfg);

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
      photoSourceFront: card.photoSourceFront ?? null,
      notes: card.notes,
      submissionId: card.submissionId,
      cost,
      valueNow,
      ...v,
      maxBid,
      comps: [...comps].sort(byRecency),
      compGrade: curGrade,
      compAsOf,
      stale: card.status !== "sealed" && (!compAsOf || compAsOf < staleBefore),
      pop,
      ledger,
    };
  });
}

export type NewComp = { cardId: string; grade: string; price: number; sampleSize: number; asOf: string };

/** A4: manual Card Ladder entry. Idempotent per (card, grade, source, date): re-saving the same day overwrites. */
export async function saveComps(rows: NewComp[]): Promise<number> {
  const recs = rows.map((r) => ({ ...r, method: "median", source: "cardladder_manual" }));
  if (fixtureMode()) {
    const { readFile, writeFile } = await import("node:fs/promises");
    const f = process.env.COLLECTION_FIXTURE!;
    const data = JSON.parse(await readFile(f, "utf8")) as RawRows;
    const key = (c: { cardId: string; grade: string; source: string; asOf: string }) => `${c.cardId}|${c.grade}|${c.source}|${c.asOf}`;
    const keys = new Set(recs.map(key));
    data.comps = [...data.comps.filter((c) => !keys.has(key(c))), ...recs];
    await writeFile(f, JSON.stringify(data));
    return recs.length;
  }
  const { error } = await supabase.from("CardComp").upsert(recs, { onConflict: "cardId,grade,source,asOf" });
  if (error) throw new Error(error.message);
  return recs.length;
}
