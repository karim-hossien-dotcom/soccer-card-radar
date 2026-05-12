-- Cached sold-comp stats per research action.
-- Populated by /api/sold-scan via the curl-cffi eBay scraper. Read by
-- /api/deals (and indirectly by the pitch UI) to replace the heuristic
-- predict() function with real medians.
--
-- One row per action_id. UPSERTs overwrite previous run. No history kept
-- here — query the Listing table directly for historical price walks.

create table if not exists "PlayerSoldStats" (
  "actionId"       text primary key,
  "player"         text not null,
  "lane"           text not null,
  "sampleSize"     integer not null default 0,
  "median"         numeric(12, 2),
  "mean"           numeric(12, 2),
  "low"            numeric(12, 2),
  "high"           numeric(12, 2),
  "last5Avg"       numeric(12, 2),
  "trend7dPct"     numeric(6, 2),
  "trend30dPct"    numeric(6, 2),
  "fairValueLow"   numeric(12, 2),
  "fairValueMid"   numeric(12, 2),
  "fairValueHigh"  numeric(12, 2),
  "sourceStatus"   text not null default 'unknown',   -- 'ok' | 'blocked' | 'empty' | 'error'
  "scrapedAt"      timestamptz not null default now(),
  "errorMessage"   text
);

create index if not exists "PlayerSoldStats_lane_idx" on "PlayerSoldStats" ("lane");
create index if not exists "PlayerSoldStats_scrapedAt_idx" on "PlayerSoldStats" ("scrapedAt" desc);
