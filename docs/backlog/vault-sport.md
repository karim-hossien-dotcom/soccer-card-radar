# Vault: Basketball filter replaces Sealed (Karim, Nov 12 2026: "Remove the closed or sealed items from our vault and replace that filter with basketball")

Status: ready for review (branch feat/V2)

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
