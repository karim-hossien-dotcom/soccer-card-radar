-- BulkCard: cheap intake cards from the CollX export (Nov 17-18 2026). Applied to Supabase Nov 19 2026 (migration "bulk_card").
-- Separate from "Card" on purpose: the Vault reads Card with one select("*") and PostgREST returns at most 1,000 rows.
-- Not part of Vault value or the pricing jobs; collxValue is CollX's estimate, not a comp. Promote a row to Card to price it.
create table if not exists "BulkCard" (
  id uuid primary key default gen_random_uuid(),
  "collxId" text not null unique,
  player text,
  team text,
  year text,
  "setName" text,
  parallel text,
  "cardNumber" text,
  flags text,
  "printRun" int,
  "isAuto" boolean not null default false,
  sport text,
  qty int not null default 1 check (qty >= 1),
  "collxValue" numeric(10,2),
  "photoFront" text,
  "photoBack" text,
  "ebayStatus" text not null default 'unknown' check ("ebayStatus" in ('in_lot_draft','single_draft','live','sold','held','not_listed','unknown')),
  "ebayRef" text,
  "ebayTitle" text,
  notes text,
  "promotedCardId" uuid references "Card"(id),
  "addedOn" date,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
alter table "BulkCard" enable row level security;
comment on table "BulkCard" is 'Bulk/cheap intake cards (CollX export Nov 17-18 2026). Not part of Vault value or pricing jobs; collxValue is CollX''s estimate, not a comp. Promote to Card to price.';
