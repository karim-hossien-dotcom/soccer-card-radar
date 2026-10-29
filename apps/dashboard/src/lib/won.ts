/**
 * C4: eBay buyer orders -> Vault + snipe decisions. Pure functions; IO lives in the route.
 * Read-only towards eBay: GetOrders (OrderRole=Buyer) only lists what was already bought.
 */
export type OrderLine = {
  lineItemId: string; orderId: string; itemId: string; title: string;
  price: number; cost: number; boughtAt: string; paid: boolean; cancelled: boolean;
};
export type BidRow = { externalId: string; targetId: string | null; status: string; maxBid: number; endsAt: string | null };
export type Existing = { amount: number; occurredOn: string | null };
export type Plan = {
  bids: { externalId: string; status: "won" | "lost"; wonPrice: number | null }[];
  cards: { line: OrderLine; targetId: string | null }[];
  review: OrderLine[];
  matched: OrderLine[];
};

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? null;
const num = (s: string | null) => (s == null ? 0 : Number(s) || 0);
const unescape = (s: string) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const cents = (n: number) => Math.round(n * 100) / 100;

/** Every order line. cost = item + its shipping + its tax, the same landed cost the Vault records. */
export function parseOrders(xml: string): OrderLine[] {
  return [...xml.matchAll(/<Order>([\s\S]*?)<\/Order>/g)].flatMap(([, o]) => {
    const [head] = o.split("<TransactionArray>");
    const status = tag(head, "OrderStatus");
    const orderId = tag(head, "OrderID") ?? "";
    return [...o.matchAll(/<Transaction>([\s\S]*?)<\/Transaction>/g)].flatMap(([, t]) => {
      const itemId = tag(t, "ItemID");
      const price = num(tag(t, "TransactionPrice"));
      if (!itemId || !(price > 0)) return [];
      return [{
        lineItemId: tag(t, "OrderLineItemID") ?? `${itemId}-${tag(t, "TransactionID") ?? ""}`,
        orderId, itemId,
        title: unescape(tag(t, "Title") ?? "").trim(),
        price,
        cost: cents(price + num(tag(t, "ActualShippingCost")) + num(tag(t, "TotalTaxAmount"))),
        boughtAt: tag(t, "CreatedDate") ?? tag(head, "CreatedTime") ?? "",
        paid: status === "Completed",
        cancelled: status === "Cancelled" || status === "CancelPending" || status === "Inactive",
      }];
    });
  });
}

/** Browse API ids look like "v1|123456789012|0"; orders use the bare item id. */
export const itemIdOf = (externalId: string) => externalId.match(/\d{9,}/)?.[0] ?? externalId;

/** The Vault keeps New York dates. */
export const nyDate = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/** Cards and sealed card product only; the same eBay account also buys games, watches and so on. */
const CARD = /\b(topps|panini|futera|upper deck|donruss|prizm|psa|bgs|sgc|cgc|cards?)\b/i;
export const isCard = (title: string) => CARD.test(title);

const LOST_AFTER_MS = 3 * 3600_000; // give eBay a few hours to create the order before calling an approved bid lost
const DAY = 86_400_000;

/**
 * What to write.
 * - logged: OrderLineItemIDs already in the ledger (re-runs add nothing).
 * - existing: eBay purchases already in the Vault without a line id (workbook import / manual);
 *   a line with the same landed cost within 3 days is treated as already there.
 * - Paid lines from logFrom on are logged; older paid lines go to `review` for the owner to confirm.
 * - Non-card purchases are ignored.
 * - Unpaid lines wait (their tax and shipping are final once paid); cancelled lines are ignored.
 */
export function plan(lines: OrderLine[], bids: BidRow[], logged: Set<string>, existing: Existing[], logFrom: string, now = new Date()): Plan {
  const live = lines.filter((l) => !l.cancelled);
  const byItem = new Map(live.map((l) => [l.itemId, l]));
  const out: Plan = { bids: [], cards: [], review: [], matched: [] };
  for (const b of bids) {
    if (b.status !== "approved") continue;
    const l = byItem.get(itemIdOf(b.externalId));
    if (l) out.bids.push({ externalId: b.externalId, status: "won", wonPrice: l.price });
    else if (b.endsAt && now.getTime() - Date.parse(b.endsAt) > LOST_AFTER_MS) out.bids.push({ externalId: b.externalId, status: "lost", wonPrice: null });
  }
  const targetOf = new Map(bids.map((b) => [itemIdOf(b.externalId), b.targetId]));
  const pool = existing.filter((e) => e.occurredOn).map((e) => ({ ...e, used: false }));
  for (const l of live) {
    if (!l.paid || !l.boughtAt || logged.has(l.lineItemId) || !isCard(l.title)) continue;
    const day = Date.parse(nyDate(l.boughtAt));
    const hit = pool.find((e) => !e.used && Math.abs(e.amount - l.cost) < 0.01 && Math.abs(Date.parse(e.occurredOn!) - day) <= 3 * DAY);
    if (hit) { hit.used = true; out.matched.push(l); continue; }
    if (nyDate(l.boughtAt) >= logFrom) out.cards.push({ line: l, targetId: targetOf.get(l.itemId) ?? null });
    else out.review.push(l);
  }
  return out;
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const usable = (n: string) => !/[/()]/.test(n) && !/\b(box|lot|sealed|pack)\b/i.test(n);

/** Player from the title, using names already in the Vault: full name first, then a surname only one known player has. */
export function playerFromTitle(title: string, known: string[]): string | null {
  const t = ` ${fold(title)} `;
  const names = [...new Set(known.filter((n) => n && usable(n)))];
  const full = names.filter((n) => t.includes(` ${fold(n)} `)).sort((a, b) => b.length - a.length);
  if (full.length) return full[0];
  const sur = names.filter((n) => { const p = fold(n).split(" "); const s = p[p.length - 1]; return p.length > 1 && s.length >= 4 && t.includes(` ${s} `); });
  return sur.length === 1 ? sur[0] : null;
}

const SEALED = /\b(sealed|hanger|blaster|hobby box|booster box|mega box|cello|retail box|fat pack)\b/i;

/** Vault fields read from the title: sealed product, graded slab (grader + grade), or raw. */
export function cardFromTitle(title: string): { status: "raw" | "graded" | "sealed"; grader: string | null; grade: string | null; year: string | null; printRun: number | null } {
  const year = title.match(/\b(19|20)\d\d(?:[-/]\d{2,4})?\b/)?.[0] ?? null;
  if (SEALED.test(title)) return { status: "sealed", grader: null, grade: null, year, printRun: null };
  const g = title.match(/\b(PSA|BGS|SGC|CGC|CSG|TAG)\s*(10|\d(?:\.5)?)\b/i);
  const run = title.match(/(?:^|[^\d])\d{0,4}\s*\/\s*(\d{1,4})(?!\d)/)?.[1];
  return { status: g ? "graded" : "raw", grader: g ? g[1].toUpperCase() : null, grade: g ? g[2] : null, year, printRun: run && !(year && year.includes("/" + run)) ? Number(run) : null };
}
