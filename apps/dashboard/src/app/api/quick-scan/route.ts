import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "../../research-engine";
import { isQualityCard, isVintageLegend } from "../../card-filter";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── eBay OAuth (inlined from packages/scrapers/ebay/src/auth.ts) ─────────────

interface AppTokenCache {
  token: string;
  expiresAt: number;
}

let appTokenCache: AppTokenCache | null = null;

async function getEbayAppToken(): Promise<string> {
  if (appTokenCache && Date.now() < appTokenCache.expiresAt) {
    return appTokenCache.token;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error("EBAY_APP_ID and EBAY_CERT_ID are required");
  }

  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay app token failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };

  return data.access_token;
}

// ─── eBay Browse API search ───────────────────────────────────────────────────

async function searchEbay(query: string, limit = 10): Promise<unknown[]> {
  const token = await getEbayAppToken();
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "212");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fieldgroups", "MATCHING_ITEMS,EXTENDED");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.itemSummaries ?? [];
}

// ─── Delay helper ─────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Quick scan endpoint ──────────────────────────────────────────────────────

/**
 * GET /api/quick-scan — fast scan of the top 5 BUY-signal research actions.
 * Same logic as /api/scan but limited to first 5 actions and 25 API calls.
 * Designed to complete in <20 seconds via the dashboard "Scan Now" button.
 */
export async function GET() {
  const startTime = Date.now();

  // Only the first 5 actions (highest-urgency BUY signals)
  const actions = getResearchActions().slice(0, 5);

  let apiCalls = 0;
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const action of actions) {
    if (apiCalls >= 25) break;

    for (const searchQuery of action.searchQueries) {
      if (apiCalls >= 25) break;

      const items = await searchEbay(searchQuery, 10);
      apiCalls++;

      for (const item of items as Record<string, unknown>[]) {
        const title = (item.title as string) ?? "";

        // Quality gate — must pass isQualityCard OR be a vintage legend
        if (!isQualityCard(title) && !isVintageLegend(title)) {
          skipped++;
          continue;
        }

        const priceValue = (item.price as Record<string, unknown>)?.value;
        const priceNum = parseFloat((priceValue as string) ?? "0");
        const priceCurrency =
          ((item.price as Record<string, unknown>)?.currency as string) ?? "USD";
        const buyingOptions: string[] = (item.buyingOptions as string[]) ?? [];
        const imageUrl =
          ((item.image as Record<string, unknown>)?.imageUrl as string) ?? null;
        const seller = item.seller as Record<string, unknown> | null;
        const itemId = item.itemId as string;

        const rawData = {
          condition: (item.condition as string) ?? null,
          buyingOptions,
          isBIN: buyingOptions.includes("FIXED_PRICE"),
          isAuction: buyingOptions.includes("AUCTION"),
          acceptsOffers: buyingOptions.includes("BEST_OFFER"),
          itemEndDate: (item.itemEndDate as string) ?? null,
          shippingCost:
            (
              (
                (item.shippingOptions as Record<string, unknown>[])?.[0]
                  ?.shippingCost as Record<string, unknown>
              )?.value as string
            ) ?? null,
        };

        // Check if listing already exists
        const { data: existing } = await supabase
          .from("Listing")
          .select("id")
          .eq("platform", "ebay")
          .eq("externalId", itemId)
          .limit(1);

        if (existing && existing.length > 0) {
          // Update price, metadata, actionId, and lane
          await supabase
            .from("Listing")
            .update({
              priceUSD: priceNum,
              lastSeenAt: new Date().toISOString(),
              actionId: action.id,
              lane: action.lane,
              rawData,
            })
            .eq("id", existing[0].id);
          updated++;
          continue;
        }

        // Insert new listing
        const { error } = await supabase.from("Listing").insert({
          platform: "ebay",
          externalId: itemId,
          url: (item.itemWebUrl as string) ?? "",
          title,
          priceUSD: priceNum,
          priceNative: priceNum,
          currency: priceCurrency,
          imageUrl,
          sellerInfo: seller
            ? {
                username: seller.username,
                feedbackScore: seller.feedbackScore,
              }
            : null,
          rawData,
          actionId: action.id,
          lane: action.lane,
          avgSoldPrice: null,
          pctBelowMarket: null,
        });

        if (!error) {
          imported++;
        }
      }

      // Rate limiting: 150ms between API calls
      await delay(150);
    }
  }

  const { count: totalListings } = await supabase
    .from("Listing")
    .select("*", { count: "exact", head: true });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    status: "done",
    elapsed: `${elapsed}s`,
    apiCalls,
    imported,
    updated,
    skipped,
    totalListings: totalListings ?? 0,
  });
}
