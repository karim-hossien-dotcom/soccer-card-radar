Complete (root-cause audit; fixes listed at the end need Karim's approval unless marked running)

# Why the pricing rules were not followed: root-cause audit (2026-11-12)

Scope: every active Vault card (203), every CardComp row, the card-comps skill history, the prices job prompt, all JobRun rows, and the cases Karim flagged (Messi at PSA, Mainoo Merlin #97 Gold /50 PSA 10). Numbers are from the live DB today. No costs here (public repo).

## Data profile of the values the Vault shows
| Measure | Count |
|---|---|
| Active cards | 203 |
| No value | 13 |
| Value is an estimate | 51 (25%) |
| Value rests on 1 sale | 49 |
| Value has no range (low/high) | 136 |
| Value stores no evidence (method = "median"/"value_used"/"cl_value") | 54 |
| "Price as PSA 8/9/10" values on raw/at-PSA cards | 106; 100% no evidence, 63 still old workbook numbers, 88 on 1 sale, oldest Oct 16 |
| Estimates that use Karim's own purchase as an input | 27 of 51 |
| Estimates that use 2024-25 sales | 22 of 51 |
| Cards with no structured set / parallel (identity only in free text) | 181 / 186 |
| Invalid grade labels ("CGC AUTH") | 3 rows |
| Prices runs that finished "Complete" | 0 of 6 |

## Root causes
1. **The bulk of the values were loaded before the rules existed.** 332 rows came from the old workbook on Oct 16 and 290 from a bulk Card Ladder pass on Oct 29 (method "median"/"cl_value", no sales listed). The card-comps skill was written Oct 30. Those rows were never re-checked against it; every later rule change applied only to rows written after it.
2. **Jobs refresh only the card's current grade.** A raw or at-PSA card is refreshed as raw; its PSA 8/9/10 values (used by "Price as") are never touched. That is where the Messi PSA 10 $300 (a Silver sale) and the CGC Authentic row lived.
3. **The rules are enforced only by the agent's judgment.** Nothing in code or the database checks a comp before it is written: no grade-label check, no parallel/auto word check, no age limit, no own-sale check, no required evidence. The "reviewer" agent reviews code changes, never prices. The price audit (Step 5) is done by the same run that wrote the prices: it grades its own work.
4. **No lineage.** A CardComp stores a number and a free-text method, not the sales behind it. A wrong parallel or an auto cannot be seen afterwards by Karim, the auditor, or the next run.
5. **The approved estimate formula conflicts with the comp rules.** thin_blend accepts a `purchase` signal, so 27 estimates include Karim's own buy, while the skill says his purchases are never comps. Sale age has no cap in thin_blend (only ratio pairs are capped at 365 days), and players with no Card Ladder index (Mainoo) get no decline adjustment, so 2024-25 prices pass through at face value. This is the Mainoo Merlin #97 Gold /50 PSA 10 case ($179.93 from 2024-25 sales incl. Karim's own Oct 2024 sale; no PSA 10 sale since Sep 2025).
6. **Card identity is free text.** 90% of cards have no structured set/parallel/auto fields, so every run re-reads the title, and a check like "reject autos unless the card is an auto" has nothing to check against.
7. **Fix-forward, insert-only, capped refresh.** Each complaint produced a narrow rule patch; the job is insert-only, so bad rows stay as the newest value for grades nobody refreshes; until today a 40-card cap meant a full cycle took ~5 weeks.
8. **"Incomplete" became normal.** All 6 prices runs ended Incomplete (4-12 open items each); open items are re-listed, not tracked to closure.

## Fixes
| # | Fix | Status |
|---|---|---|
| F1 | Full re-validation of every card at raw/PSA 8/9/10 under the new sale check + verifier gate; wrong values with no replacement listed for removal | running (fired 13:35 ET) |
| F2 | Comp guard in code: `pnpm thin-blend`-style CLI `comp-guard` that every insert must pass (grade label, sale age, n/range, required sale list, own-sale by ledger/seller, parallel/auto words vs the card's identity, no workbook source); DB CHECK on grade labels | needs approval (ticket) |
| F3 | Structured identity: fill set, number, parallel, print run, auto flag for all 203 cards from the PSA label / eBay title, and keep them filled for new cards | needs approval |
| F4 | thin_blend: drop the purchase signal from values (show cost separately), cap sale age at 24 months, confidence 1 when no index factor exists | needs Karim's decision (changes an approved formula) |
| F5 | Independent audit: price-auditor runs as its own scheduled job after the prices job, fresh context, report-only | needs approval |
| F6 | Retire legacy rows: once F1 replaces them, remove all workbook_import and no-evidence Oct 29 rows | needs approval per batch |
| F7 | Evidence stored per value (ticket V3, comp-evidence.md) | PM writing ticket |
| F8 | Open items tracked on Radar home with age and owner until closed | needs approval |
