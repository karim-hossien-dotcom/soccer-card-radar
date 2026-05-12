-- Weekly snapshot of sold-comp stats per research action.
--
-- Why this exists: eBay / Apify / 130point all max out at ~90 days of sold
-- history. To answer "what did Ronaldo cards trade at in Nov 2025 vs now?"
-- we have to start accumulating snapshots ourselves. Every /api/sold-scan
-- run also writes a row here keyed by (actionId, snapshotWeek). After ~12
-- weeks we can show real long-term sparklines. After ~26 weeks we can
-- detect "dip and recovery" patterns retrospectively.
--
-- Primary key: (actionId, snapshotWeek). Multiple scans within the same
-- week overwrite each other — the LATEST scan in the week wins. This
-- keeps history compact (~52 rows per player per year) without losing
-- the canonical end-of-week median.

create table if not exists "SoldStatsHistory" (
  "actionId"       text not null,
  "snapshotWeek"   date not null,             -- ISO Monday of the week
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
  "sourceStatus"   text not null default 'unknown',
  "scrapedAt"      timestamptz not null default now(),
  primary key ("actionId", "snapshotWeek")
);

create index if not exists "SoldStatsHistory_player_idx" on "SoldStatsHistory" ("player");
create index if not exists "SoldStatsHistory_snapshotWeek_idx" on "SoldStatsHistory" ("snapshotWeek" desc);
