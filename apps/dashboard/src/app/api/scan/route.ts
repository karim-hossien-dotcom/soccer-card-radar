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

async function search(query: string): Promise<EbayItem[]> {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "212");
  url.searchParams.set("limit", "10");
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
 * POST /api/scan?max=N — refresh active eBay listings for every research action (S1).
 * Called daily by .github/workflows/scan.yml and by the masthead Scan button (max=25). ADMIN_TOKEN required.
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const max = Math.min(Math.max(Number(new URL(req.url).searchParams.get("max")) || 200, 1), 300);
  const started = Date.now();
  try {
    const r = await runScan(getResearchActions(), {
      search,
      save,
      keep: (t) => isQualityCard(t) || isVintageLegend(t),
      pause: () => new Promise((ok) => setTimeout(ok, 150)),
    }, max);
    return NextResponse.json({ status: "done", seconds: Math.round((Date.now() - started) / 1000), ...r });
  } catch (e) {
    return NextResponse.json({ status: "failed", error: (e as Error).message }, { status: 502 });
  }
}
