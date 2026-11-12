# Pricing controls (Karim, Nov 12 2026: "yes do them all" on the root-cause audit docs/audits/2026-11-12-pricing-root-cause.md)

Status: approved. Order: PC1 + PC2 (packages/shared) and V3a (comp-evidence.md) in parallel, then PC3, then V3b.

## PC1 comp-guard: the rules become code (F2)
- New `packages/shared/src/comp-guard.ts` + CLI `pnpm -s --filter @soccer-card-radar/shared comp-guard <input.json>`.
  Input: `{ now, card: {item, year, set, number, parallel, printRun, isAuto, grader, grade, status}, proposed: {grade, price, low, high, sampleSize, source, method, confidence}, sales: [{date, price, title, source, url, seller?, kept, rejectReason?}], ledger: [{date, amount, kind}], ownSellerIds: [string] }`.
  Output `{ ok: boolean, errors: [{code, sale?, message}], warnings: [] }`, exit code 1 when not ok.
- Errors (each its own code + unit test with a fixture sale):
  - `grade_label`: proposed.grade not `raw` or `(PSA|BGS|SGC|CGC) <number>` (CGC AUTH, Authentic, Altered rejected).
  - `source_forbidden`: source workbook_import.
  - `no_evidence`: source not estimate/owner_set/ratio_to_base and zero kept sales.
  - `n_mismatch`: sampleSize != number of kept sales (non-estimates).
  - `not_median`: price != median of kept prices (±0.01) for method median.
  - `sale_age`: a kept sale older than 90 days for a non-estimate; any kept sale older than 24 months for an estimate.
  - `parallel_word`: kept sale title contains a parallel/colour word or a serial (/xx) not in the card's own parallel (word list in the module; base card = no parallel words allowed).
  - `auto_mismatch`: card not auto and title has auto/autograph/signed/signature/AU/patch/relic; card auto and title lacks an auto word.
  - `grade_mismatch`: kept sale title shows another grader or grade than proposed.grade (raw: any grader name or "PSA <n>" etc.).
  - `lot`: title has lot/bundle/x2/set of.
  - `own_sale`: seller in ownSellerIds, or same date and price (±1%) as a ledger purchase.
  - `thin`: sampleSize 1 with no low/high and confidence > 2.
- Rejected sales must carry a rejectReason; kept sales must not.
- DB: migration `20261112c_comp_grade_check.sql`: CHECK on CardComp.grade matching the same pattern (NOT VALID, so old rows are kept until F6 removes them). Migration file only; coordinator applies.
- Never prints or commits real data; fixtures are made up.

## PC2 thin_blend fixes (F4, Karim decision Nov 12: his purchases do not go into values)
- Remove the `purchase` signal kind from thin_blend (input with it -> error "purchase is not a value signal"; cost is shown separately in the Vault).
- Drop any sale older than 24 months (listed in `excluded` with reason age).
- No indexFactor on a sale older than 2 weeks -> that signal's weight is halved and confidence capped at 1 (output flag `no_index`).
- Update thin-blend tests and the CLI test; keep the output shape.

## PC3 Open items tracked to closure (F8)
Status: ready for prod (feat/PC3; reviewed + QA green Nov 12 2026, waiting for Karim's "ship"). Change note: migration `20261112e_open_item.sql` (file only, not applied; `c` is PC1's,
`d` is Card.isAuto on main) with one open row per (job, cardId, title) via a partial unique index NULLS NOT DISTINCT, the
upsert/close SQL in its header, RLS on + anon/authenticated revoked; `packages/db/test/open_item.check.sh` (throwaway Postgres).
`apps/dashboard/src/lib/open-items.ts`: `openItems` (open only, oldest first, age in whole days) + `planUpsert` (same rule
as the SQL). Radar home "Latest runs" section gains an "Open items (N)" card (card items link to the Vault drawer); OpenItem
loads separately, so a missing table shows "Couldn't load open items" in that card only. UAT: `test/uat/pc3.uat.js`
+ `make-pc3-fixture.js`, screenshots docs/backlog/uat/PC3/. Jobs' scheduled-task prompts still need the upsert step (coordinator).
- Table `OpenItem` (id, job, cardId nullable, title, reason, firstSeen, lastSeen, closedAt, closedHow). Migration file only.
- Radar home "Latest runs" panel gains "Open items (N)" with age in days, oldest first; closed items drop off. Extend the existing panel, no new page.
- Jobs upsert by (job, cardId, title): new -> insert, still open -> lastSeen, resolved -> closedAt + closedHow.
- Test: age rendering and close behaviour; fixture data only.

### PC3 Review (reviewer, Nov 12 2026, diff 41d2c69..f6afac7)
- AC met: table/migration file only (`packages/db/migrations/20261112e_open_item.sql`, not applied); "Open items (N)"
  is an `<article>` inside the existing Latest runs section (`apps/dashboard/src/app/latest-runs.tsx:58`), oldest first
  with age in days, closed rows dropped (`apps/dashboard/src/lib/open-items.ts` `openItems`, page query `closedAt is null`);
  upsert/close rule in SQL header + `planUpsert`; tests in `open-items.test.ts` and `packages/db/test/open_item.check.sh`.
- No card values, prices, bids or env changes in the diff; no secrets (diff grep clean; screenshots show fixture rows only).
  No duplicate UI. No mid-line comments; age = floor of whole UTC days from firstSeen, tests match that convention.
- Important (fixed, b4a7987): `OpenItem.job` check allowed only prices/players/photos, but JobRun now also accepts
  `price-audit` (migration 20261112f on main), so the Sunday price audit could not log open items. Check constraint,
  "Price audit" label, unit test (fails on f6afac7: `not ok 4`) and a check-script line added.
- Minor (left): `open_item.check.sh` negative checks ("rejected"/"denied") print ok when psql cannot connect at all;
  add a `select 1` precheck that exits 2. Test-only, no effect on the feature.
- Minor (left): Radar job panels (`job-runs.ts` JOBS) do not show a `price-audit` JobRun panel yet; out of PC3's scope.
- Left for coordinator: apply the migration after Karim's yes; add the upsert step to the scheduled-task prompts.

### PC3 QA (Nov 12 2026, feat/PC3 at the review commit)
- `pnpm install --frozen-lockfile` ok; `pnpm build` 5/5 tasks ok.
- Dashboard tests 109/109, shared 78/78, grade-screen test_borders + test_api exit 0 (1 pre-existing skip).
- `open_item.check.sh` on a throwaway local Postgres 16: 22/22 ok (incl. price-audit accepted, foo rejected, RLS, grants).
- UAT `test/uat/pc3.uat.js` (fixture only, AUTH_PASSWORD empty, port 3100, Chromium 1194): 13/13 at 1280 and 13/13 at
  390, no horizontal scroll, no page errors; screenshots docs/backlog/uat/PC3/home-open-items-{1280,390}.png.
- Branch merges cleanly with main (37a9daa).
