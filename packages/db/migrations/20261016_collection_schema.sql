-- A1: Collection schema (value engine + Collection section).
-- Apply in Supabase SQL editor. Idempotent.

create table if not exists "Submission" (
  "id"            text primary key,            -- PSA order number, e.g. 26913695
  "subNumber"     text,
  "grader"        text not null default 'PSA',
  "serviceLevel"  text,
  "feePerCard"    numeric(10, 2),
  "status"        text,
  "arrivedOn"     date,
  "estComplete"   text,
  "createdAt"     timestamptz not null default now()
);

create table if not exists "Card" (
  "id"            uuid primary key default gen_random_uuid(),
  "status"        text not null check ("status" in ('graded', 'raw', 'at_grader', 'sold', 'sealed')),
  "item"          text not null,              -- full description as listed
  "player"        text,
  "year"          text,
  "setName"       text,
  "cardNumber"    text,
  "parallel"      text,
  "printRun"      integer,                    -- /N, null if unnumbered
  "grader"        text,                       -- PSA, BGS, SGC, CGC; null if raw
  "grade"         text,                       -- '10', '9.5', 'AUTH'
  "cert"          text unique,
  "qty"           integer not null default 1,
  "submissionId"  text references "Submission" ("id"),
  "dateAdded"     date,
  "imagePath"     text,                       -- Supabase Storage path
  "notes"         text,
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);
create index if not exists "Card_player_idx" on "Card" ("player");
create index if not exists "Card_status_idx" on "Card" ("status");

-- Observed comps per card and grade, by source and date. Append-only.
create table if not exists "CardComp" (
  "id"            bigserial primary key,
  "cardId"        uuid not null references "Card" ("id") on delete cascade,
  "grade"         text not null,              -- 'raw', 'PSA 10', 'PSA 9', 'PSA 8', 'BGS 9.5', ...
  "price"         numeric(12, 2) not null,
  "sampleSize"    integer not null default 1,
  "method"        text not null default 'median', -- median, mean, single
  "source"        text not null,              -- cardladder_manual, psa_api, workbook_import, ...
  "asOf"          date not null,
  "createdAt"     timestamptz not null default now(),
  unique ("cardId", "grade", "source", "asOf")
);
create index if not exists "CardComp_card_idx" on "CardComp" ("cardId", "asOf" desc);

-- Population / gem rate per card spec (PSA pop).
create table if not exists "CardPop" (
  "cardId"        uuid not null references "Card" ("id") on delete cascade,
  "asOf"          date not null,
  "total"         integer,
  "gem10"         integer,
  "pop9"          integer,
  "gemRate"       numeric(6, 4),
  "source"        text not null default 'psa_api',
  primary key ("cardId", "asOf")
);

-- Every dollar in or out: purchase, grading fee, upcharge, shipping, sale.
create table if not exists "LedgerEntry" (
  "id"            bigserial primary key,
  "cardId"        uuid references "Card" ("id") on delete cascade,
  "submissionId"  text references "Submission" ("id"),
  "kind"          text not null check ("kind" in ('purchase', 'grading_fee', 'upcharge', 'shipping', 'other_fee', 'sale')),
  "amount"        numeric(12, 2) not null,    -- positive = money out, negative = money in (sale)
  "occurredOn"    date,
  "source"        text,                       -- ebay, topps_now, psa, manual
  "ref"           text,                       -- eBay order id, PSA order id
  "createdAt"     timestamptz not null default now()
);
create index if not exists "LedgerEntry_card_idx" on "LedgerEntry" ("cardId");

-- Editable model inputs (fees, multiples, band ratios). Mirrors workbook Assumptions tab.
create table if not exists "Assumption" (
  "key"           text primary key,
  "value"         numeric(12, 4) not null,
  "note"          text,
  "updatedAt"     timestamptz not null default now()
);
