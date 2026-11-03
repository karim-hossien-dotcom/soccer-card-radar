# Backlog: Job results panel (Radar home)

Source: Karim, 2026-11-03 (docs/decisions.md: "results-only dashboard on Radar home approved").
Success metric: after the next Sunday Prices run, Karim opens the home page on his phone and sees that run's status,
counts, changes and "Take photo" list without opening the claude.ai report.
Order: J1 -> J2 -> J3 (engineer); J4 (coordinator) after J1 is applied.
Status: J1, J2, J3 **ready for prod** (branch feat/J-job-results; QA 2026-11-03 below; waiting for Karim's "ship"); J4 **approved**, owner coordinator (blocked on J1 applied).
Coordinator decision 2026-11-03: panel at "/" replacing the redirect; nav unchanged.

## Change notes (engineer, 2026-11-03)
- J1: packages/db/migrations/20261103_job_run.sql (NOT applied to Supabase) + "JobRun" type in packages/db/src/database.types.ts.
  packages/db/test/job_run.check.sh runs it twice against a throwaway Postgres (refuses Supabase URLs): idempotent; the 4 bad
  inserts fail; 1 good insert per job passes; anon/authenticated select and insert denied; RLS on; index present. 15/15 ok on local PG 16.
- J2: /collection?card=<id> opens that card's drawer (collection/page.tsx reads searchParams.card; collection-view.tsx
  initial `open`). Unknown id = normal grid. The ?card= param stays in the URL after closing (reload reopens it).
- J3: src/lib/job-runs.ts (`latestRuns`, `formatEt`, `countsLine`) + job-runs.test.ts (7 tests); app/page.tsx (server
  component, force-dynamic, 3 queries latest-per-job, fixture `jobRuns` in COLLECTION_FIXTURE) + app/latest-runs.tsx
  (server-rendered view, globals.css tokens, no new CSS module). Changes: value/cost/estimate rows show from -> to (source).
  The status line comes from status/openCount; the summary text is shown below it as written. Malformed items -> "n unreadable".
  UAT: test/uat/make-j3-fixture.js + test/uat/j3.uat.js (J2 + J3, 1280 and 390): 44/44 ok; C5 UAT 39/39 ok; screenshots in
  docs/backlog/uat/J3/. Grep: no fetch/POST/form/button in the new files. `pnpm build` green; dashboard tests 69/69.

## Review (reviewer, 2026-11-03; diff 8215693..cc5d0a9, fixes in f71c991)
Fixed (f71c991, review(J)):
- Important, J3: status line shown twice. Fixture/real summaries start with "Complete" / "Incomplete: 2 items open", rendered
  under the status line (latest-runs.tsx:23-24). job-runs.ts `summaryBody()` drops that first line when it agrees with
  status/openCount, keeps it when it disagrees (mismatch stays visible). Unit test added; UAT checks "Complete" appears once
  and Players no longer repeats "Incomplete: 2 items open".
- Important, J3 UAT: docs/backlog/uat/J3/vault-deeplink-{1280,390}.png showed the Salah drawer with real cost basis $800,
  ledger purchase and the "CL cost vs CSV My Cost" note (test/fixtures/collection.json = live rows, see B1 note). Removed;
  j3.uat.js no longer screenshots the drawer (J2 is still asserted). Synthetic Salah value 800 -> 700 so the home screenshots
  no longer echo his real cost; other synthetic from/to numbers checked against the fixture ledger: none match a real cost.
  Home screenshots regenerated and viewed: no costs from the Vault.
- J2 decision: closing the drawer now clears ?card= (collection-view.tsx `closeDrawer`, history.replaceState, no new history
  entry). Reason: reload/share of the URL reopened a drawer the user had closed. UAT checks URL cleared and reload stays closed.
Checked, no finding: J1 SQL matches the ticket column-for-column; RLS on + revoke all from anon, authenticated, same as
20261016e_snipe_board.sql:50-52; the dashboard reads with the service-role client (packages/db/src/index.ts:24), so the revoke
does not block "/". No fetch/POST/form/button in new files; no secrets in the diff; no valuation logic (display only);
nav unchanged, "/" replaces the redirect per the coordinator decision (no duplicate page).
Open, not fixed (outside this diff / not mine to decide):
- Critical, pre-existing, coordinator/Karim: apps/dashboard/test/fixtures/collection.json on public main (since d986d58, B1)
  holds live rows incl. costs, certs and notes. Needs a decision (synthetic fixture + history purge).
- feat/J-job-results was already on origin at cc5d0a9, so the two removed screenshots stay in that branch's history. Same data
  as the fixture already public on main, so no new exposure, but QA should **squash-merge** so they don't enter main's history.
- Minor: merging J3 before J1 is applied makes "/" show "Couldn't load job runs: ..." until the table exists. Ship J3 after
  J1 is applied, or accept the notice briefly.
- Not run here: packages/db/test/job_run.check.sh (no Postgres server in this sandbox; engineer reported 15/15 on PG 16).
Build/tests (after fixes): pnpm install --frozen-lockfile ok; pnpm build 5/5 ok; dashboard 70/70; shared 38/38;
grade-screen test_borders + test_api pass (1 pre-existing skip). UAT j3.uat.js 51/52: the 1 fail is smoke /dips 500
(no Supabase env in sandbox; /dips has no fixture mode and is untouched by this branch).

## QA (qa, 2026-11-03; branch at 3793bba)
Result: **pass**, all J1-J3 criteria. Nothing applied to Supabase; nothing merged.
Build/tests: pnpm install --frozen-lockfile ok; pnpm build 5/5; dashboard 70/70; shared 38/38; grade-screen test_borders +
test_api pass (1 pre-existing skip).

| Ticket | Criterion | Result | Evidence |
|---|---|---|---|
| J1 | Idempotent (if not exists) | pass | job_run.check.sh on throwaway local PG 16 (port 5433, not Supabase): applies, re-runs (NOTICE "already exists, skipping") |
| J1 | Rejects job 'foo', status 'done', complete+2, incomplete+0 | pass | check script 4/4; re-run by hand to confirm the errors are the intended ones: JobRun_job_check, JobRun_status_check, JobRun_status_open_check x2 |
| J1 | 1 good insert per job | pass | check script |
| J1 | anon/authenticated denied | pass | select + insert denied for both; by hand: "permission denied for table JobRun" |
| J1 | RLS on, index (job, ranAt desc) | pass | check script; total 15/15 ok |
| J1 | Nothing applied to Supabase | pass | no Supabase env in this sandbox; throwaway PG dropped after the run |
| J2 | ?card=<id> opens drawer (1280 + 390) | pass | j3.uat.js |
| J2 | Unknown id = normal grid, no error | pass | j3.uat.js |
| J2 | Close works (now also clears ?card=, reload stays closed) | pass | j3.uat.js |
| J2 | Existing Vault UAT unchanged | pass | c5.uat.js 39/39 (Snipe + Vault drawer, desktop + 390); see flake under Risks |
| J3 | latestRuns: fixed order, newest wins, missing job, counts per kind, malformed jsonb, ET at DST edge 2026-11-01 | pass | job-runs.test.ts (8 tests) |
| J3 | Panel: status line once, summary, absolute ET time, counts, reportPath as text, changes collapsed, links to /collection?card=, from -> to with source, Take photo only when non-empty | pass | j3.uat.js 48/48 for 1280 + 390 |
| J3 | 390px no horizontal scroll (collapsed + expanded) | pass | j3.uat.js |
| J3 | Clicking a change opens that Vault drawer | pass | j3.uat.js |
| J3 | No buttons/forms/fetch/POST in new files | pass | j3.uat.js (no button/form/input in main) + grep of page.tsx, latest-runs.tsx, job-runs.ts |
| J3 | DB error -> "Couldn't load job runs: ..." | pass | **added** test/uat/j3-error.uat.js (was untested): dev server without fixture/Supabase env, "/" 200 with the notice, no panel, no page errors, 1280 + 390: 8/8 |
| J3 | Smoke Snipe/Dips/Vault/Grading 200 | pass, except /dips | /snipe, /collection, /grading 200; /dips 500 = "Supabase env vars missing" (no fixture mode on /dips, file untouched by this branch, same as reviewer) |

Screenshots (QA run, viewed; synthetic numbers only, checked against the fixture's cost/price fields for the 5 linked cards: no match;
no Vault drawer shots): docs/backlog/uat/J3/home-collapsed-1280.png, home-collapsed-390.png, home-expanded-1280.png,
home-expanded-390.png.

Risks / notes for prod:
- **Order: apply J1 to Supabase (Karim's yes) before merging J3**, otherwise "/" shows "Couldn't load job runs: ..." until
  the table exists (j3-error.uat.js shows that path is clean, but it is what Karim would see).
- **Squash-merge** feat/J-job-results: the two removed cost-bearing drawer screenshots are in this branch's history (cc5d0a9).
- "/" no longer redirects to /snipe; bookmarks of "/" land on the Radar panel instead.
- Panel stays "No run logged yet" for all three jobs until J4 is in place.
- Pre-existing flake, not this branch: c5.uat.js failed 1 of 4 runs with a hydration mismatch at 390 on /snipe;
  snipe-view.tsx `endsIn()`/`agoShort()` render from Date.now() in a client component, so SSR and hydration can differ across a
  minute boundary. 3 reruns 39/39. Worth its own ticket.
- J1 check script: negative checks print "ok" if Postgres is unreachable (the insert fails for the wrong reason). Seen when
  the first PG start failed; harmless here because the positive checks failed loudly, but the script should exit early on a
  failed connection.
- Still open from review (coordinator/Karim): test/fixtures/collection.json on public main holds live rows incl. costs.

Note: on main, "/" only redirects to /snipe (apps/dashboard/src/app/page.tsx); there is no Radar home page to extend.
J3 replaces that redirect with the panel at "/" (same route, no new tab, no second page). The nav tabs stay as they
are; the "Card Radar" masthead link already points to "/". If Karim would rather keep "/" -> /snipe, J3 puts the
panel at the top of /snipe instead (same component, same criteria).

| ID | Ticket | Why | Scope | Acceptance criteria | Test plan (qa) | Risk | Size |
|---|---|---|---|---|---|---|---|
| J1 | JobRun table | Jobs need one place to record what they did | packages/db/migrations/20261103_job_run.sql (new; applied by hand only after Karim's yes). Table "JobRun": "id" uuid pk default gen_random_uuid(); "job" text not null check in ('prices','players','photos'); "ranAt" timestamptz not null; "finishedAt" timestamptz; "status" text not null check in ('complete','incomplete'); "openCount" integer not null default 0 check >= 0, and check (status = 'incomplete') = (openCount > 0); "summary" text not null (report's first lines); "reportPath" text (claude.ai project doc path, e.g. audits/2026-11-09-prices.md); "changes" jsonb not null default '[]'; "photoList" jsonb not null default '[]'; "createdAt" timestamptz not null default now(). Index ("job", "ranAt" desc). RLS enabled; revoke all from anon, authenticated (as 20261016e). Header comment documents the jsonb shapes: changes = [{ kind: 'value'\|'card_added'\|'photo'\|'estimate'\|'cost', cardId, card, from?, to?, source? }]; photoList = [{ cardId, card, side: 'front'\|'back', reason }]. card = display name at run time, so the panel needs no join. | File is idempotent (if not exists); constraints reject job 'foo', status 'done', complete with openCount 2, incomplete with openCount 0; anon/authenticated get permission denied; nothing applied to Supabase by the engineer | Review SQL; run it against a local/throwaway Postgres (not zsubyufjenapkgkwpqzv): 4 bad inserts fail, 1 good insert per job passes; `select` as anon fails | Low. Live apply needs Karim's yes | S |
| J2 | Vault deep link to a card | Panel card names must open that card in the Vault; today the drawer opens only by click | apps/dashboard/src/app/collection/page.tsx (read searchParams.card), collection-view.tsx (initial `open` = card with that id). No new control | /collection?card=<id> loads with that card's drawer open; unknown id = normal Vault, no error; closing the drawer works as before; existing Vault UAT unchanged | Playwright on COLLECTION_FIXTURE: valid id opens drawer (desktop + 390px), bad id shows grid, no page errors; B1/C5 Vault smoke still green | Low | S |
| J3 | "Latest runs" panel at "/" | Karim sees job results without reading reports; results only, no questions | apps/dashboard/src/lib/job-runs.ts + job-runs.test.ts (pure shaping helper, type-only imports like the other src/lib files); apps/dashboard/src/app/page.tsx (replace redirect with server component, `dynamic = "force-dynamic"`) + one small view file; loader reads JobRun via the existing `supabase` from @soccer-card-radar/db, latest row per job; fixture: `jobRuns` key in COLLECTION_FIXTURE (same pattern as grading/load.ts). Reuse globals.css tokens/classes, no new CSS module unless needed | Helper `latestRuns(rows)`: one entry per job in fixed order Prices, Players, Photos; newest ranAt wins; job with no row -> "No run logged yet"; counts per kind from `changes` (e.g. "12 values, 3 cards added, 2 costs, 1 photo, 4 estimates"); `photoList` length; malformed jsonb (not an array, missing cardId) -> item skipped and counted as "n unreadable", never throws. Panel per job: status line ("Complete" or "Incomplete: N open"), the summary text, run time in ET as an absolute date/time rendered on the server (no relative "x ago": avoids the hydration mismatch seen in C1's countdown), counts, reportPath shown as text; changes list collapsed by default (`<details>`), each card name links to /collection?card=<cardId>, value/cost rows show old -> new with source; "Take photo" list (card link + side + reason) shown only when non-empty. No buttons that answer, approve, write or call an API. No DB error -> notice text like other tabs ("Couldn't load job runs: ...") | Unit: `pnpm --filter @soccer-card-radar/dashboard test` incl. job-runs.test.ts (newest wins, missing job, counts per kind, malformed jsonb, ET formatting at a DST edge e.g. 2026-11-01). UAT on fixture (one complete prices run, one incomplete players run with 2 open, no photos run, 1 photo item): screenshots desktop 1280 and 390px, collapsed and expanded, to docs/backlog/uat/J3/; 390px no horizontal scroll; clicking a change opens that Vault drawer; no page errors; grep: no fetch/POST/form in the new files. `pnpm build` green; Snipe/Dips/Vault/Grading smoke 200 | Medium: "/" changing from redirect to page (see note); changes jsonb may be large (render collapsed, no limit needed at this volume) | M |
| J4 | Jobs write one JobRun row (coordinator, not engineer) | Without rows the panel is empty | The three scheduled task prompts (Prices Sun, Players Mon, Photos monthly): last step inserts one JobRun row via the service role / Supabase MCP after the report is saved, with job, ranAt, finishedAt, status + openCount matching the report's first line, summary = first lines, reportPath = project doc path, changes and photoList in the J1 shapes, card names as shown in the Vault. One INSERT per run, no updates or deletes. Update docs/WORKFLOW.md scheduled table ("-> JobRun row") | Next run of each job leaves exactly one row; its status/openCount equal the report's first line; every changes item has a cardId that exists in Card (or kind card_added with the new id) | Coordinator checks the row after the next Sunday run against audits/<date>-prices.md; panel shows it | Blocked on J1 being applied (Karim's yes). A standing DB write per job run: Karim's 2026-11-03 decision covers jobs writing results; confirm the JobRun insert is included | S |

## Not in scope (YAGNI)
Run history beyond the latest per job, overdue/missed-run alerts, filters/search, editing or re-running jobs from the
app, answer/approve buttons, a new nav tab, linking reportPath to claude.ai (path shown as text only).
