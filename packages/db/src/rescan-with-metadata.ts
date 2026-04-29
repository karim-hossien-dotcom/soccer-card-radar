import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EBAY_APP_ID = process.env.EBAY_APP_ID!;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID!;

let appToken: string | null = null;

async function getAppToken(): Promise<string> {
  if (appToken) return appToken;
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  const data = await res.json();
  appToken = data.access_token;
  return appToken!;
}

async function searchEbay(query: string, limit = 15) {
  const token = await getAppToken();
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

async function run() {
  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("id, player, setKeywords, parallelTerms")
    .eq("active", true);

  if (!entities) return;

  // Focus on high-value queries that capture buying options
  console.log(`Re-scanning ${entities.length} players for BIN/auction metadata...\n`);

  let apiCalls = 0;
  let updated = 0;
  let inserted = 0;

  for (const entity of entities) {
    const queries = [
      `${entity.player} auto card`,
      `${entity.player} /50 OR /25 OR /10 refractor card`,
    ];

    for (const query of queries) {
      if (apiCalls >= 100) break;

      const items = await searchEbay(query, 12);
      apiCalls++;

      for (const item of items) {
        const priceNum = parseFloat(item.price.value);
        const buyingOptions: string[] = item.buyingOptions ?? [];
        const isBIN = buyingOptions.includes("FIXED_PRICE");
        const isAuction = buyingOptions.includes("AUCTION");
        const acceptsOffers = buyingOptions.includes("BEST_OFFER");

        // Extract item end date if available
        const itemEndDate = item.itemEndDate ?? null;

        const rawData = {
          condition: item.condition,
          buyingOptions,
          isBIN,
          isAuction,
          acceptsOffers,
          itemEndDate,
          shippingCost: item.shippingOptions?.[0]?.shippingCost?.value ?? null,
        };

        // Check if exists
        const { data: existing } = await supabase
          .from("Listing")
          .select("id")
          .eq("platform", "ebay")
          .eq("externalId", item.itemId)
          .limit(1);

        if (existing && existing.length > 0) {
          // Update rawData with buying info
          await supabase
            .from("Listing")
            .update({
              rawData: rawData as unknown as Record<string, unknown>,
              priceUSD: priceNum,
              lastSeenAt: new Date().toISOString(),
            })
            .eq("id", existing[0].id);
          updated++;
        } else {
          await supabase.from("Listing").insert({
            platform: "ebay",
            externalId: item.itemId,
            url: item.itemWebUrl,
            title: item.title,
            priceUSD: priceNum,
            priceNative: priceNum,
            currency: item.price.currency,
            imageUrl: item.image?.imageUrl ?? null,
            sellerInfo: item.seller ? { username: item.seller.username, feedbackScore: item.seller.feedbackScore } : null,
            rawData: rawData as unknown as Record<string, unknown>,
          });
          inserted++;
        }
      }

      await new Promise((r) => setTimeout(r, 200));
    }

    if (apiCalls >= 100) break;
    console.log(`  ${entity.player} ✓`);
  }

  console.log(`\nDone: ${inserted} new, ${updated} updated with BIN/auction metadata, ${apiCalls} API calls`);
}

run();
