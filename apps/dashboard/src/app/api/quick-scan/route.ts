import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const EBAY_APP_ID = process.env.EBAY_APP_ID!;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID!;

let appToken: string | null = null;
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (appToken && Date.now() < tokenExpiry) return appToken;
  const creds = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  const data = await res.json();
  appToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return appToken!;
}

async function search(query: string, limit = 10) {
  const token = await getToken();
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "212");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fieldgroups", "MATCHING_ITEMS,EXTENDED");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.itemSummaries ?? [];
}

// Quick scan: top 8 urgent queries only (~15 seconds)
const urgentQueries = [
  "Santiago Castro auto Topps Merlin",
  "Geovany Quenda auto Topps Merlin",
  "Lennart Karl auto Topps Chrome",
  "Ethan Nwaneri auto Topps Chrome",
  "Nico Paz auto refractor rookie",
  "Kobbie Mainoo auto /50 Topps",
  "Lennart Karl rookie refractor",
  "Shea Lacey auto refractor rookie",
];

export async function GET() {
  const start = Date.now();

  let imported = 0;
  let apiCalls = 0;

  for (const q of urgentQueries) {
    const items = await search(q, 8);
    apiCalls++;

    for (const item of items) {
      const title = item.title ?? "";
      const tLower = title.toLowerCase();
      if (tLower.includes("leaf")) continue;
      if (tLower.includes(" lot ") || tLower.startsWith("lot ")) continue;

      const hasNum = tLower.match(/\/(\d+)\b/);
      const isValuable = (hasNum && parseInt(hasNum[1]) <= 99) ||
        tLower.includes("auto") || tLower.includes("ssp") || tLower.includes("case hit") ||
        tLower.includes("psa") || tLower.includes("1/1");
      if (!isValuable) continue;

      const price = parseFloat(item.price?.value ?? "0");
      const buyOpts: string[] = item.buyingOptions ?? [];

      const { data: existing } = await supabase
        .from("Listing").select("id").eq("platform", "ebay").eq("externalId", item.itemId).limit(1);

      if (existing && existing.length > 0) {
        await supabase.from("Listing").update({
          priceUSD: price, lastSeenAt: new Date().toISOString(),
          rawData: { buyingOptions: buyOpts, isBIN: buyOpts.includes("FIXED_PRICE"), isAuction: buyOpts.includes("AUCTION"), acceptsOffers: buyOpts.includes("BEST_OFFER"), itemEndDate: item.itemEndDate ?? null },
        }).eq("id", existing[0].id);
        continue;
      }

      const { error } = await supabase.from("Listing").insert({
        platform: "ebay", externalId: item.itemId, url: item.itemWebUrl,
        title, priceUSD: price, priceNative: price, currency: item.price?.currency ?? "USD",
        imageUrl: item.image?.imageUrl ?? null,
        sellerInfo: item.seller ? { username: item.seller.username, feedbackScore: item.seller.feedbackScore } : null,
        rawData: { buyingOptions: buyOpts, isBIN: buyOpts.includes("FIXED_PRICE"), isAuction: buyOpts.includes("AUCTION"), acceptsOffers: buyOpts.includes("BEST_OFFER"), itemEndDate: item.itemEndDate ?? null },
      });
      if (!error) imported++;
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  return NextResponse.json({
    status: "done",
    elapsed: `${elapsed}s`,
    apiCalls,
    newListings: imported,
    message: `Quick scan complete. ${imported} new cards found in ${elapsed}s. Refresh the page.`,
  });
}
