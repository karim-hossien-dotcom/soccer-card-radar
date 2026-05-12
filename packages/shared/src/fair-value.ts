/**
 * Fair-value math — ported from card-mcp's @card-mcp/shared.
 *
 * Single source of truth for translating a list of sold-comp prices into:
 *   - SoldStats:   median, mean, low/high, last_5_avg, 7d/30d trend %
 *   - FairValue:   {low, mid, high} via outlier-trimmed weighted percentiles
 *
 * Pure functions. No I/O. No side effects.
 */

export interface SoldSale {
  sold_price: number;
  sold_date: string; // ISO date
}

export interface SoldStats {
  count: number;
  median: number;
  mean: number;
  low: number;
  high: number;
  trend_7d_pct: number | null;
  trend_30d_pct: number | null;
  last_5_avg: number | null;
}

export interface FairValue {
  low: number;
  mid: number;
  high: number;
  sample_size: number;
  outliers_dropped: number;
  window_days: number;
  computed_at: string;
}

const OUTLIER_SIGMA = 2;

/**
 * Last `windowDays` (default 30): trim >2σ outliers, weight newer sales more,
 * return 25th / 50th / 75th weighted percentiles as low / mid / high.
 */
export function computeFairValue(sales: SoldSale[], windowDays = 30): FairValue {
  const now = Date.now();
  const cutoff = now - windowDays * 86_400_000;
  const inWindow = sales.filter(s => {
    const t = new Date(s.sold_date).getTime();
    return Number.isFinite(t) && t >= cutoff && s.sold_price > 0;
  });

  if (inWindow.length === 0) return emptyFairValue(windowDays);

  const prices = inWindow.map(s => s.sold_price);
  const mean = avg(prices);
  const sigma = stddev(prices, mean);
  const trimmed = inWindow.filter(s => Math.abs(s.sold_price - mean) <= OUTLIER_SIGMA * sigma);
  const outliers_dropped = inWindow.length - trimmed.length;

  if (trimmed.length < 3) {
    const sorted = [...inWindow].sort((a, b) => a.sold_price - b.sold_price);
    return {
      low: sorted[0]!.sold_price,
      mid: sorted[Math.floor(sorted.length / 2)]!.sold_price,
      high: sorted[sorted.length - 1]!.sold_price,
      sample_size: inWindow.length,
      outliers_dropped,
      window_days: windowDays,
      computed_at: new Date().toISOString(),
    };
  }

  const weighted: Array<{ price: number; weight: number }> = trimmed.map(s => {
    const ageDays = (now - new Date(s.sold_date).getTime()) / 86_400_000;
    const weight = Math.max(0.5, 1 - 0.5 * (ageDays / windowDays));
    return { price: s.sold_price, weight };
  });

  return {
    low: weightedPercentile(weighted, 0.25),
    mid: weightedPercentile(weighted, 0.50),
    high: weightedPercentile(weighted, 0.75),
    sample_size: trimmed.length,
    outliers_dropped,
    window_days: windowDays,
    computed_at: new Date().toISOString(),
  };
}

export function computeSoldStats(sales: SoldSale[]): SoldStats {
  if (sales.length === 0) {
    return {
      count: 0, median: 0, mean: 0, low: 0, high: 0,
      trend_7d_pct: null, trend_30d_pct: null, last_5_avg: null,
    };
  }
  const prices = sales.map(s => s.sold_price);
  const sorted = [...prices].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  const mean = avg(prices);

  const byDateDesc = [...sales].sort(
    (a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime(),
  );
  const last5 = byDateDesc.slice(0, 5);
  const last_5_avg = last5.length > 0 ? avg(last5.map(s => s.sold_price)) : null;

  const now = Date.now();
  return {
    count: sales.length,
    median: round2(median),
    mean: round2(mean),
    low: round2(sorted[0]!),
    high: round2(sorted[sorted.length - 1]!),
    trend_7d_pct: pctChange(byDateDesc, now, 7),
    trend_30d_pct: pctChange(byDateDesc, now, 30),
    last_5_avg: last_5_avg == null ? null : round2(last_5_avg),
  };
}

function avg(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function stddev(xs: number[], mean: number): number {
  if (xs.length <= 1) return 0;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(variance);
}
function weightedPercentile(pairs: Array<{ price: number; weight: number }>, p: number): number {
  const sorted = [...pairs].sort((a, b) => a.price - b.price);
  const totalWeight = sorted.reduce((s, x) => s + x.weight, 0);
  const target = totalWeight * p;
  let cumulative = 0;
  for (const item of sorted) {
    cumulative += item.weight;
    if (cumulative >= target) return round2(item.price);
  }
  return round2(sorted[sorted.length - 1]!.price);
}
function pctChange(byDateDesc: SoldSale[], now: number, windowDays: number): number | null {
  const windowMs = windowDays * 86_400_000;
  const cutoff = now - windowMs;
  const inWindow = byDateDesc.filter(s => new Date(s.sold_date).getTime() >= cutoff);
  const before = byDateDesc.filter(
    s => new Date(s.sold_date).getTime() < cutoff &&
         new Date(s.sold_date).getTime() >= cutoff - windowMs,
  );
  if (inWindow.length === 0 || before.length === 0) return null;
  const recentMean = avg(inWindow.map(s => s.sold_price));
  const priorMean = avg(before.map(s => s.sold_price));
  if (priorMean === 0) return null;
  return round2(((recentMean - priorMean) / priorMean) * 100);
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function emptyFairValue(windowDays: number): FairValue {
  return {
    low: 0, mid: 0, high: 0,
    sample_size: 0, outliers_dropped: 0,
    window_days: windowDays,
    computed_at: new Date().toISOString(),
  };
}
