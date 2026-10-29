-- G3: grade-screen results for live eBay listing photos (api/screen.py). One row per listing photo, so a photo is
-- screened once. verdict: ceiling | no_issue | cant_judge | error. A reject filter only, never a grade promise.
create table if not exists "ListingScreen" (
  "externalId" text not null,
  "imageUrl" text not null,
  "gated" boolean not null default false,
  "gate" jsonb,
  "verdict" text not null,
  "summary" text not null,
  "report" jsonb,
  "screenedAt" timestamptz not null default now(),
  primary key ("externalId", "imageUrl")
);
alter table "ListingScreen" enable row level security;
