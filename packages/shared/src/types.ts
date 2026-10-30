// ─── Platform ────────────────────────────────────────────────────────────────

export type Platform = "ebay" | "mercari_us" | "yja" | "mercari_jp";

// ─── Tracked Entity ──────────────────────────────────────────────────────────

export interface TrackedEntity {
  id: string;
  player: string;
  yearMin: number | null;
  yearMax: number | null;
  setKeywords: string[];
  parallelTerms: string[];
  excludeTerms: string[];
  priceCeilingUSD: number | null;
  alertThreshold: number; // default 70
  smsThreshold: number; // default 85
  active: boolean;
  createdAt: Date;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export interface Listing {
  id: string;
  platform: Platform;
  externalId: string;
  url: string;
  title: string;
  priceUSD: number;
  priceNative: number;
  currency: string;
  imageUrl: string | null;
  sellerInfo: Record<string, unknown> | null;
  rawData: Record<string, unknown>;
  firstSeenAt: Date;
  lastSeenAt: Date;
  soldAt: Date | null;
}

// ─── Scraper Interface ───────────────────────────────────────────────────────

export interface ScraperSearchParams {
  query: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface NormalizedListing {
  platform: Platform;
  externalId: string;
  url: string;
  title: string;
  priceNative: number;
  currency: string;
  priceUSD: number;
  imageUrl: string | null;
  sellerInfo: Record<string, unknown> | null;
  rawData: Record<string, unknown>;
}
