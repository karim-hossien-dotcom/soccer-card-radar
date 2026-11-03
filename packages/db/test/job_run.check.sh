#!/usr/bin/env bash
# J1 check: run the JobRun migration against a THROWAWAY Postgres (never the Supabase project) and verify constraints + grants.
# Usage: PGURL=postgres://postgres@localhost:5433/postgres bash packages/db/test/job_run.check.sh
set -u
: "${PGURL:?set PGURL to a throwaway Postgres}"
case "$PGURL" in *supabase*|*zsubyufjenapkgkwpqzv*) echo "refusing: PGURL looks like Supabase"; exit 2;; esac
MIG="$(dirname "$0")/../migrations/20261103_job_run.sql"
export PGOPTIONS="-c client_min_messages=warning"
q() { psql "$PGURL" -v ON_ERROR_STOP=1 -qAtX "$@"; }
fail=0
ok()  { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }
# Supabase roles, so the revoke has something to act on
q -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end \$\$;
      grant usage on schema public to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;" >/dev/null
q -c 'drop table if exists "JobRun"' >/dev/null
q -f "$MIG" >/dev/null && ok "migration applies" || bad "migration applies"
q -f "$MIG" >/dev/null && ok "migration re-runs (idempotent)" || bad "migration re-runs"
ins() { q -c "insert into \"JobRun\" (job, \"ranAt\", status, \"openCount\", summary) values ('$1', now(), '$2', $3, 's')" >/dev/null 2>&1; }
ins foo complete 0 && bad "job 'foo' rejected" || ok "job 'foo' rejected"
ins prices done 0 && bad "status 'done' rejected" || ok "status 'done' rejected"
ins prices complete 2 && bad "complete with openCount 2 rejected" || ok "complete with openCount 2 rejected"
ins prices incomplete 0 && bad "incomplete with openCount 0 rejected" || ok "incomplete with openCount 0 rejected"
ins prices complete 0 && ok "good prices row" || bad "good prices row"
ins players incomplete 2 && ok "good players row" || bad "good players row"
ins photos complete 0 && ok "good photos row" || bad "good photos row"
for r in anon authenticated; do
  q -c "set role $r; select count(*) from \"JobRun\"" >/dev/null 2>&1 && bad "$r select denied" || ok "$r select denied"
  q -c "set role $r; insert into \"JobRun\" (job, \"ranAt\", status, summary) values ('prices', now(), 'complete', 's')" >/dev/null 2>&1 && bad "$r insert denied" || ok "$r insert denied"
done
[ "$(q -c "select relrowsecurity from pg_class where relname='JobRun'")" = t ] && ok "RLS enabled" || bad "RLS enabled"
[ -n "$(q -c "select 1 from pg_indexes where indexname='JobRun_job_ranAt_idx'")" ] && ok "index (job, ranAt desc)" || bad "index"
q -c 'drop table "JobRun"' >/dev/null
exit $fail
