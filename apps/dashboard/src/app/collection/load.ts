import { supabase } from "@soccer-card-radar/db";
import { valueCard, configFromAssumptions, maxBid, type CardStatus, type Decision } from "@soccer-card-radar/shared";

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
};

async function fetchRows(): Promise<RawRows> {
  // Local UAT without database access: COLLECTION_FIXTURE=path/to/collection.json (ignored in production).
  if (process.env.COLLECTION_FIXTURE && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(process.env.COLLECTION_FIXTURE, "utf8")) as RawRows;
  }
  const [cards, comps, ledger, assumptions] = await Promise.all([
    supabase.from("Card").select("*"),
    supabase.from("CardComp").select('"cardId", grade, price, method, source, "asOf"'),
    supabase.from("LedgerEntry").select('"cardId", kind, amount, "occurredOn", source'),
    supabase.from("Assumption").select("key, value"),
  ]);
  for (const r of [cards, comps, ledger, assumptions]) if (r.error) throw new Error(r.error.message);
  return { cards: cards.data ?? [], comps: comps.data ?? [], ledger: ledger.data ?? [], assumptions: assumptions.data ?? [] } as RawRows;
}

export async function loadCollection(): Promise<CollectionCard[]> {
  return buildCollection(await fetchRows());
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
