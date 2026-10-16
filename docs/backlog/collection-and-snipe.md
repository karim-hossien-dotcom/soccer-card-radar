# Backlog: Value engine, Collection, Snipe, Photo screen

Source: docs/research/2026-10-competitive-gaps.md (all 4 gaps selected by Karim, 2026-10-16)
Success metric: one real snipe won within the $500 biweekly budget, auto-logged into Collection with cost basis.
Order: A -> B -> C -> D. Each epic ships something visible. Status: **approved** by Karim 2026-10-16 (A1 in progress -> ready for QA).

## Epic A: Value engine (shared by Collection + Snipe)
| ID | Ticket | Scope | Acceptance criteria | Size |
|---|---|---|---|---|
| A1 ✅ shipped (applied 2026-10-16) | Collection schema | packages/db migration + types: Card, CardComp (grade, price, n, source, as_of), Submission, LedgerEntry (purchase/grading/fee/sale), Assumption (fees, band multiples) | Migration applies on Supabase; types regenerate; build green | S |
| A2 ✅ shipped (2026-10-16) | Import current collection | Script: card_collection_master.xlsx + vault cards.json -> tables; photos -> apps/dashboard/public/cards/<cardId>.webp (141) | 170 cards, totals match workbook Summary (cost $16,802, value $22,626 +/- $1); photos load | S-M |
| A3 ✅ ready for prod | Value engine | packages/shared/value-engine.ts: raw vs PSA 10/9/8 comps, gem rate, fees, band multiples fallback -> grade-or-sell call, net, max bid | Unit tests reproduce workbook for 10 sample cards (Salah Roman Numeral, Bellingham Black Lazer, Mainoo Blue Mosaic, etc.) | M |
| A4 | Comp feed (free) | PSA Public API pop/images -> CardPop + images; manual Card Ladder entry form (bulk paste) -> CardComp with as_of; weekly reminder; stale (>14d) badge. Paid feeds (SportsCardsPro) deferred | Weekly entry updates values; stale cards flagged; PSA pop refreshes for graded certs | M |
| A5 ✅ ready for prod | Weekly value snapshots | Table CardValueSnapshot (card_id, week, raw/PSA10/9/8 values, value_used, source); written on first /collection load each week until the A4 job exists, append-only; reuse SoldStatsHistory snapshot pattern | One row per card per week; re-running the same week is idempotent; history survives comp corrections | S |

## Epic B: Collection section
| ID | Ticket | Scope | Acceptance criteria | Size |
|---|---|---|---|---|
| B1 ✅ ready for prod | /collection page | New nav tab COLLECTION; grid with photos, hover zoom, filters, sort (value, gain, date added), PSA 10/9/8 scenario toggle (port vault v2 UI) | Matches vault behaviour on desktop + 390px; Lighthouse no layout shift on hover | M |
| B2 | Card detail | Drawer: comps by grade with dates, grade decision, cost ledger lines, notes | Every number traceable to a CardComp or LedgerEntry row | S |
| B3 | PSA submissions | Submissions view: cards at PSA, fees, expected value (engine), P&L once grades entered | Orders 26913695 (52) and 26913701 (2) shown; entering grades updates P&L | S |
| B4 | Export | Download xlsx/CSV of collection | Export opens in Excel, totals match page | S |
| B5 ✅ ready for prod | Value tracker | Collection header: portfolio value + week-on-week $/% change, 12-week line chart; per-card sparkline + WoW change; top 5 risers/fallers; split by status (graded / raw / at PSA) | Numbers equal sums of A5 snapshots; first week shows "baseline" not 0% | S-M |

## Epic C: Snipe section
| ID | Ticket | Scope | Acceptance criteria | Size |
|---|---|---|---|---|
| C1 | Target list | Targets = card spec + max buy from engine (seed: Grade Screen hits: 2014 #161 Ronaldo, 2014 #12 Messi, 2023-24 UCC #64 Yamal, 2018 #80 Mbappe, Ronaldo/Messi Silver) | Add/edit target; max buy recalculates when comps change | S |
| C2 | Auction shortlist | Worker job: Browse API auctions ending < 24h per target; price vs max buy; store in Listing | Runs on schedule under 5,000 calls/day (rate-limiter); shortlist page sorted by end time | M |
| C3 | Approve queue + budget | Approve/skip each auction with max bid; biweekly $500 cap counts approved-pending bids | Cannot approve beyond remaining budget; budget resets on cycle date | S |
| C3b | Assisted snipe | At T-60s push/email alert with approved max + one-tap listing link; optional Gixen hand-off; Offer API adapter stubbed behind a flag | Alert fires within 5 s of T-60s in test; no code path places a bid without Karim's tap | S |
| C3c | Gixen auto-submit | On approval, server calls Gixen api.php add (itemid, maxbid, bidoffset 3-6 s, snipegroup); list/delete sync; Gixen creds in env only, never logged; requires Gixen API access (confirm with Gixen; likely Mirror $11.99/yr) | Approved bid appears in Gixen within 10 s; cancelling in app deletes it in Gixen; no bid ever sent without approval | S |
| C4 | Win/loss logging | After end: Browse getItem status -> won/lost; won creates Card + LedgerEntry, consumes budget | A won test record appears in Collection with cost basis | S |

## Epic D: Photo gradability screen
| ID | Ticket | Scope | Acceptance criteria | Size |
|---|---|---|---|---|
| D1 | Centering check | Estimate L/R and T/B border ratio from listing photo; fail if worse than 60/40 (PSA 10 front tolerance 55/45) | On 20 labelled photos, flags off-center cards with >= 80% agreement vs manual | M |
| D2 | Corners/surface spike | Time-boxed spike: vision model warnings on listing photos; report accuracy before building | Spike report with accuracy on 20 photos; go/no-go | M (spike) |

## Decisions (2026-10-16)
1. Bid execution: app decides, Gixen executes via its API (C3c); assisted snipe alert (C3b) as fallback; Offer API application in parallel. Approved 2026-10-16.
2. Data: free stack (PSA Public API + manual Card Ladder entry); no scheduled Card Ladder pulls (ToS). Approved 2026-10-16.
3. 2014 Prizm WC Ronaldo Silver #161 = BGS 9 (confirmed).

## Not in scope (YAGNI until the success metric is hit)
Multi-user auth, billing, mobile app, sold-data scraping, Offer API integration (revisit if eBay approves buy.offer.auction).

## QA notes
- A3 (2026-10-16): 16/16 unit tests pass (`pnpm --filter @soccer-card-radar/shared test`): 12 workbook fixtures (incl. Salah Roman Numeral, Bellingham Black Lazer, Mainoo Blue Mosaic, Haaland Starball /10), max bid, bands, non-gradeable lots. Full-collection check: engine vs workbook on all 170 cards, 0 mismatches; raw PSA 10/9 totals $12,287.12 / $5,194.05, at-PSA $9,621.20 / $3,569.51 (= workbook Summary). tsc clean (shared, dashboard).
- B1 (2026-10-16): /collection (nav tab VAULT). next build OK. UAT on local dev server with fixture (test/fixtures/collection.json = same rows as Supabase): 170 tiles; totals Now $16,802 cost / $22,626 value / +$5,545; PSA 10 at-PSA $9,621 (= workbook); Raw PSA 10 $12,718 = workbook $12,287 + Topps Now lot $400 + sealed box $31 at current value; date sort, search, drawer (Salah Roman Numeral: Grade beats raw at PSA 9, +$331), hover zoom stays in viewport, no horizontal scroll at 390px; /, /stars, /legends, /dips return 200. Screenshots: docs/backlog/uat/B1/. Not verified: live Supabase read (sandbox can't reach DB) - check on the Render preview/after deploy.
- A5/B5 (2026-10-16): Migration 20261016c applied to Supabase (CardValueSnapshot, PK cardId+week, RLS on, anon/authenticated revoked). Snapshot upsert runs on /collection load: one row per card per ISO week, only changed rows written, latest load in a week wins (idempotent). UAT with base fixture: header shows "Baseline" (no 0%), week of Oct 12, split graded $13,851 / raw $5,765 / at PSA $3,009. With test/fixtures/collection-history.test.json (synthetic 3 prior weeks, test only): WoW +$57 (+0.3%), 12-week chart + tooltip, top 5 risers/fallers, per-card WoW chip and drawer sparkline; no page errors; no horizontal scroll at 390px. tsc clean. Screenshots: docs/backlog/uat/B5/. Not verified: live snapshot write (sandbox cannot reach DB) - first live load after deploy creates the baseline.
