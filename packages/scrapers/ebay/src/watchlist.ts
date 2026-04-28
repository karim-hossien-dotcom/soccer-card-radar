/**
 * eBay Trading API — GetMyeBayBuying (WatchList).
 * Uses the legacy XML-based Trading API which requires a user token.
 */

import type { NormalizedListing } from "@soccer-card-radar/shared";
import { getUserToken } from "./auth";

const TRADING_API_URL = "https://api.ebay.com/ws/api.dll";

interface WatchlistItem {
  ItemID: string;
  Title: string;
  ViewItemURL: string;
  SellingStatus: {
    CurrentPrice: {
      "#text": string;
      "@currencyID": string;
    };
  };
  PictureDetails?: {
    GalleryURL?: string;
  };
  Seller?: {
    UserID: string;
    FeedbackScore: number;
    PositiveFeedbackPercent: number;
  };
}

function buildWatchlistXml(pageNumber: number = 1): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBayBuyingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${getUserToken()}</eBayAuthToken>
  </RequesterCredentials>
  <WatchList>
    <Sort>TimeLeft</Sort>
    <Pagination>
      <EntriesPerPage>100</EntriesPerPage>
      <PageNumber>${pageNumber}</PageNumber>
    </Pagination>
  </WatchList>
</GetMyeBayBuyingRequest>`;
}

function parsePrice(sellingStatus: WatchlistItem["SellingStatus"]): {
  priceNative: number;
  currency: string;
} {
  const priceStr = sellingStatus.CurrentPrice["#text"] ?? sellingStatus.CurrentPrice.toString();
  return {
    priceNative: parseFloat(priceStr),
    currency: sellingStatus.CurrentPrice["@currencyID"] ?? "USD",
  };
}

function normalizeWatchlistItem(item: WatchlistItem): NormalizedListing {
  const { priceNative, currency } = parsePrice(item.SellingStatus);
  return {
    platform: "ebay",
    externalId: item.ItemID,
    url: item.ViewItemURL,
    title: item.Title,
    priceNative,
    currency,
    priceUSD: currency === "USD" ? priceNative : priceNative, // TODO: FX conversion
    imageUrl: item.PictureDetails?.GalleryURL ?? null,
    sellerInfo: item.Seller
      ? {
          username: item.Seller.UserID,
          feedbackScore: item.Seller.FeedbackScore,
          feedbackPercent: item.Seller.PositiveFeedbackPercent,
        }
      : null,
    rawData: item as unknown as Record<string, unknown>,
  };
}

/**
 * Fetch the user's eBay watchlist via Trading API.
 * Returns all items across paginated results.
 */
export async function syncWatchlist(): Promise<NormalizedListing[]> {
  const appId = process.env.EBAY_APP_ID;
  if (!appId) throw new Error("EBAY_APP_ID required for Trading API");

  const allItems: NormalizedListing[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(TRADING_API_URL, {
      method: "POST",
      headers: {
        "X-EBAY-API-SITEID": "0",
        "X-EBAY-API-COMPATIBILITY-LEVEL": "1281",
        "X-EBAY-API-CALL-NAME": "GetMyeBayBuying",
        "X-EBAY-API-APP-NAME": appId,
        "Content-Type": "text/xml",
      },
      body: buildWatchlistXml(page),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`eBay Trading API error (${res.status}): ${text}`);
    }

    const xml = await res.text();

    // Parse items from XML response
    const items = parseWatchlistXml(xml);
    allItems.push(...items.map(normalizeWatchlistItem));

    // Check for more pages
    const totalPages = extractTotalPages(xml);
    hasMore = page < totalPages;
    page++;
  }

  console.log(`eBay Watchlist: synced ${allItems.length} items`);
  return allItems;
}

/**
 * Simple XML parser for watchlist items.
 * Extracts Item elements from the WatchList response.
 */
function parseWatchlistXml(xml: string): WatchlistItem[] {
  const items: WatchlistItem[] = [];

  // Match each <Item>...</Item> block
  const itemRegex = /<Item>([\s\S]*?)<\/Item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const itemId = extractTag(block, "ItemID");
    const title = extractTag(block, "Title");
    const viewUrl = extractTag(block, "ViewItemURL");
    const priceMatch = block.match(
      /<CurrentPrice currencyID="([^"]*)">([\d.]+)<\/CurrentPrice>/
    );
    const galleryUrl = extractTag(block, "GalleryURL");
    const sellerId = extractTag(block, "UserID");
    const feedbackScore = extractTag(block, "FeedbackScore");
    const feedbackPercent = extractTag(block, "PositiveFeedbackPercent");

    if (itemId && title && viewUrl && priceMatch) {
      items.push({
        ItemID: itemId,
        Title: title,
        ViewItemURL: viewUrl,
        SellingStatus: {
          CurrentPrice: {
            "#text": priceMatch[2],
            "@currencyID": priceMatch[1],
          },
        },
        PictureDetails: galleryUrl ? { GalleryURL: galleryUrl } : undefined,
        Seller: sellerId
          ? {
              UserID: sellerId,
              FeedbackScore: parseInt(feedbackScore ?? "0"),
              PositiveFeedbackPercent: parseFloat(feedbackPercent ?? "0"),
            }
          : undefined,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractTotalPages(xml: string): number {
  const match = xml.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/);
  return match ? parseInt(match[1]) : 1;
}
