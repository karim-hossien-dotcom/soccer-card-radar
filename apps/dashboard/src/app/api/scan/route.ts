import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "../../research-engine";
import { isQualityCard, isVintageLegend } from "../../card-filter";
import { requireAdmin } from "@/lib/admin";
import { runScan, type EbayItem, type ListingRow } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

let appToken: { token: string; expiresAt: number } | null = null;

/** eBay client-credentials token (Browse API, public scope), cached until 5 min before expiry. */
async function ebayToken(): Promise<string> {
  if (appToken && Date.now() < appToken.expiresAt) return appToken.token;
  const appId = process.env.EBAY_APP_ID, certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) throw new Error("EBAY_APP_ID and EBAY_CERT_ID are required");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${appId}:${certId}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  if (!res.ok) throw new Error(`eBay token failed (${res.status})`);
  const d = (await res.json()) as { access_token: string; expires_in: number };
  appToken = { token: d.access_token, expiresAt: Date.now() + (d.expires_in - 300) * 1000 };
  return d.access_token;
}

/** auction=true: C2 pass, auctions ending in the next 24h, soonest first (as eBay support recommended). */
async function search(query: string, auction = false): Promise<EbayItem[]> {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "212");
  url.searchParams.set("limit", auction ? "50" : "10");
  if (auction) {
    const now = new Date(), end = new Date(now.getTime() + 24 * 3600_000);
    url.searchParams.set("filter", `buyingOptions:{AUCTION},itemEndDate:[${now.toISOString()}..${end.toISOString()}]`);
    url.searchParams.set("sort", "endingSoonest");
  }
  url.searchParams.set("fieldgroups", "MATCHING_ITEMS,EXTENDED");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await ebayToken()}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" } });
  if (!res.ok) return [];
  return ((await res.json()) as { itemSummaries?: EbayItem[] }).itemSummaries ?? [];
}

async function save(rows: ListingRow[]): Promise<number> {
  const ids = rows.map((r) => r.externalId);
  const existing = await supabase.from("Listing").select('"externalId"').eq("platform", "ebay").in("externalId", ids);
  if (existing.error) throw new Error(existing.error.message);
  const { error } = await supabase.from("Listing").upsert(rows as never, { onConflict: "platform,externalId" });
  if (error) throw new Error(error.message);
  return ids.length - (existing.data?.length ?? 0);
}

/**
 * GET /api/scan — daily Vercel cron (vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const want = process.env.CRON_SECRET;
  if (!want || req.headers.get("authorization") !== `Bearer ${want}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return scan(200);
}

/**
 * POST /api/scan?max=N — refresh active eBay listings for every research action (S1).
 * Called by the masthead Scan button (max=25). ADMIN_TOKEN required.
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return scan(Math.min(Math.max(Number(new URL(req.url).searchParams.get("max")) || 200, 1), 300));
}

async function scan(max: number) {
  const started = Date.now();
  try {
    // C1: snipe targets first, so the exact cards on the board get live auctions even when the call cap bites.
    const actions = getResearchActions();
    const byId = new Map(actions.map((a) => [a.id, a]));
    const { data: targets } = await supabase.from("SnipeTarget").select('"actionId", query').eq("active", true);
    const targetActions = (targets ?? []).flatMap((t) => {
      const a = byId.get(t.actionId);
      return a ? [{ ...a, searchQueries: [t.query] }] : [];
    });
    const deps = {
      search: (q: string) => search(q),
      save,
      keep: (t: string) => isQualityCard(t) || isVintageLegend(t),
      pause: () => new Promise<void>((ok) => setTimeout(ok, 150)),
    };
    // C2: auction pass for the snipe targets first, then the general sweep with what is left of the cap.
    const auctions = await runScan(targetActions, { ...deps, search: (q) => search(q, true) }, max);
    const r = await runScan([...targetActions, ...actions], deps, Math.max(max - auctions.apiCalls, 0));
    return NextResponse.json({ status: "done", seconds: Math.round((Date.now() - started) / 1000), auctions, ...r });
  } catch (e) {
    return NextResponse.json({ status: "failed", error: (e as Error).message }, { status: 502 });
  }
}
