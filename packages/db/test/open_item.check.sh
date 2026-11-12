#!/usr/bin/env bash
# PC3 check: run the OpenItem migration against a THROWAWAY Postgres (never the Supabase project) and verify the
# upsert/close SQL documented in the migration, constraints and grants. Fixture rows only.
# Usage: PGURL=postgres://postgres@localhost:5433/postgres bash packages/db/test/open_item.check.sh
set -u
: "${PGURL:?set PGURL to a throwaway Postgres}"
case "$PGURL" in *supabase*|*zsubyufjenapkgkwpqzv*) echo "refusing: PGURL looks like Supabase"; exit 2;; esac
MIG="$(dirname "$0")/../migrations/20261112e_open_item.sql"
export PGOPTIONS="-c client_min_messages=warning"
q() { psql "$PGURL" -v ON_ERROR_STOP=1 -qAtX "$@"; }
fail=0
ok()  { echo "ok   $1"; }
bad() { echo "FAIL $1"; fail=1; }
q -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end \$\$;
      grant usage on schema public to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;" >/dev/null
q -c 'drop table if exists "OpenItem"' >/dev/null
q -f "$MIG" >/dev/null && ok "migration applies" || bad "migration applies"
q -f "$MIG" >/dev/null && ok "migration re-runs (idempotent)" || bad "migration re-runs"

C1=00000000-0000-0000-0000-000000000001
# upsert exactly as documented in the migration header
up() { q -c "insert into \"OpenItem\" (job, \"cardId\", title, reason, \"firstSeen\", \"lastSeen\") values ('$1', $2, '$3', '$4', $5, $5)
  on conflict (job, \"cardId\", title) where \"closedAt\" is null do update set \"lastSeen\" = excluded.\"lastSeen\", reason = excluded.reason" >/dev/null; }
cl() { q -c "update \"OpenItem\" set \"closedAt\" = now(), \"closedHow\" = '$4' where job = '$1' and \"cardId\" is not distinct from $2 and title = '$3' and \"closedAt\" is null" >/dev/null; }
n() { q -c "select count(*) from \"OpenItem\" where $1"; }

up prices "'$C1'" 'No graded comps' 'r1' "'2026-11-01T00:00:00Z'" && ok "new -> insert" || bad "new -> insert"
up prices "'$C1'" 'No graded comps' 'r2' "'2026-11-08T00:00:00Z'"
[ "$(n "title='No graded comps'")" = 1 ] && ok "still open -> same row" || bad "still open -> same row"
[ "$(q -c "select \"firstSeen\" = '2026-11-01T00:00:00Z' and \"lastSeen\" = '2026-11-08T00:00:00Z' and reason = 'r2' from \"OpenItem\" where title='No graded comps'")" = t ] \
  && ok "still open -> lastSeen + reason updated, firstSeen kept" || bad "lastSeen update"
up players null 'CL login expired' '' "'2026-11-02T00:00:00Z'"; up players null 'CL login expired' '' "'2026-11-09T00:00:00Z'"
[ "$(n "title='CL login expired'")" = 1 ] && ok "null cardId upserts to one row (nulls not distinct)" || bad "null cardId dedupe"
up photos "'$C1'" 'No graded comps' '' "now()"
[ "$(n "title='No graded comps'")" = 2 ] && ok "same card+title, other job = separate item" || bad "job in key"
cl prices "'$C1'" 'No graded comps' 'eBay comps found'
[ "$(n "job='prices' and \"closedAt\" is not null and \"closedHow\"='eBay comps found'")" = 1 ] && ok "resolved -> closedAt + closedHow" || bad "close"
cl players null 'CL login expired' 'logged in again'
[ "$(n "job='players' and \"closedAt\" is not null")" = 1 ] && ok "close with null cardId" || bad "close null cardId"
up prices "'$C1'" 'No graded comps' 'back' "now()"
[ "$(n "job='prices' and title='No graded comps'")" = 2 ] && [ "$(n "job='prices' and title='No graded comps' and \"closedAt\" is null")" = 1 ] \
  && ok "closed key that comes back = new open row" || bad "reopen"
[ "$(n "\"closedAt\" is null")" = 2 ] && ok "panel query (closedAt is null) drops closed items" || bad "panel query"

bi() { q -c "insert into \"OpenItem\" (job, title $1) values ('${2:-prices}', 't' $3)" >/dev/null 2>&1; }
bi "" foo "" && bad "job 'foo' rejected" || ok "job 'foo' rejected"
q -c "insert into \"OpenItem\" (job, title) values ('prices', '  ')" >/dev/null 2>&1 && bad "blank title rejected" || ok "blank title rejected"
bi ', "closedAt"' prices ", now()" && bad "closedAt without closedHow rejected" || ok "closedAt without closedHow rejected"
bi ', "closedHow"' prices ", 'x'" && bad "closedHow without closedAt rejected" || ok "closedHow without closedAt rejected"
bi ', "firstSeen", "lastSeen"' prices ", now(), now() - interval '1 day'" && bad "lastSeen < firstSeen rejected" || ok "lastSeen < firstSeen rejected"
for r in anon authenticated; do
  q -c "set role $r; select count(*) from \"OpenItem\"" >/dev/null 2>&1 && bad "$r select denied" || ok "$r select denied"
  q -c "set role $r; insert into \"OpenItem\" (job, title) values ('prices', 'x')" >/dev/null 2>&1 && bad "$r insert denied" || ok "$r insert denied"
done
[ "$(q -c "select relrowsecurity from pg_class where relname='OpenItem'")" = t ] && ok "RLS enabled" || bad "RLS enabled"
q -c 'drop table "OpenItem"' >/dev/null
exit $fail
