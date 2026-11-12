# Vault: Basketball filter replaces Sealed (Karim, Nov 12 2026: "Remove the closed or sealed items from our vault and replace that filter with basketball")

Status: approved (owner request)

## V2 Basketball filter, no sealed product
- DB: `Card.sport` text, 'soccer' | 'basketball', default 'soccer' (migration 20261112_card_sport.sql, already applied). Sealed rows already deleted from the DB.
- load.ts reads `sport` into the card model.
- collection-view.tsx: the "Show" segment drops the Sealed option and gets "Basketball (N)" (shown only when N > 0). Basketball shows only sport='basketball'; every other option (All, Graded, Raw, At PSA, Stale) keeps showing all sports so totals are unchanged.
- Remove the sealed branch from the Vault UI and header copy ("N cards + M sealed" becomes "N cards"; drop sealed from snapshot.ts, comps-panel, scenario helpers and tests). Keep the `sealed` status value in types only where the DB enum still needs it.
- /api/snipe/wins: sealed product lines (cardFromTitle status "sealed") are skipped and reported as skipped, never inserted into the Vault.
- Tests: dashboard tests green; add a test that Basketball filters by sport and that the wins job skips sealed titles.
- Screenshots use fixture data only (repo is public).
