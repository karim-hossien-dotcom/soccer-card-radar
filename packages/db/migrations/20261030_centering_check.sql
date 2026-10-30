-- G7: border lines confirmed (or adjusted) by the owner on the confirm screen. One row per photographed side.
-- measured = what borders.py found; confirmed = the lines after the owner's nudges (mm from each cut edge).
create table if not exists "CenteringCheck" (
  "id" uuid primary key default gen_random_uuid(),
  "createdAt" timestamptz not null default now(),
  "cardId" uuid references "Card"("id") on delete set null,
  "side" text not null check ("side" in ('front', 'back')),
  "imageHash" text not null,
  "pxPerMm" real not null,
  "measured" jsonb not null,
  "confirmed" jsonb not null,
  "adjusted" boolean not null,
  "lr" real,       -- worst-point split, larger share (0.5-1)
  "tb" real,
  "lrMid" real,
  "tbMid" real
);
create index if not exists "CenteringCheck_card" on "CenteringCheck" ("cardId", "createdAt" desc);
alter table "CenteringCheck" enable row level security; -- server-side service role only
