import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { supabase } from "@soccer-card-radar/db";
import {
  computeFairValue,
  computeSoldStats,
  type SoldSale,
} from "@soccer-card-radar/shared";
import { getResearchActions, type ResearchAction } from "../../research-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // up to 5 min — sequential scan with eBay-rate-friendly delay

// Path resolves from this file → up to soccer-card-radar/ → into the scrapers package.
const SCRIPT_PATH = join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "scrapers",
  "ebay",
  "scripts",
  "ebay_sold_scraper.py",
);

const PYTHON = process.env.CARD_MCP_PYTHON ?? "python3";
const DELAY_BETWEEN_ACTIONS_MS = 10_000; // 10s — well under eBay's soft-ban threshold

const APIFY_TOKEN = process.env.APIFY_API_TOKEN ?? null;
const APIFY_ACTOR = process.env.APIFY_ACTOR_SLUG ?? "caffein.dev~ebay-sold-listings";

interface ScrapeResult {
  sales: SoldSale[];
  error?: string;
  ebay_http_status?: number;
  source?: "scraper" | "apify";
}

async function scrapeOneAction(action: ResearchAction): Promise<ScrapeResult> {
  // Use the first searchQuery as the canonical scrape query for this action.
  const query = action.searchQueries[0] ?? action.player;

  // 1. Free path: curl-cffi via Python subprocess. Works ~70% per fresh IP-hour.
  const scraperResult = await runCurlCffi(query);
  if (scraperResult.sales.length > 0) {
    return { ...scraperResult, source: "scraper" };
  }

  // 2. Paid fallback: Apify hosted actor. Only fires when scraper got 0 sales
  //    AND APIFY_API_TOKEN is configured. Apify rotates residential proxies
  //    internally so it bypasses eBay's soft-ban on our IP.
  if (APIFY_TOKEN) {
    const apifyResult = await runApify(query);
    if (apifyResult.sales.length > 0) {
      return { ...apifyResult, source: "apify" };
    }
    return {
      sales: [],
      error: `scraper: ${scraperResult.error ?? "0 sales"}; apify: ${apifyResult.error ?? "0 sales"}`,
    };
  }

  // 3. No fallback configured — return the scraper's error
  return scraperResult;
}

function runCurlCffi(query: string): Promise<ScrapeResult> {
  return new Promise(resolve => {
    const child = spawn(PYTHON, [SCRIPT_PATH], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", d => { stdout += d.toString(); });
    child.stderr.on("data", d => { stderr += d.toString(); });
    child.on("error", err => {
      resolve({ sales: [], error: `subprocess spawn failed: ${err.message}` });
    });
    child.on("close", () => {
      try {
        const parsed = JSON.parse(stdout) as {
          sales?: SoldSale[];
          error?: string;
          ebay_http_status?: number;
        };
        const out: ScrapeResult = { sales: parsed.sales ?? [] };
        if (parsed.error) out.error = parsed.error;
        if (parsed.ebay_http_status !== undefined) out.ebay_http_status = parsed.ebay_http_status;
        resolve(out);
      } catch {
        resolve({
          sales: [],
          error: `bad JSON from scraper. stderr: ${stderr.slice(0, 200)}`,
        });
      }
    });
    child.stdin.write(JSON.stringify({
      query,
      days: 90,
      grade: null,
      limit: 60,
    }));
    child.stdin.end();
  });
}

interface ApifyResp {
  itemId?: string;
  title?: string;
  soldPrice?: number;
  endDate?: string;
}

async function runApify(query: string): Promise<ScrapeResult> {
  if (!APIFY_TOKEN) {
    return { sales: [], error: "APIFY_API_TOKEN not configured" };
  }
  const url = new URL(
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items`,
  );
  url.searchParams.set("token", APIFY_TOKEN);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: [query],
        daysToScrape: 90,
        count: 60,
        ebaySite: "ebay.com",
        sortOrder: "endedRecently",
      }),
    });
    if (!resp.ok) {
      return { sales: [], error: `apify HTTP ${resp.status}` };
    }
    const items = (await resp.json()) as ApifyResp[];
    const sales: SoldSale[] = items
      .filter(i => typeof i.soldPrice === "number" && i.endDate)
      .map(i => ({
        sold_price: i.soldPrice as number,
        sold_date: (i.endDate as string).slice(0, 10),
      }));
    return { sales };
  } catch (err) {
    return { sales: [], error: `apify fetch failed: ${(err as Error).message}` };
  }
}

function classifySourceStatus(
  result: ScrapeResult,
): "ok" | "ok-apify" | "empty" | "blocked" | "error" {
  if (result.sales.length > 0) {
    return result.source === "apify" ? "ok-apify" : "ok";
  }
  if (result.error?.includes("blocked")) return "blocked";
  if (result.error) return "error";
  return "empty";
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the Monday of the week
 * containing the given date. Used as the snapshotWeek key in SoldStatsHistory
 * so multiple scans within the same week overwrite each other (latest wins),
 * keeping history compact while preserving weekly granularity.
 */
function isoMondayOfWeek(d: Date): string {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = utc.getUTCDay(); // 0=Sun..6=Sat
  const offset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + offset);
  return utc.toISOString().slice(0, 10);
}

async function upsertStats(action: ResearchAction, result: ScrapeResult): Promise<void> {
  const stats = computeSoldStats(result.sales);
  const fv = computeFairValue(result.sales, 30);
  const sourceStatus = classifySourceStatus(result);
  const now = new Date();
  const scrapedAt = now.toISOString();
  const snapshotWeek = isoMondayOfWeek(now);

  // If this scrape failed (blocked/empty/error) but we already have real
  // samples on file, only update sourceStatus + scrapedAt. Never let a
  // blocked-result null out valid historical stats.
  if (stats.count === 0) {
    const existing = await supabase
      .from("PlayerSoldStats")
      .select("sampleSize")
      .eq("actionId", action.id)
      .maybeSingle();
    if (existing.data && existing.data.sampleSize > 0) {
      await supabase
        .from("PlayerSoldStats")
        .update({
          sourceStatus,
          errorMessage: result.error ?? null,
          scrapedAt,
        })
        .eq("actionId", action.id);
      return;
    }
  }

  const statsRow = {
    sampleSize: stats.count,
    median: stats.count > 0 ? stats.median : null,
    mean: stats.count > 0 ? stats.mean : null,
    low: stats.count > 0 ? stats.low : null,
    high: stats.count > 0 ? stats.high : null,
    last5Avg: stats.last_5_avg,
    trend7dPct: stats.trend_7d_pct,
    trend30dPct: stats.trend_30d_pct,
    fairValueLow: fv.sample_size > 0 ? fv.low : null,
    fairValueMid: fv.sample_size > 0 ? fv.mid : null,
    fairValueHigh: fv.sample_size > 0 ? fv.high : null,
    sourceStatus,
    scrapedAt,
  };

  // Latest stats (one row per action — gets overwritten by next scan).
  await supabase
    .from("PlayerSoldStats")
    .upsert({
      actionId: action.id,
      player: action.player,
      lane: action.lane,
      ...statsRow,
      errorMessage: result.error ?? null,
    }, { onConflict: "actionId" });

  // Weekly history (compounded over time — enables long-term dip detection).
  // Multiple scans in the same week overwrite each other; the latest wins.
  await supabase
    .from("SoldStatsHistory")
    .upsert({
      actionId: action.id,
      snapshotWeek,
      player: action.player,
      lane: action.lane,
      ...statsRow,
    }, { onConflict: "actionId,snapshotWeek" });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * POST /api/sold-scan
 *
 * Scrapes eBay sold listings for every research action (sequentially with
 * a polite delay), computes fair-value + trend stats, upserts to PlayerSoldStats.
 *
 * Query params:
 *   ?action=<id>   — scan only one action (fast, ~3s)
 *   ?lane=<lane>   — scan only one lane (rookie / steal / legacy)
 *
 * Without params: scans all ~20 actions, ~3.5 min total.
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  const url = new URL(req.url);
  const actionFilter = url.searchParams.get("action");
  const laneFilter = url.searchParams.get("lane");

  const allActions = getResearchActions();
  const actions = allActions.filter(a => {
    if (actionFilter && a.id !== actionFilter) return false;
    if (laneFilter && a.lane !== laneFilter) return false;
    return true;
  });

  if (actions.length === 0) {
    return NextResponse.json({
      ok: false,
      error: `no actions matched (action=${actionFilter ?? "*"}, lane=${laneFilter ?? "*"})`,
    }, { status: 400 });
  }

  const results: Array<{
    actionId: string;
    player: string;
    sampleSize: number;
    sourceStatus: string;
    median: number | null;
    error?: string;
  }> = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i]!;
    if (i > 0) await delay(DELAY_BETWEEN_ACTIONS_MS);

    const scrape = await scrapeOneAction(action);
    await upsertStats(action, scrape);

    const stats = computeSoldStats(scrape.sales);
    results.push({
      actionId: action.id,
      player: action.player,
      sampleSize: stats.count,
      sourceStatus: classifySourceStatus(scrape),
      median: stats.count > 0 ? stats.median : null,
      ...(scrape.error ? { error: scrape.error } : {}),
    });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const okCount = results.filter(r => r.sourceStatus === "ok").length;
  const blockedCount = results.filter(r => r.sourceStatus === "blocked").length;

  return NextResponse.json({
    ok: true,
    elapsed: `${elapsed}s`,
    scanned: actions.length,
    with_sales: okCount,
    blocked: blockedCount,
    results,
  });
}
