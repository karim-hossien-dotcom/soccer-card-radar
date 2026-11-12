# Vault: Basketball filter replaces Sealed (Karim, Nov 12 2026: "Remove the closed or sealed items from our vault and replace that filter with basketball")

Status: ready for prod (branch feat/V2; awaiting Karim's "ship")

Change note (engineer, Nov 12 2026): new `src/lib/vault-filter.ts` (Show filter + sport default, unit-tested); load.ts adds
`sport` (missing/unknown reads as soccer); Show drops Sealed, adds "Basketball (N)" when N > 0; header "N cards"; sealed
branches removed from load.ts (grade label, stale), snapshot.ts, comps-panel, vault-scenario + tests. `CardStatus` keeps
"sealed" (DB check constraint still allows it). Wins job: `plan()` puts sealed lines in `skipped` (never cards/review, so never
inserted, also not via ?import=); the route reports them as `skippedSealed`; a won sealed snipe bid still closes. Tests: dashboard
99/99, `pnpm build` green; Playwright `test/uat/v2.uat.js` (synthetic `make-v2-fixture.js`) 24/24, V1 UAT re-run 70/70 after
dropping its sealed card. Screenshots: docs/backlog/uat/V2/ (synthetic).

## V2 Basketball filter, no sealed product
- DB: `Card.sport` text, 'soccer' | 'basketball', default 'soccer' (migration 20261112_card_sport.sql, already applied). Sealed rows already deleted from the DB.
- load.ts reads `sport` into the card model.
- collection-view.tsx: the "Show" segment drops the Sealed option and gets "Basketball (N)" (shown only when N > 0). Basketball shows only sport='basketball'; every other option (All, Graded, Raw, At PSA, Stale) keeps showing all sports so totals are unchanged.
- Remove the sealed branch from the Vault UI and header copy ("N cards + M sealed" becomes "N cards"; drop sealed from snapshot.ts, comps-panel, scenario helpers and tests). Keep the `sealed` status value in types only where the DB enum still needs it.
- /api/snipe/wins: sealed product lines (cardFromTitle status "sealed") are skipped and reported as skipped, never inserted into the Vault.
- Tests: dashboard tests green; add a test that Basketball filters by sport and that the wins job skips sealed titles.
- Screenshots use fixture data only (repo is public).

## Review (reviewer, Nov 12 2026; diff 18edbec..f01f233)
- Acceptance criteria: all met.
  - load.ts reads `sport` (`select("*")`, load.ts:76; `toSport`, load.ts:160); missing/unknown reads as soccer (vault-filter.ts:7, tested).
  - Show drops Sealed, adds "Basketball (N)" only when N > 0 (collection-view.tsx:136); Basketball narrows by sport, other options keep all sports (vault-filter.ts:9-14, vault-filter.test.ts).
  - Header "N cards" (collection-view.tsx:114); sealed branches gone from load.ts, snapshot.ts, comps-panel, vault-scenario. `CardStatus` keeps "sealed" (value-engine.ts:7) as the ticket allows.
  - Wins job: `plan()` skips sealed before matching (won.ts:86); route never inserts them (cards/review only) and reports `skippedSealed` (route.ts:91). New won.test.ts test fails without the change (`p.skipped` undefined).
- Card values / card-comps: no valuation logic changed beyond removing the unused sealed branch. No secrets; fixtures and screenshots are synthetic. No duplicate UI (existing Show segment extended). No bids, scans or env changes.
- Critical: none. Important: none.
- Minor (fixed, bf880c2): make-v1-fixture.js:20 closing `],` appended to the end of the card(6) line.
- Minor (left): the "hidden when N = 0" UI branch is covered only by the `sportCount` unit test, not by UAT (V2 fixture has 2 basketball cards); V1 UAT (no basketball) shows no Basketball option implicitly. Low risk.
- Minor (left, not this ticket): a sealed line that would have matched an old ledger row now goes to skipped; harmless since sealed rows are deleted from the DB.

## QA (Nov 12 2026, worktree of origin/feat/V2 + bf880c2)
- `pnpm install --frozen-lockfile` ok; `pnpm build` 5/5 tasks green.
- Dashboard tests 99/99; shared 78/78; grade-screen test_borders 8 ok, test_api 17 ok + 1 pre-existing skip.
- Playwright `test/uat/v2.uat.js` (make-v2-fixture.js, AUTH_PASSWORD empty, port 3100, Chromium 1194): 24/24 ok at 1280 and 390.
- V1 regression `test/uat/v1.uat.js` with the edited V1 fixture: 70/70 ok.
- Screenshots docs/backlog/uat/V2/ checked: synthetic fixture data only.


## V2b Top totals follow the filter or the selection (Karim, Nov 12 2026: "i need it to work both ways filter or selected")
Status: ready for review (branch feat/V2). Ships together with V2.

Change note (engineer, Nov 12 2026): `selectionTotals` (vault-scenario.ts) takes an optional `inView` list: no known tick ->
totals of the filter (`selecting` false); ticks -> ticked cards in view only, `hidden` = ticked cards the filter hides. Without
`inView` it behaves as before. collection-view.tsx: one totals source for the top bar; label "N selected · clear" replaces
"Value now"/"Value if PSA x" while selecting; "+N selected outside this filter" under the value; the separate selection line
(`selSum`) and its CSS are removed. All ticks hidden -> "0 selected", $0 (ticks narrow the filter). Tests: dashboard 102/102
(3 new V2b tests), shared 78/78, `pnpm build` green; `test/uat/v2.uat.js` extended (Basketball -> tick -> Raw -> PSA 10 ->
Basketball -> All -> clear) 46/46 at 1280 and 390; `test/uat/v1.uat.js` updated to the V2b rule (hidden ticks no longer
count) 72/72. UAT readers wait for CountUp to settle. Screenshots: docs/backlog/uat/V2/vault-v2b-*.png (synthetic).
- No card ticked: the top bar (Value / Cost / Gain or loss) totals every card in the current filter, as today.
- One or more ticked: the top bar totals only the ticked cards that are in the current filter, at the current "Price as".
  Label "N selected" replaces "Value now" / "Value if PSA x". Filter narrows, ticks narrow further.
- Ticked cards hidden by the current filter are not counted; the bar notes it ("+2 selected outside this filter").
  Ticks are kept, so switching back to that filter counts them again.
- "clear" sits in the top bar; the separate selection line under it is removed (no duplicate totals).
- Tests: unit tests for the totals rule (none ticked, ticked in view, ticked hidden); UAT covers filter -> tick -> switch filter -> clear at 1280 and 390. Fixture data only.
