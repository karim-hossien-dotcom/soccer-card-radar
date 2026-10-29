import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { requireAdmin } from "@/lib/admin";
import { parseOrders, plan, cardFromTitle, playerFromTitle, nyDate, type BidRow, type OrderLine } from "@/lib/won";
import { getResearchActions } from "@/app/research-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Day after the last eBay purchase in the Vault (workbook import, 2026-10-15). Paid purchases from here on are logged
 *  automatically; older ones not in the Vault need the owner's confirmation (POST ?import=). */
const LOG_FROM = "2026-10-16";

/** eBay Trading API GetOrders as buyer, all pages. Reads only. eBay allows up to 90 days back. */
async function orders(days: number): Promise<OrderLine[]> {
  const token = process.env.EBAY_USER_TOKEN;
  if (!token) throw new Error("EBAY_USER_TOKEN is not set");
  const to = new Date(), from = new Date(to.getTime() - days * 86_400_000);
  const lines: OrderLine[] = [];
  for (let page = 1; page <= 10; page++) {
    const body = `<?xml version="1.0" encoding="utf-8"?><GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents"><RequesterCredentials><eBayAuthToken>${token}</eBayAuthToken></RequesterCredentials><OrderRole>Buyer</OrderRole><CreateTimeFrom>${from.toISOString()}</CreateTimeFrom><CreateTimeTo>${to.toISOString()}</CreateTimeTo><Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination></GetOrdersRequest>`;
    const res = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST", body,
      headers: { "Content-Type": "text/xml", "X-EBAY-API-COMPATIBILITY-LEVEL": "1349", "X-EBAY-API-CALL-NAME": "GetOrders", "X-EBAY-API-SITEID": "0" },
    });
    const xml = await res.text();
    const ack = xml.match(/<Ack>(\w+)<\/Ack>/)?.[1];
    if (!res.ok || (ack !== "Success" && ack !== "Warning")) throw new Error(`eBay GetOrders failed: ${xml.match(/<ShortMessage>(.*?)<\/ShortMessage>/)?.[1] ?? res.status}`);
    lines.push(...parseOrders(xml));
    if (page >= Number(xml.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/)?.[1] ?? 1)) break;
  }
  return lines;
}

type Mode = { write: boolean; days: number; importIds?: Set<string> };

async function run({ write, days, importIds }: Mode) {
  const lines = await orders(days);
  const [b, l, t, c] = await Promise.all([
    supabase.from("SnipeBid").select('"externalId", "targetId", status, "maxBid", "endsAt"').eq("status", "approved"),
    supabase.from("LedgerEntry").select('ref, amount, "occurredOn"').eq("source", "ebay").eq("kind", "purchase"),
    supabase.from("SnipeTarget").select('id, "actionId"'),
    supabase.from("Card").select("player"),
  ]);
  for (const r of [b, l, t, c]) if (r.error) throw new Error(r.error.message);
  const ledger = l.data ?? [];
  const lineRef = /^\d+-\d+$/;
  const p = plan(
    lines,
    (b.data ?? []).map((x) => ({ ...x, maxBid: Number(x.maxBid) })) as BidRow[],
    new Set(ledger.map((x) => x.ref as string)),
    ledger.filter((x) => !lineRef.test(String(x.ref ?? ""))).map((x) => ({ amount: Number(x.amount), occurredOn: x.occurredOn as string | null })),
    LOG_FROM,
  );
  const actionPlayer = new Map(getResearchActions().map((a) => [a.id, a.player]));
  const targetPlayer = new Map((t.data ?? []).map((x) => [x.id, actionPlayer.get(x.actionId) ?? null]));
  const known = [...(c.data ?? []).map((x) => x.player as string), ...targetPlayer.values()].filter(Boolean) as string[];

  const describe = (line: OrderLine, targetId: string | null = null) => {
    const f = cardFromTitle(line.title);
    const player = f.status === "sealed" ? "Sealed box" : (targetId ? targetPlayer.get(targetId) : null) ?? playerFromTitle(line.title, known);
    return { line, targetId, f, player };
  };
  // Backfill import: only lines that are in the review list right now (paid, not already in the Vault).
  const toWrite = importIds ? p.review.filter((r) => importIds.has(r.lineItemId)).map((r) => describe(r)) : p.cards.map((x) => describe(x.line, x.targetId));

  if (write) {
    if (!importIds) for (const u of p.bids) {
      const r = await supabase.from("SnipeBid").update({ status: u.status, wonPrice: u.wonPrice, updatedAt: new Date().toISOString() }).eq("externalId", u.externalId);
      if (r.error) throw new Error(r.error.message);
    }
    for (const { line, targetId, f, player } of toWrite) {
      const card = await supabase.from("Card").insert({
        status: f.status, item: line.title, player, year: f.year, printRun: f.printRun,
        grader: f.grader, grade: f.grade, qty: 1, dateAdded: nyDate(line.boughtAt),
        notes: `Added from eBay order ${line.orderId}, item ${line.itemId}${targetId ? " (snipe board)" : ""}. Cost = price + shipping + tax.`,
      }).select("id").single();
      if (card.error) throw new Error(card.error.message);
      const led = await supabase.from("LedgerEntry").insert({ cardId: card.data.id, kind: "purchase", amount: line.cost, occurredOn: nyDate(line.boughtAt), source: "ebay", ref: line.lineItemId });
      if (led.error) throw new Error(led.error.message);
    }
  }
  const row = (x: ReturnType<typeof describe>) => ({ lineItemId: x.line.lineItemId, date: nyDate(x.line.boughtAt), cost: x.line.cost, player: x.player, status: x.f.status, title: x.line.title, fromBoard: !!x.targetId });
  return {
    status: write ? "done" : "dry-run", days, orderLines: lines.length,
    bids: importIds ? [] : p.bids,
    [importIds ? "imported" : "newCards"]: toWrite.map(row),
    alreadyInVault: p.matched.length,
    needsReview: importIds ? undefined : p.review.map((r) => row(describe(r))),
  };
}

const fail = (e: unknown) => NextResponse.json({ status: "failed", error: (e as Error).message }, { status: 502 });

/** GET: daily Vercel cron (Bearer CRON_SECRET). Last 30 days; logs new paid purchases, closes snipe bids. */
export async function GET(req: Request) {
  const want = process.env.CRON_SECRET;
  if (!want || req.headers.get("authorization") !== `Bearer ${want}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await run({ write: true, days: 30 })); } catch (e) { return fail(e); }
}

/**
 * POST (admin token):
 *   ?dry=1           preview, 90 days: new cards, bid updates, and older purchases not in the Vault (needsReview)
 *   ?import=id,id    add those needsReview lines (OrderLineItemIDs) to the Vault; nothing else is written
 *   (no params)      same as the cron
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  const ids = q.get("import");
  try {
    if (ids) return NextResponse.json(await run({ write: true, days: 90, importIds: new Set(ids.split(",").map((s) => s.trim()).filter(Boolean)) }));
    return NextResponse.json(await run({ write: q.get("dry") !== "1", days: q.get("dry") === "1" ? 90 : 30 }));
  } catch (e) { return fail(e); }
}
