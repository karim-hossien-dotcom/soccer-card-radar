import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EBAY_APP_ID = process.env.EBAY_APP_ID!;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID!;

let appToken: string | null = null;
let tokenExpiresAt = 0;

async function getAppToken(): Promise<string> {
  if (appToken && Date.now() < tokenExpiresAt) return appToken;
  const credentials = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  const data = await res.json();
  appToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return appToken!;
}

async function searchEbay(query: string, limit = 12) {
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

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * GET /api/scan — full scan across all players
 * Searches eBay, imports new listings, scores matches, filters excludes.
 * Designed to be called by cron every 30 min.
 */
export async function GET() {
  const startTime = Date.now();

  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("*")
    .eq("active", true);

  if (!entities || entities.length === 0) {
    return NextResponse.json({ message: "No active entities" });
  }

  let apiCalls = 0;
  let imported = 0;
  let skipped = 0;
  let excluded = 0;

  for (const entity of entities) {
    if (apiCalls >= 150) break;

    const queries = [
      `${entity.player} auto card -leaf`,
      `${entity.player} /50 OR /25 OR /10 refractor -leaf`,
      `${entity.player} rookie RC card -leaf`,
    ];

    for (const query of queries) {
      if (apiCalls >= 150) break;

      const items = await searchEbay(query, 10);
      apiCalls++;

      for (const item of items) {
        const title = item.title ?? "";
        const titleLower = norm(title);

        // Check exclude terms
        if (entity.excludeTerms.some((t: string) => titleLower.includes(norm(t)))) {
          excluded++;
          continue;
        }

        const priceNum = parseFloat(item.price?.value ?? "0");
        const buyingOptions: string[] = item.buyingOptions ?? [];

        // Skip if exists
        const { data: existing } = await supabase
          .from("Listing")
          .select("id")
          .eq("platform", "ebay")
          .eq("externalId", item.itemId)
          .limit(1);

        if (existing && existing.length > 0) {
          // Update price + metadata
          await supabase.from("Listing").update({
            priceUSD: priceNum,
            lastSeenAt: new Date().toISOString(),
            rawData: {
              condition: item.condition,
              buyingOptions,
              isBIN: buyingOptions.includes("FIXED_PRICE"),
              isAuction: buyingOptions.includes("AUCTION"),
              acceptsOffers: buyingOptions.includes("BEST_OFFER"),
              itemEndDate: item.itemEndDate ?? null,
              shippingCost: item.shippingOptions?.[0]?.shippingCost?.value ?? null,
            },
          }).eq("id", existing[0].id);
          skipped++;
          continue;
        }

        const { error } = await supabase.from("Listing").insert({
          platform: "ebay",
          externalId: item.itemId,
          url: item.itemWebUrl,
          title,
          priceUSD: priceNum,
          priceNative: priceNum,
          currency: item.price?.currency ?? "USD",
          imageUrl: item.image?.imageUrl ?? null,
          sellerInfo: item.seller ? { username: item.seller.username, feedbackScore: item.seller.feedbackScore } : null,
          rawData: {
            condition: item.condition,
            buyingOptions,
            isBIN: buyingOptions.includes("FIXED_PRICE"),
            isAuction: buyingOptions.includes("AUCTION"),
            acceptsOffers: buyingOptions.includes("BEST_OFFER"),
            itemEndDate: item.itemEndDate ?? null,
            shippingCost: item.shippingOptions?.[0]?.shippingCost?.value ?? null,
          },
        });

        if (!error) imported++;
      }

      await new Promise((r) => setTimeout(r, 150));
    }
  }

  // Re-score all
  const { data: allListings } = await supabase.from("Listing").select("*");
  let matchCount = 0;

  if (allListings) {
    for (const listing of allListings) {
      for (const entity of entities) {
        const t = norm(listing.title);
        const p = norm(entity.player);
        const lastName = p.split(" ").pop() ?? "";

        if (!(t.includes(p) || (lastName.length >= 3 && t.includes(lastName)))) continue;
        if (entity.excludeTerms.some((et: string) => t.includes(norm(et)))) continue;

        let score = 0;
        const yearMatch = listing.title.match(/\b(20\d{2})(?:-\d{2})?\b/);
        const yearNum = yearMatch ? parseInt(yearMatch[1]) : null;
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
            reasons: {
              playerMatch: true,
              yearInRange: !!yearNum,
              setKeywordHit: entity.setKeywords.some((kw: string) => t.includes(norm(kw))),
              parallelTermHit: entity.parallelTerms.some((pt: string) => t.includes(norm(pt))),
              belowPriceCeiling: entity.priceCeilingUSD === null || listing.priceUSD <= entity.priceCeilingUSD,
              autographMatch: t.includes("auto"),
              excludeTermHit: false,
              isLot: false,
            },
          }, { onConflict: "listingId,entityId" });
          matchCount++;
        }
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    status: "ok",
    elapsed: `${elapsed}s`,
    apiCalls,
    imported,
    updated: skipped,
    excluded,
    matchesScored: matchCount,
    totalListings: allListings?.length ?? 0,
  });
}
