-- A5: weekly value snapshot per card (week = ISO Monday, UTC). Latest load in a week wins.
create table if not exists "CardValueSnapshot" (
  "cardId"     uuid not null references "Card" ("id") on delete cascade,
  "week"       date not null,
  "status"     text not null,
  "valueNow"   numeric(12, 2),
  "psa10"      numeric(12, 2),
  "psa9"       numeric(12, 2),
  "psa8"       numeric(12, 2),
  "cost"       numeric(12, 2),
  "createdAt"  timestamptz not null default now(),
  primary key ("cardId", "week")
);
create index if not exists "CardValueSnapshot_week_idx" on "CardValueSnapshot" ("week" desc);
alter table "CardValueSnapshot" enable row level security;
revoke all on table "CardValueSnapshot" from anon, authenticated;
