import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { requireAdmin } from "@/lib/admin";
import { parseWonList, plan, cardFromTitle, type BidRow } from "@/lib/won";
import { getResearchActions } from "@/app/research-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Purchases before this date are already in the Vault (workbook import); C4 logs from go-live on. */
const LOG_FROM = "2026-10-29";

/** eBay Trading API GetMyeBayBuying, WonList, last 30 days, all pages. Reads only. */
async function wonListXml(): Promise<string[]> {
  const token = process.env.EBAY_USER_TOKEN;
  if (!token) throw new Error("EBAY_USER_TOKEN is not set");
  const pages: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const body = `<?xml version="1.0" encoding="utf-8"?><GetMyeBayBuyingRequest xmlns="urn:ebay:apis:eBLBaseComponents"><RequesterCredentials><eBayAuthToken>${token}</eBayAuthToken></RequesterCredentials><WonList><Include>true</Include><DurationInDays>30</DurationInDays><Pagination><EntriesPerPage>100</EntriesPerPage><PageNumber>${page}</PageNumber></Pagination></WonList></GetMyeBayBuyingRequest>`;
    const res = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST", body,
      headers: { "Content-Type": "text/xml", "X-EBAY-API-COMPATIBILITY-LEVEL": "1349", "X-EBAY-API-CALL-NAME": "GetMyeBayBuying", "X-EBAY-API-SITEID": "0" },
    });
    const xml = await res.text();
    const ack = xml.match(/<Ack>(\w+)<\/Ack>/)?.[1];
    if (!res.ok || (ack !== "Success" && ack !== "Warning")) throw new Error(`eBay GetMyeBayBuying failed: ${xml.match(/<ShortMessage>(.*?)<\/ShortMessage>/)?.[1] ?? res.status}`);
    pages.push(xml);
    const total = Number(xml.match(/<WonList>[\s\S]*?<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/)?.[1] ?? 1);
    if (page >= total) break;
  }
  return pages;
}

async function run(dry: boolean) {
  const wins = (await wonListXml()).flatMap(parseWonList);
  const [b, l, t] = await Promise.all([
    supabase.from("SnipeBid").select('"externalId", "targetId", status, "maxBid", "endsAt"').eq("status", "approved"),
    supabase.from("LedgerEntry").select("ref").eq("source", "ebay").eq("kind", "purchase").in("ref", wins.map((w) => w.lineItemId).concat("-")),
    supabase.from("SnipeTarget").select('id, "actionId"'),
  ]);
  for (const r of [b, l, t]) if (r.error) throw new Error(r.error.message);
  const p = plan(wins, (b.data ?? []).map((x) => ({ ...x, maxBid: Number(x.maxBid) })) as BidRow[], new Set((l.data ?? []).map((x) => x.ref as string)), LOG_FROM);
  const player = new Map(getResearchActions().map((a) => [a.id, a.player]));
  const targetPlayer = new Map((t.data ?? []).map((x) => [x.id, player.get(x.actionId) ?? null]));

  if (!dry) {
    for (const u of p.bids) {
      const r = await supabase.from("SnipeBid").update({ status: u.status, wonPrice: u.wonPrice, updatedAt: new Date().toISOString() }).eq("externalId", u.externalId);
      if (r.error) throw new Error(r.error.message);
    }
    for (const { tx, targetId } of p.cards) {
      const f = cardFromTitle(tx.title);
      const card = await supabase.from("Card").insert({
        status: f.status, item: tx.title, player: targetId ? targetPlayer.get(targetId) ?? null : null, year: f.year, printRun: f.printRun,
        grader: f.grader, grade: f.grade, qty: 1, dateAdded: tx.boughtAt.slice(0, 10),
        notes: `Added from eBay ${tx.auction ? "auction win" : "purchase"} ${tx.itemId}${targetId ? " (snipe board)" : ""}`,
      }).select("id").single();
      if (card.error) throw new Error(card.error.message);
      const led = await supabase.from("LedgerEntry").insert({ cardId: card.data.id, kind: "purchase", amount: tx.price, occurredOn: tx.boughtAt.slice(0, 10), source: "ebay", ref: tx.lineItemId });
      if (led.error) throw new Error(led.error.message);
    }
  }
  return {
    status: dry ? "dry-run" : "done", wonListed: wins.length,
    bids: p.bids, newCards: p.cards.map(({ tx, targetId }) => ({ itemId: tx.itemId, title: tx.title, price: tx.price, boughtAt: tx.boughtAt, fromBoard: !!targetId })),
  };
}

/** GET: daily Vercel cron (Bearer CRON_SECRET). */
export async function GET(req: Request) {
  const want = process.env.CRON_SECRET;
  if (!want || req.headers.get("authorization") !== `Bearer ${want}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await run(false)); } catch (e) { return NextResponse.json({ status: "failed", error: (e as Error).message }, { status: 502 }); }
}

/** POST ?dry=1: by hand with the admin token; dry-run shows what would be written. */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try { return NextResponse.json(await run(dry)); } catch (e) { return NextResponse.json({ status: "failed", error: (e as Error).message }, { status: 502 }); }
}
