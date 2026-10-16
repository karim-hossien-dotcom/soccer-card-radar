import { supabase } from "@soccer-card-radar/db";

/** Active listings seen since `freshCutoff` (cheapest first) and per-player sold stats. */
export async function dealRows(freshCutoff: string) {
  // Local UAT without database access: DEALS_FIXTURE=path/to/deals.json (ignored in production).
  if (process.env.DEALS_FIXTURE && process.env.NODE_ENV !== "production") {
    const { readFile } = await import("node:fs/promises");
    const d = JSON.parse(await readFile(process.env.DEALS_FIXTURE, "utf8")) as { listings: Listing[]; stats: Stat[] };
    const listings = d.listings.filter((l) => !l.soldAt && l.lastSeenAt >= freshCutoff).sort((a, b) => a.priceUSD - b.priceUSD).slice(0, 500);
    return { listings, stats: d.stats };
  }
  const [listingsRes, statsRes] = await Promise.all([
    supabase
      .from("Listing")
      .select("id, title, priceUSD, url, rawData, actionId, lane, lastSeenAt, soldAt")
      .is("soldAt", null)
      .gte("lastSeenAt", freshCutoff)
      .order("priceUSD", { ascending: true })
      .limit(500),
    supabase
      .from("PlayerSoldStats")
      .select("actionId, sampleSize, median, last5Avg, trend7dPct, trend30dPct, fairValueMid, scrapedAt, sourceStatus"),
  ]);
  return { listings: (listingsRes.data ?? []) as Listing[], stats: (statsRes.data ?? []) as Stat[] };
}

type Listing = { id: string; title: string; priceUSD: number; url: string; rawData: unknown; actionId: string | null; lane: string | null; lastSeenAt: string; soldAt: string | null };
type Stat = { actionId: string; sampleSize: number; median: number | null; last5Avg: number | null; trend7dPct: number | null; trend30dPct: number | null; fairValueMid: number | null; scrapedAt: string; sourceStatus: string };
