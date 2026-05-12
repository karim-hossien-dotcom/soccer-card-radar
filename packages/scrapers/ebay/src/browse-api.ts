/**
 * eBay Browse API — search_by_keyword endpoint.
 * Returns normalized listings for soccer card queries.
 */

import type { NormalizedListing, ScraperSearchParams } from "@soccer-card-radar/shared";
import { getAppToken } from "./auth";
import { checkRateLimit, recordCall } from "./rate-limiter";

const BROWSE_API_BASE = "https://api.ebay.com/buy/browse/v1";
const RATE_LIMIT_BUCKET = "ebay_browse";
const DAILY_LIMIT = 5000;

interface BrowseSearchResponse {
  href: string;
  total: number;
  next?: string;
  limit: number;
  offset: number;
  itemSummaries?: BrowseItemSummary[];
}

interface BrowseItemSummary {
  itemId: string;
  title: string;
  price: {
    value: string;
    currency: string;
  };
  image?: { imageUrl: string };
  itemWebUrl: string;
  seller?: {
    username: string;
    feedbackPercentage: string;
    feedbackScore: number;
  };
  condition?: string;
  itemLocation?: { country: string };
}

function buildSearchUrl(params: ScraperSearchParams): string {
  const url = new URL(`${BROWSE_API_BASE}/item_summary/search`);
  url.searchParams.set("q", params.query);
  url.searchParams.set("category_ids", "212"); // Sports Trading Cards
  url.searchParams.set("limit", String(params.limit ?? 50));

  const filters: string[] = [];
  if (params.minPrice != null) {
    filters.push(`price:[${params.minPrice}..],priceCurrency:USD`);
  }
  if (params.maxPrice != null) {
    filters.push(`price:[..${params.maxPrice}],priceCurrency:USD`);
  }

  if (filters.length > 0) {
    url.searchParams.set("filter", filters.join(","));
  }

  return url.toString();
}

function normalizeItem(item: BrowseItemSummary): NormalizedListing {
  const priceNum = parseFloat(item.price.value);
  return {
    platform: "ebay",
    externalId: item.itemId,
    url: item.itemWebUrl,
    title: item.title,
    priceNative: priceNum,
    currency: item.price.currency,
    priceUSD: item.price.currency === "USD" ? priceNum : priceNum, // TODO: convert non-USD
    imageUrl: item.image?.imageUrl ?? null,
    sellerInfo: item.seller
      ? {
          username: item.seller.username,
          feedbackPercentage: item.seller.feedbackPercentage,
          feedbackScore: item.seller.feedbackScore,
        }
      : null,
    rawData: item as unknown as Record<string, unknown>,
  };
}

export async function searchListings(
  params: ScraperSearchParams
): Promise<NormalizedListing[]> {
  const { allowed, remaining } = checkRateLimit(RATE_LIMIT_BUCKET, DAILY_LIMIT);
  if (!allowed) {
    throw new Error(
      `eBay Browse API daily rate limit reached (${DAILY_LIMIT}/day). Resets at midnight UTC.`
    );
  }

  const token = await getAppToken();
  const url = buildSearchUrl(params);

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      "Content-Type": "application/json",
    },
  });

  recordCall(RATE_LIMIT_BUCKET);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay Browse API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as BrowseSearchResponse;

  if (!data.itemSummaries || data.itemSummaries.length === 0) {
    return [];
  }

  console.log(
    `eBay Browse: "${params.query}" → ${data.itemSummaries.length}/${data.total} results (${remaining - 1} API calls remaining today)`
  );

  return data.itemSummaries.map(normalizeItem);
}
