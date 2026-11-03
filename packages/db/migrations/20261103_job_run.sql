-- J1: one row per scheduled job run (Prices Sun, Players Mon, Photos monthly), shown on Radar home ("/").
-- Applied by hand only after Karim's yes. Idempotent: safe to re-run.
--
-- jsonb shapes ("card" = the card's display name at run time, so the panel needs no join):
--   "changes"   = [{ kind: 'value'|'card_added'|'photo'|'estimate'|'cost', cardId, card, from?, to?, source? }]
--   "photoList" = [{ cardId, card, side: 'front'|'back', reason }]
create table if not exists "JobRun" (
  "id"          uuid primary key default gen_random_uuid(),
  "job"         text not null check ("job" in ('prices', 'players', 'photos')),
  "ranAt"       timestamptz not null,
  "finishedAt"  timestamptz,
  "status"      text not null check ("status" in ('complete', 'incomplete')),
  "openCount"   integer not null default 0 check ("openCount" >= 0),
  "summary"     text not null,                    -- the report's first lines
  "reportPath"  text,                             -- claude.ai project doc path, e.g. audits/2026-11-09-prices.md
  "changes"     jsonb not null default '[]',
  "photoList"   jsonb not null default '[]',
  "createdAt"   timestamptz not null default now(),
  constraint "JobRun_status_open_check" check (("status" = 'incomplete') = ("openCount" > 0))
);
create index if not exists "JobRun_job_ranAt_idx" on "JobRun" ("job", "ranAt" desc);

alter table "JobRun" enable row level security;
revoke all on "JobRun" from anon, authenticated;
