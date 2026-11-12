-- PC3: open items tracked to closure (F8). Each scheduled job's open item stays on Radar home ("/", Latest runs panel)
-- with its age until the job closes it with closedHow. Applied by hand only after Karim's yes. Idempotent: safe to re-run.
--
-- Jobs upsert by (job, cardId, title); at most one OPEN row per key (a closed key that comes back is a new row):
--   new / still open:
--     insert into "OpenItem" (job, "cardId", title, reason, "firstSeen", "lastSeen") values ($1, $2, $3, $4, now(), now())
--     on conflict (job, "cardId", title) where "closedAt" is null
--     do update set "lastSeen" = excluded."lastSeen", reason = excluded.reason;
--   resolved:
--     update "OpenItem" set "closedAt" = now(), "closedHow" = $4
--     where job = $1 and "cardId" is not distinct from $2 and title = $3 and "closedAt" is null;
-- An open item the run did not mention stays open (it only closes with a closedHow).
create table if not exists "OpenItem" (
  "id"         uuid primary key default gen_random_uuid(),
  "job"        text not null check ("job" in ('prices', 'players', 'photos')),
  -- "Card".id, no FK so a Card delete never fails on (or erases) item history; null = not about one card
  "cardId"     uuid,
  "title"      text not null check (length(btrim("title")) > 0),
  "reason"     text not null default '',
  "firstSeen"  timestamptz not null default now(),
  "lastSeen"   timestamptz not null default now(),
  "closedAt"   timestamptz,
  "closedHow"  text,
  constraint "OpenItem_seen_order_check" check ("lastSeen" >= "firstSeen"),
  constraint "OpenItem_closed_how_check" check (("closedAt" is null) = ("closedHow" is null)),
  constraint "OpenItem_closed_how_text_check" check ("closedHow" is null or length(btrim("closedHow")) > 0)
);
create unique index if not exists "OpenItem_open_key_idx" on "OpenItem" ("job", "cardId", "title") nulls not distinct
  where "closedAt" is null;
create index if not exists "OpenItem_open_firstSeen_idx" on "OpenItem" ("firstSeen") where "closedAt" is null;

alter table "OpenItem" enable row level security;
revoke all on "OpenItem" from anon, authenticated;
