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
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  const data = await res.json();
  appToken = data.access_token;
  return appToken!;
}

interface EbayItem {
  itemId: string;
  title: string;
  price: { value: string; currency: string };
  image?: { imageUrl: string };
  itemWebUrl: string;
  seller?: { username: string; feedbackPercentage: string; feedbackScore: number };
  condition?: string;
}

async function searchEbay(query: string, limit = 10): Promise<EbayItem[]> {
  const token = await getAppToken();
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "212");
  url.searchParams.set("limit", String(limit));

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

async function run() {
  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("id, player, setKeywords, parallelTerms")
    .eq("active", true);

  if (!entities) { console.error("No entities"); return; }

  console.log(`Scanning ${entities.length} players on eBay...\n`);

  let totalImported = 0;
  let totalSkipped = 0;
  let apiCalls = 0;

  for (const entity of entities) {
    // Generate 3 targeted queries per player
    const queries = [
      `${entity.player} ${entity.setKeywords[0] ?? "card"} auto`,
      `${entity.player} /50 OR /25 OR /10 refractor`,
      `${entity.player} rookie RC card`,
    ];

    for (const query of queries) {
      if (apiCalls >= 150) {
        console.log("\n⚠ Stopping at 150 API calls to conserve quota");
        break;
      }

      const items = await searchEbay(query, 8);
      apiCalls++;

      for (const item of items) {
        const priceNum = parseFloat(item.price.value);

        // Skip if already exists
        const { data: existing } = await supabase
          .from("Listing")
          .select("id")
          .eq("platform", "ebay")
          .eq("externalId", item.itemId)
          .limit(1);

        if (existing && existing.length > 0) {
          totalSkipped++;
          continue;
        }

        const { error } = await supabase.from("Listing").insert({
          platform: "ebay",
          externalId: item.itemId,
          url: item.itemWebUrl,
          title: item.title,
          priceUSD: priceNum,
          priceNative: priceNum,
          currency: item.price.currency,
          imageUrl: item.image?.imageUrl ?? null,
          sellerInfo: item.seller ? {
            username: item.seller.username,
            feedbackScore: item.seller.feedbackScore,
          } : null,
          rawData: { condition: item.condition } as Record<string, unknown>,
        });

        if (!error) totalImported++;
      }

      // Small delay to be nice
      await new Promise((r) => setTimeout(r, 200));
    }

    if (apiCalls >= 150) break;
    console.log(`  ${entity.player}: scanned (${apiCalls} API calls used)`);
  }

  console.log(`\nDone: ${totalImported} new listings imported, ${totalSkipped} duplicates skipped, ${apiCalls} API calls used`);

  // Now run the matcher on all new listings
  console.log("\nRunning matcher on all listings...");

  const { data: allListings } = await supabase.from("Listing").select("*");
  const { data: allEntities } = await supabase.from("TrackedEntity").select("*").eq("active", true);

  if (!allListings || !allEntities) return;

  function norm(s: string): string { return s.toLowerCase().replace(/\s+/g, " ").trim(); }
  function playerMatches(title: string, player: string): boolean {
    const t = norm(title);
    const p = norm(player);
    if (t.includes(p)) return true;
    const parts = p.split(" ");
    const last = parts[parts.length - 1];
    return last.length >= 3 && t.includes(last);
  }

  let matchCount = 0;
  for (const listing of allListings) {
    for (const entity of allEntities) {
      if (!playerMatches(listing.title, entity.player)) continue;
      if (entity.excludeTerms.some((t: string) => norm(listing.title).includes(norm(t)))) continue;

      const t = norm(listing.title);
      let score = 0;
      const year = listing.title.match(/\b(20\d{2})(?:-\d{2})?\b/);
      const yearNum = year ? parseInt(year[1]) : null;
      if (yearNum && entity.yearMin && entity.yearMax && yearNum >= entity.yearMin && yearNum <= entity.yearMax) score += 25;
      if (entity.setKeywords.some((kw: string) => t.includes(norm(kw)))) score += 25;
      if (entity.parallelTerms.some((pt: string) => t.includes(norm(pt)))) score += 20;
      if (entity.priceCeilingUSD === null || listing.priceUSD <= entity.priceCeilingUSD) score += 15;
      if (t.includes("auto")) score += 15;

      if (score > 0) {
        await supabase.from("MatchScore").upsert({
          listingId: listing.id,
          entityId: entity.id,
          score,
          reasons: { playerMatch: true, yearInRange: !!yearNum, setKeywordHit: entity.setKeywords.some((kw: string) => t.includes(norm(kw))), parallelTermHit: entity.parallelTerms.some((pt: string) => t.includes(norm(pt))), belowPriceCeiling: entity.priceCeilingUSD === null || listing.priceUSD <= entity.priceCeilingUSD, autographMatch: t.includes("auto"), excludeTermHit: false, isLot: false },
        }, { onConflict: "listingId,entityId" });
        matchCount++;
      }
    }
  }

  console.log(`Matcher: ${matchCount} total matches scored`);
}

run();
