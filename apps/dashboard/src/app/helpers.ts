export function parseCard(title: string) {
  const t = title.toLowerCase();
  const numMatch = t.match(/\/(\d{1,3})\b/);
  const gradeMatch = t.match(/psa\s*(\d+)/i) || t.match(/bgs\s*([\d.]+)/i) || t.match(/sgc\s*(\d+)/i);
  return {
    numbered: numMatch ? `/${numMatch[1]}` : null,
    isAuto: (t.includes("auto") || t.includes("autograph")) && !t.includes("sticker auto"),
    grade: gradeMatch ? gradeMatch[0].toUpperCase() : null,
  };
}

export function getProductTier(title: string): { tier: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes("sapphire") || t.includes("dynasty") || t.includes("immaculate") || t.includes("eminence")) return { tier: "Premium", color: "#22c55e" };
  if ((t.includes("chrome") && !t.includes("merlin")) || t.includes("prizm")) return { tier: "Chrome", color: "#3b82f6" };
  if (t.includes("finest") || t.includes("select") || t.includes("obsidian")) return { tier: "Finest", color: "#8b5cf6" };
  if (t.includes("merlin")) return { tier: "Merlin", color: "#71717a" };
  return { tier: "", color: "#4a6b55" };
}

export function timeLeft(endDate: string): string | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0 || diff > 48 * 3600000) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

export function predict(lane: string, catalyst: string): string {
  const c = catalyst.toLowerCase();
  if (lane === "legacy") return "2x legacy";
  if (c.includes("breakout") && c.includes("wc")) return "3x breakout+WC";
  if (c.includes("world cup") || c.includes("wc")) return "2.5x WC";
  if (c.includes("transfer")) return "3x transfer";
  if (c.includes("breakout") || c.includes("record")) return "2x breakout";
  if (lane === "steal") return "1.5x dip";
  return "1.3x hold";
}

export function assignTier(
  signal: string,
  lane: string,
  catalyst: string,
  pageType: "rookie" | "stars" | "legends"
): "S" | "A" | "B" {
  const c = catalyst.toLowerCase();

  if (pageType === "legends") return "S";

  if (pageType === "rookie") {
    if (signal === "BUY" && lane === "rookie") {
      if (c.includes("breakout") || c.includes("wc") || c.includes("world cup")) return "S";
      return "A";
    }
    return "B";
  }

  // stars page
  if (signal === "BUY" && lane === "steal") {
    if (c.includes("wc") || c.includes("world cup")) return "S";
    return "A";
  }
  return "B";
}

export type DealItem = {
  title: string;
  price: number;
  url: string;
  product: string;
  productColor: string;
  numbered: string | null;
  isAuto: boolean;
  grade: string | null;
  offer: number | null;
  actionLabel: string;
  actionColor: string;
};

export type PitchPlayerData = {
  name: string;
  tier: "S" | "A" | "B";
  prediction: string;
  position: { x: number; y: number };
  deals: DealItem[];
  // Real sold-comp stats from PlayerSoldStats. Null until first sold-scan runs
  // for this action, or if eBay blocked the scrape.
  stats: {
    sample_size: number;
    median: number | null;
    last_5_avg: number | null;
    trend_7d_pct: number | null;
    trend_30d_pct: number | null;
    fair_value_mid: number | null;
    scraped_at: string;
  } | null;
};

/**
 * Build a short label for the pitch view from real sold-comp stats, falling
 * back to the heuristic `predict()` when we have no data yet.
 *
 * Examples (data path):
 *   - "$1,575 med · 7d ↓5%"    (median + recent trend)
 *   - "$2,400 fair · 30d ↑12%"  (fair-value mid + 30-day trend)
 *   - "$500 med · 12 sold"      (low sample, show count instead of trend)
 */
export function statsLabel(
  stats: PitchPlayerData["stats"],
  fallbackLane: string,
  fallbackCatalyst: string,
): string {
  if (!stats || stats.sample_size === 0) {
    return predict(fallbackLane, fallbackCatalyst);
  }

  const headline = stats.fair_value_mid ?? stats.median;
  if (headline === null) return predict(fallbackLane, fallbackCatalyst);

  const dollars = headline >= 1000
    ? `$${(headline / 1000).toFixed(1)}k`
    : `$${Math.round(headline)}`;
  const tag = stats.fair_value_mid !== null ? "fair" : "med";

  const trend = stats.trend_7d_pct ?? stats.trend_30d_pct;
  if (trend === null || stats.sample_size < 3) {
    return `${dollars} ${tag} · ${stats.sample_size} sold`;
  }

  const window = stats.trend_7d_pct !== null ? "7d" : "30d";
  const arrow = trend >= 0 ? "↑" : "↓";
  return `${dollars} ${tag} · ${window} ${arrow}${Math.abs(trend).toFixed(0)}%`;
}
