-- V3: Veriswap asks for snipe targets and Karim's own Veriswap listings (mine = true).
-- Separate from "Listing" on purpose: the Snipe board reads "Listing" by actionId with no platform filter,
-- so Veriswap rows there would change live prices and scores.
-- No foreign keys, triggers or views: nothing existing reads or depends on this table.
-- Applied to Supabase project SOS via MCP on 2026-11-12.
create table if not exists "VeriswapListing" (
  "externalId" text primary key,
  "url" text not null,
  "title" text not null,
  "askUSD" numeric not null check ("askUSD" >= 0),
  "grader" text,
  "grade" text,
  "vaulted" boolean not null default false,
  "mine" boolean not null default false,
  "targetId" uuid,
  "cardId" uuid,
  "query" text,
  "firstSeenAt" timestamptz not null default now(),
  "lastSeenAt" timestamptz not null default now()
);
alter table "VeriswapListing" enable row level security;
revoke all on table "VeriswapListing" from anon, authenticated;
