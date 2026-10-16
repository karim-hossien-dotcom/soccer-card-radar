-- C1: snipe board. Targets (card spec + comps + how to recognise it in an eBay title)
-- and researcher-sourced player form, which only counts once Karim approves it.
create table if not exists "SnipeTarget" (
  "id"           uuid primary key default gen_random_uuid(),
  "actionId"     text not null,                 -- research-engine player id (lane, signal, tier)
  "card"         text not null,                 -- e.g. 2014 Panini Prizm World Cup #161 Cristiano Ronaldo Silver
  "query"        text not null,                 -- eBay search the daily scan runs for this card
  "mustInclude"  text[] not null default '{}',  -- every term must appear in the listing title (a|b = either)
  "exclude"      text[] not null default '{}',  -- any of these in the title = not this card
  "raw"          numeric(12, 2),
  "psa9"         numeric(12, 2),
  "psa10"        numeric(12, 2),
  "popTotal"     integer,
  "pop9"         integer,
  "pop10"        integer,
  "printRun"     integer,
  "ssp"          boolean not null default false,
  "compsAsOf"    date,
  "confidence"   text,
  "notes"        text,
  "active"       boolean not null default true,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);
create index if not exists "SnipeTarget_action_idx" on "SnipeTarget" ("actionId");

create table if not exists "PlayerForm" (
  "actionId"     text not null,
  "asOf"         date not null,
  "season"       text,
  "club"         text,
  "league"       text,
  "scope"        text,                          -- league only / all competitions
  "age"          integer,
  "apps"         integer,
  "minutes"      integer,
  "goals"        integer,
  "assists"      integer,
  "avgRating"    numeric(4, 2),
  "ratingSource" text,
  "prior"        jsonb,                         -- previous season line when this one is thin
  "note"         text,
  "sources"      text[] not null default '{}',
  "approved"     boolean not null default false,
  "approvedAt"   timestamptz,
  "createdAt"    timestamptz not null default now(),
  primary key ("actionId", "asOf")
);

alter table "SnipeTarget" enable row level security;
alter table "PlayerForm"  enable row level security;
revoke all on "SnipeTarget", "PlayerForm" from anon, authenticated;

-- 20261016f: PSA spec id per target so the PSA refresh can update its pop; snipe gem haircut assumption.
alter table "SnipeTarget" add column if not exists "psaSpecId" integer, add column if not exists "popAsOf" date;
update "SnipeTarget" set "popAsOf" = '2026-10-08' where "popTotal" is not null and "popAsOf" is null;
insert into "Assumption" ("key","value","note") values ('snipe_gem_haircut', 0.6, 'Snipe: PSA pop gem rate x this for a random raw buy (pop is pre-screened submissions). Calibrate from your own PSA returns.') on conflict ("key") do nothing;

-- 20261016f: pop source for targets. psaCert = any PSA cert of this exact card; the PSA refresh
-- resolves it to a spec and keeps popTotal/pop9/pop10 current (popAsOf).
alter table "SnipeTarget" add column if not exists "psaCert" text;
alter table "SnipeTarget" add column if not exists "psaSpecId" integer;
alter table "SnipeTarget" add column if not exists "popAsOf" date;
