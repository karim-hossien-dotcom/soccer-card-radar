# R4: Bulk filter in the Vault (builder ticket)

Approved by Karim Nov 19 2026 18:07 ET ("go"). Base: main. Gates: checker review -> screenshots -> Karim "ship".
Public repo: no values, costs or screenshots with values in git.

## Data (table created Nov 19, migration packages/db/migrations/20261119_bulk_card.sql; 961 rows loaded from the CollX export once Karim OKs the load)
- Table "BulkCard": one row per CollX row, 961 rows / 1,021 cards.
  Columns: collxId, player, team, year, setName, parallel, cardNumber, flags, printRun, isAuto, sport, qty, collxValue,
  photoFront, photoBack, ebayStatus (in_lot_draft | single_draft | live | sold | held | not_listed | unknown), ebayRef,
  ebayTitle, notes, promotedCardId, addedOn.
- Update database.types.ts.
- Separate table on purpose: "Card" is read with one select("*") and PostgREST returns at most 1,000 rows; 961 more rows
  would drop real cards from the Vault. Bulk is also outside Vault value and the pricing jobs by construction.

## UI (Vault page, apps/dashboard/src/app/collection)
1. "Show" segment gets one more option: "Bulk (N)". Selecting it swaps the grid for a list (no new page, no duplicate UI).
2. List, one line per row, sortable by every column: photo thumb (photoFront, 40px) · card (player, year set, parallel,
   #number, serial /printRun, AUTO tag) · qty · CollX value (labelled "CollX", qty x value) · eBay (status chip; ebayRef as a
   link to https://www.ebay.com/sh/lst/drafts for drafts and https://www.ebay.com/itm/<ref> for live) · notes.
3. Filters inside Bulk: eBay status chips (All · In lot draft · Single · Live · Held · Not listed) and search.
4. Top bar in Bulk mode: "N cards · X CollX value" for the filter. Main Vault totals, charts and snapshots ignore Bulk.
5. Row action "Move to Vault" (server route, owner auth): inserts a raw Card row from the BulkCard fields (item built from
   year/set/player/parallel/number, isAuto, printRun, qty, photoSourceFront = photoFront, notes "from CollX <id>"), sets
   promotedCardId; the weekly prices job then prices it. Hidden once promoted.
6. Load BulkCard with .range() paging (1,000-row limit).

## Tests
- Bulk list renders 961 fixture rows with paging; totals = sum(qty x collxValue); Vault totals unchanged with Bulk present.
- "Move to Vault" creates one Card and sets promotedCardId; second click is a no-op.

## Done when
pnpm -r test and the dashboard build pass; checker (fresh context) reviews; screenshots (phone + desktop) to Karim; he says "ship".
