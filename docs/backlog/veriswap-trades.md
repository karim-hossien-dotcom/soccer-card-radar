# Trades tab: Veriswap asks vs comps (Karim, Nov 12 2026: "Lets create another tab aligned to veriswap deals"; side build)

Status: proposed

Side build. The roadmap goal is unchanged (Snipe is done when one real snipe is won); this ticket must not change the Snipe
board, the eBay scan, or any existing table.

## Done already (Nov 12 2026)
- DB: table `VeriswapListing` (migration 20261112b_veriswap_listing.sql, applied). Additive only: no foreign keys, triggers
  or views; RLS on; anon/authenticated revoked. `Listing` is untouched because the Snipe board reads it by `actionId` with no
  platform filter (snipe/load.ts), so Veriswap rows there would alter live prices and scores.
- First pull: Veriswap search results for the active snipe targets, top 20 per search, exact-card matches only, linked by
  `targetId`. Pulled by hand in Karim's signed-in Chrome; no background scraping.

## V3 Trades tab
- Route `/trades`, one nav entry "Trades" after Snipe. Reads `VeriswapListing` and `SnipeTarget` only.
- Table 1, target asks: card, grade, ask, comp for that grade (PSA 10 -> psa10, PSA 9 -> psa9; other graders/grades show no
  comp, never a guess), ask / comp, comp confidence, comps-as-of, link. Sorted by ask / comp ascending.
- Table 2, my cards (`mine = true`): my ask, comp, ask / comp. Empty state until the rows exist (see Open).
- `packages/shared/src/trade-score.ts` + tests: `askRatio(ask, comp)`, and `netEdge(comp, ask, feeRate)` = comp - ask x (1 +
  feeRate). Fee rate from Assumption `veriswap_fee` (default 0.04; 0.015 when both sides are vaulted). No comp -> null.
- Low-confidence comps are shown but marked, the same way the Snipe board scales by confidence.
- No bids, offers or messages from the app. Links open Veriswap.
- Refresh is manual (Karim asks; a session pulls in his Chrome). No cron: a server job has no Veriswap sign-in.
- Tests: shared and dashboard tests green; Snipe board output unchanged for the existing fixture.
- Screenshots use fixture data only (repo is public).

## Out of scope for V3
- Automatic trade pairing, other traders' wishlists, Load More beyond the first 20 results.

## Open (Karim)
- Veriswap fee: confirm the current rate before it goes into Assumption.
- Is Veriswap's "PRIZM" parallel the same card as "Silver" in SnipeTarget? The first pull assumes yes.
- 2015 Select: Veriswap titles say "White Jersey" (Ronaldo) and "Striped Jersey" (Messi). The first pull maps them to the
  base targets #36 and #65; confirm.
- My 54 Veriswap cards: link to Vault rows by cert (needs the cert from each Veriswap card page) before Table 2 has data.
