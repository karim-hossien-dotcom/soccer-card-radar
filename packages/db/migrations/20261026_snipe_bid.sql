-- C3: approve queue. One decision per eBay listing. Nothing here places a bid: an approved row is
-- Karim's instruction and max price, executed by hand (or by Gixen once C3c exists).
create table if not exists "SnipeBid" (
  "id"         uuid primary key default gen_random_uuid(),
  "externalId" text not null unique,          -- eBay item id
  "targetId"   uuid references "SnipeTarget"("id"),
  "title"      text,
  "url"        text,
  "endsAt"     timestamptz,
  "maxBid"     numeric(12, 2) not null check ("maxBid" >= 0),
  "status"     text not null check ("status" in ('approved', 'skipped', 'cancelled', 'won', 'lost')),
  "wonPrice"   numeric(12, 2),
  "createdAt"  timestamptz not null default now(),
  "updatedAt"  timestamptz not null default now()
);
alter table "SnipeBid" enable row level security;
revoke all on "SnipeBid" from anon, authenticated;
insert into "Assumption" ("key","value","note") values ('snipe_budget', 500, 'Snipe: spend cap per 14-day cycle (approved bids count at their max until they end).') on conflict ("key") do nothing;
