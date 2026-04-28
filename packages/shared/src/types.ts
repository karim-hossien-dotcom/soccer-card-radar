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

// ─── Extraction Result ───────────────────────────────────────────────────────

export interface ExtractionResult {
  player: string | null;
  year: number | null;
  set: string | null;
  parallel: string | null;
  autograph: boolean;
  isLot: boolean;
  condition:
    | "raw"
    | "psa10"
    | "psa9"
    | "bgs10"
    | "other_graded"
    | null;
}

// ─── Match Score ─────────────────────────────────────────────────────────────

export interface MatchScoreResult {
  score: number; // 0-100
  reasons: {
    playerMatch: boolean;
    yearInRange: boolean;
    setKeywordHit: boolean;
    parallelTermHit: boolean;
    belowPriceCeiling: boolean;
    autographMatch: boolean;
    excludeTermHit: boolean;
    isLot: boolean;
  };
}

// ─── Alert ───────────────────────────────────────────────────────────────────

export type AlertChannel = "web_push" | "sms";

export interface AlertPayload {
  listingId: string;
  entityId: string;
  matchScore: number;
  channel: AlertChannel;
  title: string;
  body: string;
  url: string;
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
