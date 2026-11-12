# Vault: every value shows the sales behind it (Karim, Nov 12 2026: "make sure these are all factors the reviewer looks into")

Status: approved (Karim, Nov 12 2026)

Goal: every Vault value carries its kept and rejected sales, so Karim and the verifier can see in seconds whether a wrong
card, parallel, auto, grade or his own sale got in.
Success metric: open any Vault card -> under each grade's value, n / date range / source and the kept-sale list are there,
or the value is flagged amber "no evidence — old value". No new page, no new control outside the existing card drawer.

Rules this ticket implements: card-comps skill "Sale check" (7 checks) and "Verifier gate"; docs/decisions.md 2026-11-12.

Order: V3a (schema + drawer, visible: amber flags on every current value) -> coordinator applies the migration after
Karim's yes -> V3b (prices job and researcher write the sales) lands before the next Sunday prices run (Nov 15), so values
turn from amber to evidenced as they are refreshed.

---

## V3a CompSale table + evidence under each grade's value in the card drawer
Size: M (one day). Branch: feat/V3a.

Status: shipped Nov 12 2026 (migration applied). Engineer change note: migration `20261112b_comp_sale.sql` (file only, NOT
applied; run twice on a scratch local Postgres 16: no error; kept+reason, bad code, bad source, price 0 and duplicate
all rejected; CardComp delete cascades; RLS on, anon/authenticated revoked incl. the id sequence). CompSale types;
`id` in COMP_COLS/COMP_COLS_LEGACY; `lib/comp-evidence.ts` + tests; `GET /api/comps?cardId=` (requireAdmin, fixture
`compSales`, missing table 42P01/PGRST205 -> []); drawer "Price records" evidence line under the `vaultComp` row per
grade. Open questions used their defaults: estimate with no kept sale -> amber "no exact sale — estimate"; owner values
amber "no evidence — old value". Extra: rejected counts also show under an amber flag (only-rejected comps); sources
are listed most kept sales first; only http(s) URLs become links. UAT `v3.uat.js` 62/62 at 1280 + 390 (screenshots in
docs/backlog/uat/V3/, synthetic); v1, v2, tb2 UAT re-run green; dashboard 111 + shared 78 tests, `pnpm build` green.
Not covered by an automated test: AC 6 against a real pre-migration database (covered by the isMissingTable unit test
and the fixture path only).

Review (reviewer, Nov 12 2026; diff 41d2c69..20b5f2a, fixes in the review(V3a) commit on top):
- Important, fixed: reject codes did not match comp-guard (origin/feat/PC1-PC2 packages/shared/src/comp-guard.ts emits
  `parallel_word`, `auto_mismatch`, `grade_mismatch`, `lot`, `own_sale`, `sale_age`), so V3b could not store its output
  as is. Renamed in the migration CHECK and comment (20261112b_comp_sale.sql:3-7, :28), `RejectReason`/`REASON_LABEL`
  (lib/comp-evidence.ts:6-30), database.types.ts, unit tests and the fixture. Labels Karim sees are unchanged. `card`
  (check 1) and `unclear` (check 6) have no comp-guard code and stay as set by the checker. Tie order of the rejected
  counts is now by label, not code (comp-evidence.ts:57).
- Important, fixed: the amber flag used `s.warn` = `--loss` #c2412d (red-orange, same as losses/errors). New token
  `--amber: #b45309` (globals.css:25; 5.0:1 on the white drawer) and `.amber` (collection.module.css:147) on the flag
  (collection-view.tsx:362). The app has one palette (no dark theme); UAT now asserts rgb(180, 83, 9) in a light and a
  `colorScheme: 'dark'` browser. V3 screenshots regenerated.
- Important, fixed: v3.uat.js POSTed an "Update comps" row into the fixture and told the next run to regenerate it. It
  now needs `COLLECTION_FIXTURE` (same path as the server), restores the file byte for byte in a `finally`, and asserts
  the restore. The last page also used `newPage({ viewport })` (ignored option): now a 1280 context.
- Minor, fixed: `export type NewComp ={` spacing (load.ts:213).
- Minor, left: the migration's `if not exists` constraint guards mean a DB that already ran an older copy keeps the
  old reason CHECK; nothing is applied yet, so the coordinator must apply this version.
- Minor, left: no unit test ties REASON_LABEL to comp-guard's codes (comp-guard is not on main yet); add one in V3b or
  when PC1 merges.
- Checked, no finding: AC 1-9 (below); evidence hangs off `vaultComp` (same object, collection-view.tsx:322); rejected
  rows never in n or the kept list (kept requires `kept && !rejectReason`); display only (no value/total/max-bid code
  touched beyond reading `id`); no new page or control; no secrets, real URLs, usernames or costs in diff, fixture or
  screenshots (synthetic, example.com); no bids, scans or env changes; no fuzzy matching.

QA (Nov 12 2026, worktree at the review commit): `pnpm install --frozen-lockfile` ok; `pnpm build` 5/5; dashboard tests
111/111; shared 78/78; grade-screen test_borders + test_api green (1 pre-existing skip). Migration on a scratch local
Postgres 16 (not the live project): ran twice without error; kept+reason, rejected without reason, old code 'parallel',
duplicate sale, bad source and price 0 all rejected; new codes accepted; CardComp delete cascaded 4 -> 0; RLS on;
anon/authenticated have no table or sequence privilege. UAT (Chromium 1194, AUTH_PASSWORD empty, port 3100, synthetic
fixtures, 1280 + 390): v3 65/65 (incl. dark-scheme amber and fixture restored), v1 80/80, v2 48/48; all three fixture
files byte-identical after the run. AC 6 against a real pre-migration database is still only covered by the
isMissingTable unit test and the fixture path. Not merged; migration not applied.

Why: today the drawer's "Price records" shows grade, price, method, date and nothing about which sales made the number.
The Messi Select #4 / #204 rows (decisions 2026-11-12) were built on Silver/Purple parallels and CGC Authentic; nobody
could see that from the Vault.

Scope:
- `packages/db/migrations/20261112b_comp_sale.sql` (file only; the coordinator applies it after Karim's yes). Idempotent,
  same pattern as 20261103_job_run.sql:
  - `"CompSale"`: `"id"` bigserial pk; `"compId"` bigint not null references `"CardComp"("id")` on delete cascade;
    `"date"` date not null; `"price"` numeric(12,2) not null check > 0; `"title"` text not null; `"source"` text not null
    check in ('ebay', 'cardladder', 'psa_apr'); `"url"` text null; `"kept"` boolean not null; `"rejectReason"` text null;
    `"createdAt"` timestamptz default now().
  - check: `kept = ("rejectReason" is null)` (kept rows have no reason; rejected rows must have one).
  - check: `"rejectReason"` in the sale-check codes: 'card', 'parallel_word', 'auto_mismatch', 'grade_mismatch', 'lot',
    'own_sale', 'unclear', 'sale_age' (checks 1-7; 'lot' split out of check 4; review: renamed to comp-guard's codes). Fixed codes, not free text: nothing personal (eBay username, ledger cost)
    can land in a reason, and the drawer can label them.
  - unique (`"compId"`, `"source"`, `"date"`, `"price"`, `"title"`) so a job re-run cannot double a sale.
  - index on (`"compId"`); RLS enabled; `revoke all ... from anon, authenticated` (as JobRun).
- `packages/db/src/database.types.ts`: add CompSale.
- `apps/dashboard/src/lib/value-est.ts`: add `id` to `COMP_COLS` and `COMP_COLS_LEGACY`.
- `apps/dashboard/src/lib/comp-evidence.ts` (new, pure, unit-tested): `compEvidence(comp, sales)` ->
  `{ kind: "sales", n, from, to, sources, kept: [{date, price, title, url, source}] (newest first), rejected: [{reason, count}] }`
  or `{ kind: "none", text: "no evidence — old value" }` when the comp has zero kept sales. Reason labels:
  card "other card", parallel "other parallel", auto "auto/relic", grade "other grade/grader", lot "lot", own "Karim's own sale/buy",
  unclear "unclear title/photo", age "older than 90 days".
- `apps/dashboard/src/app/api/comps/route.ts`: add `GET ?cardId=<uuid>` -> CompSale rows for that card's comps
  (join through CardComp.cardId). Same `requireAdmin` guard as POST. Fixture mode (`COLLECTION_FIXTURE`) reads
  `compSales` from the fixture file. Table missing (Postgres 42P01, before the migration) -> `[]`, not an error.
  Lazy per card, not in load.ts: loading every sale for every card into the Vault page would grow with the table.
- `apps/dashboard/src/app/collection/collection-view.tsx` (card drawer, existing "Price records" section only): the
  drawer fetches the card's sales on open. For the newest comp of each grade (`vaultComp`, same row the value uses), the
  row gets an evidence line under it: "n=5 · Aug 20 – Nov 9 · eBay, Card Ladder" + a `<details>` "5 sales" list
  (date, price, title linked to url when present, source) + "3 rejected: 2 other parallel, 1 Karim's own sale/buy".
  Zero kept sales -> "no evidence — old value" in the existing amber `s.warn` style. Older comps of the same grade stay
  as plain rows (no evidence line). While loading: "loading sales…"; fetch error: "sales not loaded" (muted, not amber).
- `apps/dashboard/test/uat/make-v3-fixture.js` + `test/uat/v3.uat.js`: synthetic cards only.

Acceptance criteria:
1. Migration file exists, is idempotent (runs twice without error), enforces both checks, the unique key, cascade on
   CardComp delete, RLS on and anon/authenticated revoked. Not applied by the engineer.
2. Drawer: for every grade that has a comp, the newest comp shows n, date range (oldest-newest kept sale), distinct
   sources, and an expandable list of kept sales (date, price, title link) newest first.
3. Rejected sales show as a count per reason label, never in the kept list, never counted in n.
4. A comp with no kept sales (none at all, or only rejected) shows "no evidence — old value" in amber. This includes
   workbook_import, owner_set and ratio_to_base rows and comps saved through the "Update comps" paste.
5. Unit test (comp-evidence.test.ts): a comp with zero kept sales returns `kind: "none"` with the amber text; a comp with
   only rejected sales returns the same; a comp with kept + rejected returns correct n, range, sources and reason counts.
   UAT asserts the amber text is rendered in the drawer for the no-sales fixture card. Both fail without the change.
6. Before the migration is applied (table missing) the Vault loads, values are unchanged, every comp shows the amber flag.
7. Values, totals, max bids and "Price as" are unchanged (evidence is display only): existing dashboard tests and
   v1/v2 UAT pass.
8. No new page, tab, button bar or second price list: only the existing drawer's "Price records" rows gain the evidence.
9. Works at 1280 and 390 wide; titles wrap, the list does not widen the drawer.

Test plan (qa):
- `pnpm install --frozen-lockfile`, `pnpm build`; dashboard and shared tests green.
- Run the migration twice against a scratch local Postgres (or a `begin; ... rollback;` on a disposable DB), never the
  live project: no error; insert a kept row with a reason -> rejected by the check; duplicate sale -> rejected by unique;
  delete the parent CardComp -> CompSale rows gone.
- Playwright `v3.uat.js` with `make-v3-fixture.js` (AUTH_PASSWORD empty, port 3100) at 1280 and 390. Fixture cards:
  (a) raw card, raw comp with 3 kept eBay + 1 Card Ladder sale and 2 rejected (parallel, own);
  (b) graded PSA 10 card whose comp has only rejected sales (grade, auto) -> amber;
  (c) card with a workbook_import comp and no sales -> amber;
  (d) raw card with comps at raw, PSA 9 and PSA 10, an older raw comp with sales (older row must show no evidence line).
  Assert n, range, sources, expander contents, reason counts, amber text, title links.
- Re-run v1/v2 UAT: totals unchanged.
- Screenshots to docs/backlog/uat/V3/: synthetic fixture only (public repo): no real costs, no real eBay usernames,
  no real listing URLs (use example.com).

Risk:
- Public repo: fixtures and screenshots must be synthetic; the migration and code hold no data. CompSale itself lives
  only in the database (RLS + revoke), never in git.
- Table growth: weekly refresh of every card x ~10-30 sales (kept + rejected) per comp. At ~200 cards x 2-3 grades that
  is roughly 5-15k rows a week, ~0.5M a year. Fine for Postgres with the compId index; the drawer reads one card at a
  time. If it matters later, prune sales of superseded comps older than a year (not in this ticket).
- Every current value goes amber on day one (nothing has a sale list yet). That is the honest state; V3b fixes it as
  the Sunday job refreshes cards. Expect a full Vault of amber until then.

Reviewer checklist (Karim: "make sure these are all factors the reviewer looks into"):
- Every sale-check factor is representable and visible: wrong card, parallel, auto, grade/grader, lot, own sale/buy,
  unclear title, age. Each has a code in the check constraint, a label in comp-evidence.ts, and a fixture sale in UAT.
- Rejected sales can never inflate n or appear in the kept list.
- The evidence line hangs off the same comp `vaultComp` uses for the value (not just any comp of that grade).
- No reason text, fixture or screenshot can carry a cost, eBay username or real URL.
- Display only: no valuation or totals change.

---

## V3b Prices job, researcher and verifier write and read the sales
Size: S (half a day; docs and agent instructions, no app code). Branch: feat/V3b. Depends on the migration being applied.

Why: the table is empty until every new CardComp is written with its sales. The verifier gate also needs the kept list
in the data it checks, not only in the report.

Scope:
- `.claude/skills/card-comps/SKILL.md` "Sale check": replace "into the job report" with "into the job report AND CompSale
  for the new CardComp (kept rows with no reason; rejected rows with one reason code)", list the 8 codes and their check
  numbers, and give one SQL template: insert CardComp ... returning id, then insert CompSale rows in the same transaction.
  A CardComp insert without its CompSale rows is not allowed. Estimates (thin_blend etc.): store the exact-card sales
  used as inputs as kept rows; proxy and ratio inputs stay in the report only (see open question 1).
- "Verifier gate": the verifier re-applies the sale check to the CompSale rows written with the proposal (kept and
  rejected), and also rejects a value when n (kept rows) does not match the comp's sampleSize or a median comp's price is
  not the median of its kept prices.
- `.claude/agents/researcher.md`: every proposed value lists kept + rejected sales with reason codes, ready for CompSale.
- `.claude/agents/price-auditor.md`: snapshot holds CompSale too; add check "value with no kept sales -> list as
  'no evidence', propose a refresh" and "kept sale failing any sale check -> error".
- Coordinator (not engineer): add CompSale to the `.snapshots/<date>-prices.json` export and the Sunday prices scheduled
  task prompt (insert sales with each CardComp). Logged in docs/decisions.md.

Acceptance criteria:
1. SKILL.md, researcher.md and price-auditor.md say the same thing about CompSale (codes, kept/rejected, same transaction).
2. The SQL template runs on a scratch DB with the V3a migration and fails the reason check if a kept row carries a reason.
3. After the next prices run, every CardComp it inserted has at least one CompSale row (kept or rejected); query in the
   QA note: `select c.id from "CardComp" c left join "CompSale" s on s."compId" = c.id where c."createdAt" > <run start> and s.id is null` returns 0 rows.
4. The run's report lists the same kept/rejected sales as CompSale for a sample of 5 cards.

Test plan (qa): AC 2 on a scratch DB; AC 3-4 read-only against the live DB after the Sunday run (select only, no writes);
open 3 refreshed cards in the Vault drawer and confirm the amber flag is gone and the lists match the report.

Risk: the scheduled task lives on Karim's computer, outside the repo: if the coordinator does not update its prompt,
V3b ships docs that nothing runs. Card Ladder rate limits are unchanged (sales are already read; this only stores them).

---

## Open questions for Karim (defaults apply if he doesn't answer)
1. Estimates with no exact-card sale (proxy-only thin_blend): Karim's text says amber "no evidence — old value", but
   such a value is new, not old. Default: same amber style, text "no exact sale — estimate". Say if you want the
   literal text for every case.
2. Owner values (owner_set, ratio_to_base) with no sale list go amber too (AC 4). Default: yes, they have no evidence on
   record; Mainoo Gold /50's sales could be back-filled from the Oct 30 worked example if you want it clean.

## Not in this ticket (flagged)
- Back-filling sales for existing comps: they refresh weekly anyway (decision 2026-11-12, all cards older than 6 days).
- Pruning old CompSale rows, a "value ≠ median of kept sales" badge in the UI, sales on the Snipe board: later, if needed.
