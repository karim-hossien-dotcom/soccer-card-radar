/**
 * C4: eBay won list -> Vault + snipe decisions. Pure functions; IO lives in the route.
 * Read-only towards eBay: GetMyeBayBuying only lists what was already bought.
 */
export type WonTx = { lineItemId: string; itemId: string; title: string; price: number; boughtAt: string; endedAt: string | null; auction: boolean };
export type BidRow = { externalId: string; targetId: string | null; status: string; maxBid: number; endsAt: string | null };
export type Plan = {
  bids: { externalId: string; status: "won" | "lost"; wonPrice: number | null }[];
  cards: { tx: WonTx; targetId: string | null }[];
};

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? null;
const unescape = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Every <Transaction> inside <WonList> (single-item and multi-item orders). */
export function parseWonList(xml: string): WonTx[] {
  const won = tag(xml, "WonList") ?? "";
  return [...won.matchAll(/<Transaction>([\s\S]*?)<\/Transaction>/g)].flatMap(([, t]) => {
    const itemId = tag(t, "ItemID");
    const price = Number(tag(t, "TotalTransactionPrice") ?? tag(t, "TransactionPrice"));
    if (!itemId || !(price > 0)) return [];
    return [{
      lineItemId: tag(t, "OrderLineItemID") ?? `${itemId}-${tag(t, "TransactionID") ?? ""}`,
      itemId,
      title: unescape(tag(t, "Title") ?? "").trim(),
      price,
      boughtAt: tag(t, "CreatedDate") ?? "",
      endedAt: tag(t, "EndTime"),
      auction: tag(t, "ListingType") === "Chinese",
    }];
  });
}

/** Browse API ids look like "v1|123456789012|0"; the won list uses the bare item id. */
export const itemIdOf = (externalId: string) => externalId.match(/\d{9,}/)?.[0] ?? externalId;

const LOST_AFTER_MS = 3 * 3600_000; // give eBay's won list a few hours to catch up before calling an approved bid lost

/**
 * What to write. `logged` = OrderLineItemIDs already in the ledger (re-runs add nothing);
 * purchases before `logFrom` are ignored (cards bought earlier are already in the Vault).
 */
export function plan(wins: WonTx[], bids: BidRow[], logged: Set<string>, logFrom: string, now = new Date()): Plan {
  const byItem = new Map(wins.map((w) => [w.itemId, w]));
  const out: Plan = { bids: [], cards: [] };
  for (const b of bids) {
    if (b.status !== "approved") continue;
    const w = byItem.get(itemIdOf(b.externalId));
    if (w) out.bids.push({ externalId: b.externalId, status: "won", wonPrice: w.price });
    else if (b.endsAt && now.getTime() - Date.parse(b.endsAt) > LOST_AFTER_MS) out.bids.push({ externalId: b.externalId, status: "lost", wonPrice: null });
  }
  const targetOf = new Map(bids.map((b) => [itemIdOf(b.externalId), b.targetId]));
  for (const w of wins) {
    if (logged.has(w.lineItemId) || !w.boughtAt || w.boughtAt < logFrom) continue;
    out.cards.push({ tx: w, targetId: targetOf.get(w.itemId) ?? null });
  }
  return out;
}

/** Vault fields read from the title: graded slabs keep grader and grade, everything else is raw. */
export function cardFromTitle(title: string): { status: "raw" | "graded"; grader: string | null; grade: string | null; year: string | null; printRun: number | null } {
  const g = title.match(/\b(PSA|BGS|SGC|CGC|CSG|TAG)\s*(10|\d(?:\.5)?)\b/i);
  const year = title.match(/\b(19|20)\d\d(?:[-/]\d{2,4})?\b/)?.[0] ?? null;
  const run = title.match(/(?:^|[^\d])\d{0,4}\s*\/\s*(\d{1,4})(?!\d)/)?.[1];
  return { status: g ? "graded" : "raw", grader: g ? g[1].toUpperCase() : null, grade: g ? g[2] : null, year, printRun: run && !(year && year.includes("/" + run)) ? Number(run) : null };
}
