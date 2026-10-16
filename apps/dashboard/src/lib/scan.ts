import type { ResearchAction } from "../app/research-engine";

/** S1: eBay Browse sweep across the research actions. IO is injected so the route stays thin and this stays testable. */

export type EbayItem = Record<string, unknown>;
export type ListingRow = {
  platform: "ebay";
  externalId: string;
  url: string;
  title: string;
  priceUSD: number;
  priceNative: number;
  currency: string;
  imageUrl: string | null;
  sellerInfo: { username: unknown; feedbackScore: unknown } | null;
  rawData: Record<string, unknown>;
  actionId: string;
  lane: string;
  lastSeenAt: string;
};
export type ScanDeps = {
  search: (query: string) => Promise<EbayItem[]>;
  /** Upserts rows on (platform, externalId); returns how many were new. */
  save: (rows: ListingRow[]) => Promise<number>;
  keep: (title: string) => boolean; // quality gate (isQualityCard || isVintageLegend)
  pause?: () => Promise<void>; // rate limit between eBay calls
};
export type ScanResult = { apiCalls: number; queries: number; imported: number; updated: number; skipped: number; capped: boolean };

const PRICE_CAP: Record<string, number> = { rookie: 1000, steal: 2000, legacy: 5000 };

/** Filters one search hit (quality, lane price cap, player surname in title) and maps it to a Listing row. */
export function toListing(item: EbayItem, action: ResearchAction, now: string, keep: ScanDeps["keep"]): ListingRow | null {
  const title = (item.title as string) ?? "";
  if (!keep(title)) return null;
  const price = item.price as { value?: string; currency?: string } | undefined;
  const priceUSD = parseFloat(price?.value ?? "0");
  if (!(priceUSD > 0) || priceUSD > (PRICE_CAP[action.lane] ?? 1000)) return null;
  const last = action.player.split(" ").pop()!.toLowerCase();
  if (last.length >= 4 && !title.toLowerCase().includes(last)) return null;
  const options = (item.buyingOptions as string[]) ?? [];
  const seller = item.seller as Record<string, unknown> | null;
  const ship = (item.shippingOptions as { shippingCost?: { value?: string } }[] | undefined)?.[0]?.shippingCost?.value ?? null;
  return {
    platform: "ebay",
    externalId: item.itemId as string,
    url: (item.itemWebUrl as string) ?? "",
    title,
    priceUSD,
    priceNative: priceUSD,
    currency: price?.currency ?? "USD",
    imageUrl: ((item.image as { imageUrl?: string } | undefined)?.imageUrl) ?? null,
    sellerInfo: seller ? { username: seller.username, feedbackScore: seller.feedbackScore } : null,
    rawData: {
      condition: (item.condition as string) ?? null,
      buyingOptions: options,
      isBIN: options.includes("FIXED_PRICE"),
      isAuction: options.includes("AUCTION"),
      acceptsOffers: options.includes("BEST_OFFER"),
      itemEndDate: (item.itemEndDate as string) ?? null,
      shippingCost: ship,
    },
    actionId: action.id,
    lane: action.lane,
    lastSeenAt: now,
  };
}

export async function runScan(actions: ResearchAction[], deps: ScanDeps, maxCalls: number, now = new Date().toISOString()): Promise<ScanResult> {
  const r: ScanResult = { apiCalls: 0, queries: actions.reduce((n, a) => n + a.searchQueries.length, 0), imported: 0, updated: 0, skipped: 0, capped: false };
  for (const action of actions) {
    for (const q of action.searchQueries) {
      if (r.apiCalls >= maxCalls) { r.capped = true; return r; }
      const items = await deps.search(q);
      r.apiCalls++;
      const byId = new Map<string, ListingRow>(); // the same item can match twice in one page
      for (const item of items) {
        const row = toListing(item, action, now, deps.keep);
        if (row && row.externalId) byId.set(row.externalId, row);
        else r.skipped++;
      }
      if (byId.size) {
        const fresh = await deps.save([...byId.values()]);
        r.imported += fresh;
        r.updated += byId.size - fresh;
      }
      await deps.pause?.();
    }
  }
  return r;
}
