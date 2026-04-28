/**
 * Mercari US search scraper.
 * Uses Playwright headless browser to bypass Cloudflare.
 * Extracts from __NEXT_DATA__ once page loads.
 */

import type { NormalizedListing, ScraperSearchParams } from "@soccer-card-radar/shared";

const MERCARI_SEARCH_URL = "https://www.mercari.com/search/";

interface MercariSearchItem {
  id: string;
  name: string;
  price: number;
  status: string;
  thumbnails: string[];
  sellerId?: string;
  sellerName?: string;
}

function buildSearchUrl(params: ScraperSearchParams): string {
  const url = new URL(MERCARI_SEARCH_URL);
  url.searchParams.set("keyword", params.query);
  url.searchParams.set("categoryId", "767"); // Trading Cards
  url.searchParams.set("itemStatuses", "ON_SALE");
  url.searchParams.set("sortBy", "SORT_BY_CREATED_TIME");

  if (params.minPrice != null) {
    url.searchParams.set("minPrice", String(params.minPrice));
  }
  if (params.maxPrice != null) {
    url.searchParams.set("maxPrice", String(params.maxPrice));
  }

  return url.toString();
}

/**
 * Extract listing data from __NEXT_DATA__ script tag.
 */
function extractFromNextData(html: string): MercariSearchItem[] {
  const nextDataMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!nextDataMatch) return [];

  try {
    const nextData = JSON.parse(nextDataMatch[1]);
    const pageProps = nextData?.props?.pageProps;
    if (!pageProps) return [];

    const items =
      pageProps?.searchResults?.items ??
      pageProps?.data?.search?.itemsList ??
      pageProps?.itemsList ??
      findItemsRecursive(pageProps);

    if (!Array.isArray(items)) return [];

    return items.map((item: Record<string, unknown>) => ({
      id: String(item.id ?? item.itemId ?? ""),
      name: String(item.name ?? item.itemName ?? item.title ?? ""),
      price: Number(item.price ?? item.itemPrice ?? 0),
      status: String(item.status ?? item.itemStatus ?? "ON_SALE"),
      thumbnails: Array.isArray(item.thumbnails)
        ? item.thumbnails.map(String)
        : item.thumbnail
          ? [String(item.thumbnail)]
          : [],
      sellerId: item.sellerId ? String(item.sellerId) : undefined,
      sellerName: item.sellerName ? String(item.sellerName) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Fallback: extract from product cards in the DOM.
 */
function extractFromDom(html: string): MercariSearchItem[] {
  const items: MercariSearchItem[] = [];

  // Mercari renders product cards with data attributes or structured elements
  // Look for item links with /item/ pattern
  const itemLinkRegex = /href="\/us\/item\/([^/"]+)\/"[^>]*>[\s\S]*?<\/a>/g;
  const priceRegex = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const titleRegex = /aria-label="([^"]+)"/g;

  // Simpler approach: look for JSON-LD product data
  const ldJsonRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let ldMatch: RegExpExecArray | null;

  while ((ldMatch = ldJsonRegex.exec(html)) !== null) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      if (ld["@type"] === "ItemList" && Array.isArray(ld.itemListElement)) {
        for (const elem of ld.itemListElement) {
          const item = elem.item ?? elem;
          if (item.name && item.offers) {
            items.push({
              id: item.url?.split("/item/")[1]?.replace("/", "") ?? "",
              name: item.name,
              price: parseFloat(item.offers.price ?? "0"),
              status: "ON_SALE",
              thumbnails: item.image ? [item.image] : [],
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  return items;
}

function findItemsRecursive(obj: unknown, depth = 0): unknown[] | null {
  if (depth > 5 || !obj || typeof obj !== "object") return null;
  if (Array.isArray(obj) && obj.length > 0 && obj[0]?.id && obj[0]?.name) {
    return obj;
  }
  for (const value of Object.values(obj as Record<string, unknown>)) {
    const found = findItemsRecursive(value, depth + 1);
    if (found) return found;
  }
  return null;
}

function normalizeItem(item: MercariSearchItem): NormalizedListing {
  return {
    platform: "mercari_us",
    externalId: item.id,
    url: `https://www.mercari.com/us/item/${item.id}/`,
    title: item.name,
    priceNative: item.price,
    currency: "USD",
    priceUSD: item.price,
    imageUrl: item.thumbnails[0] ?? null,
    sellerInfo: item.sellerId
      ? { sellerId: item.sellerId, sellerName: item.sellerName }
      : null,
    rawData: item as unknown as Record<string, unknown>,
  };
}

/**
 * Search Mercari US using Playwright headless browser.
 * Bypasses Cloudflare, extracts from __NEXT_DATA__ or DOM.
 */
export async function searchListings(
  params: ScraperSearchParams
): Promise<NormalizedListing[]> {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 720 },
    locale: "en-US",
  });

  const page = await context.newPage();

  try {
    const searchUrl = buildSearchUrl(params);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for Cloudflare challenge to resolve + page to hydrate
    await page.waitForTimeout(5000);

    // If we're still on a challenge page, wait longer
    const title = await page.title();
    if (title.includes("moment") || title.includes("challenge")) {
      console.log("Mercari US: Cloudflare challenge detected, waiting...");
      await page.waitForTimeout(8000);
    }

    const html = await page.content();

    // Try __NEXT_DATA__ first
    let items = extractFromNextData(html);

    // Fallback to DOM extraction
    if (items.length === 0) {
      items = extractFromDom(html);
    }

    // Fallback: try extracting from page's network responses
    if (items.length === 0) {
      // Try evaluating page state directly
      const pageItems = await page.evaluate(() => {
        const nextData = (window as unknown as Record<string, unknown>).__NEXT_DATA__ as Record<string, unknown> | undefined;
        if (nextData?.props) {
          return JSON.stringify(nextData.props);
        }
        return null;
      });

      if (pageItems) {
        try {
          const props = JSON.parse(pageItems);
          const found = findItemsRecursive(props);
          if (found) {
            items = (found as Record<string, unknown>[]).map((item) => ({
              id: String(item.id ?? item.itemId ?? ""),
              name: String(item.name ?? item.itemName ?? ""),
              price: Number(item.price ?? item.itemPrice ?? 0),
              status: "ON_SALE",
              thumbnails: Array.isArray(item.thumbnails)
                ? item.thumbnails.map(String)
                : [],
            }));
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    const limit = params.limit ?? 30;
    console.log(`Mercari US (Playwright): "${params.query}" → ${items.length} results`);

    return items.slice(0, limit).map(normalizeItem);
  } finally {
    await browser.close();
  }
}
