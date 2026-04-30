import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "../../research-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface SoldItem {
  title: string;
  price: number;
  date: string;
}

/**
 * Get sold prices via web search — searches for eBay sold listing prices.
 * More reliable than Playwright (eBay blocks headless browsers).
 */
async function getSoldPricesViaSearch(query: string): Promise<SoldItem[]> {
  // Use the eBay sold search URL format in a web search
  const searchQuery = `site:ebay.com "${query}" sold price`;

  try {
    // Search for recent eBay sold prices via Google
    const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=10`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!res.ok) return [];
    const html = await res.text();

    // Extract prices from search snippets — look for $XX.XX patterns
    const priceMatches = html.matchAll(/\$([\d,]+\.?\d{0,2})/g);
    const prices: number[] = [];
    for (const match of priceMatches) {
      const price = parseFloat(match[1].replace(/,/g, ""));
      // Filter reasonable card prices ($1 - $10,000)
      if (price >= 1 && price <= 10000) {
        prices.push(price);
      }
    }

    // Deduplicate and return as SoldItems
    const unique = [...new Set(prices)];
    return unique.slice(0, 10).map((p) => ({
      title: query,
      price: p,
      date: "recent",
    }));
  } catch {
    return [];
  }
}

function calcAvgSold(items: SoldItem[]): { avg: number; min: number; max: number; count: number } | null {
  if (items.length === 0) return null;
  const prices = items.map((i) => i.price);
  // Remove outliers if 4+ items
  const sorted = [...prices].sort((a, b) => a - b);
  const trimmed = sorted.length >= 4 ? sorted.slice(1, -1) : sorted;
  return {
    avg: Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: items.length,
  };
}

/**
 * GET /api/sold-prices — attempts to get sold prices via web search.
 * NOTE: Results are unreliable — Google snippets return noisy data.
 * The "Check Sold" link on each card is more accurate (manual check).
 * This endpoint exists as a best-effort supplement.
 */
export async function GET() {
  const startTime = Date.now();
  const actions = getResearchActions();

  const results: Record<string, { query: string; avg: number; min: number; max: number; count: number }> = {};
  let updatedListings = 0;

  for (const action of actions) {
    // Use the first search query per action for sold comps
    const query = action.searchQueries[0];

    const soldItems = await getSoldPricesViaSearch(query);
    const stats = calcAvgSold(soldItems);

    if (stats) {
      results[action.id] = { query, ...stats };

      // Update all listings for this action with the real sold data
      const { data: listings } = await supabase
        .from("Listing")
        .select("id, priceUSD")
        .eq("actionId", action.id);

      for (const listing of listings ?? []) {
        const pctBelow = Math.round(((stats.avg - listing.priceUSD) / stats.avg) * 100);
        await supabase
          .from("Listing")
          .update({
            avgSoldPrice: stats.avg,
            pctBelowMarket: pctBelow,
          })
          .eq("id", listing.id);
        updatedListings++;
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  return NextResponse.json({
    status: "done",
    elapsed: `${elapsed}s`,
    actionsScraped: Object.keys(results).length,
    updatedListings,
    soldData: results,
  });
}
