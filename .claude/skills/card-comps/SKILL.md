---
name: card-comps
description: Karim's rules for pricing a card - 90-day comps of the exact card, naming, Card Ladder search and value rules, parallel ratios and the base-move rule. Use whenever finding, checking or proposing a card's value or a comp.
---
# Card comps (single source of truth; researcher, researcher-2, price-auditor and scheduled tasks follow this)

## Value rules (Karim, Oct 29-30 2026)
- Value = median of sales of the EXACT card (year, set, insert, number, parallel, print run, auto or not, solo or dual)
  in the last 90 days. Older sales are context only, never the price.
- No 90-day sale: the latest Card Ladder value for that exact card.
- Sources, in order: eBay sold -> Card Ladder sales history (graded sales included) -> PSA Auction Prices.
  Check every source before writing "no sale found". Zero results means the query was too narrow: broaden it.
- Never invent, estimate or "fill in" a price. Every number is a sale (date, price, title) or Karim's stated cost.
  Estimates exist only as researcher-2 proposals, labelled "estimate", approved by Karim.
- Only graded sales in 90 days: never derive a raw value from graded prices (no PSA 9 / 2, PSA 10 / 4) or the reverse.
  Look up the raw value on PSA or Card Ladder and record source and date, else "no raw value found".
  (The snipe max-bid ceiling in packages/shared is a separate, approved bidding rule, not a valuation.)
- Karim's own purchases (same date and price/seller as his ledger row) are not comps: flag them.
- Approved owner values are ONLY CardComp rows with source owner_set or ratio_to_base: they stand; report, never "fix".
  Rows with source workbook_import (the old workbook's "Value used" column, imported 2026-10-16) are ordinary old
  prices, not Karim's choices: newer comps replace them.
- Vault value of a card = newest CardComp for its current grade ("raw" when raw or at PSA); same-date ties: owner_set /
  ratio_to_base win, workbook_import loses (one helper: apps/dashboard/src/lib/vault-comp.ts).

## Parallels
- Inversion: a numbered parallel valued below its own base -> hand to researcher-2.
- Base-move rule (Karim): if a parallel's own sales are older than its base's latest sales and the base has moved >20%:
  ratio = each parallel sale / base price at that time (median of base sales in the 60 days before it);
  value = median ratio x the base's newest sale. Never above the next scarcer parallel's recent sales. Show inputs.
- Ratio pairing (Card Ladder's grade-ratio method applied to parallels): a pair counts only when the two sales are within
  6 months of each other and the comparison card has a sale in the last 6 months. Prefer the nearest parallel.

## Naming (cards were mis-identified before)
- Search as Year + Set + Player + Parallel, set as one simple word: "2026 Prizm Haaland White",
  "2018 Topps Chrome Ronaldo Purple", "2025 Select Ronaldo Dragon".
- Card Ladder labels a season by its SECOND year: "2025 Merlin" = 2024-25 Merlin.
- Seller titles are unreliable for the year and often omit the parallel colour: check each sale photo for a stamped
  serial ("09/10") before calling it base. Trust the card, not the title.
- Confirm insert and parallel names on the official checklist. PSA's cert label is the authority for a graded card's name.

## Card Ladder
- Synonyms CL treats as equal: auto = autograph = signed = signature(s); refractor(s); x-fractor; rc = rookie;
  jsy = jersey = relic; rpa = rookie patch autograph; holo = holographic; die-cut; patch(es).
  Insert names and parallel colours are NOT synonyms.
- CL Value for a graded card with no ladder profile: exact card + grade + grader only. Last 6 months (3 if more than 10
  sales), IQR (1.5x) outliers removed on the newest 25, newest surviving sale, scaled by the player index if older than
  2 weeks. A CL value from one old sale is weak: say so.
- Query syntax: `(a,b)` = OR; `-word` excludes; `-(PSA 9)` excludes a phrase; `!` = exact words; `Raw` suffix = tracked raw.
  Always exclude other graders, other grades, lot/bundle, reprint, auto/patch/relic when the card has none, and every
  other parallel name.
- Graded: search by PSA cert first (the # button), then Same Grade / Same Grading Company. Raw: open one exact sale ->
  View All Sales -> Same Grade.
- CL rate-limits ("Too many searches"): one session, about 8 searches then a 2-minute pause; never in parallel.
- Full notes: docs/research/2026-10-30-card-ladder-method.md

## Worked example (verified Oct 30 2026): 2024-25 Merlin UCC Match Ball Signatures, Kobbie Mainoo
- Query: (2025,2024-25,24-25) Merlin Mainoo Match Ball -Gold -Orange -Red -Black -Green -Blue -Purple -Pink -Sapphire -Lot -PSA -BGS -SGC -CGC
- Trap: colourless titles were still parallels ("09/10", "/25", "/50" in the title or stamped on the card).
- Base: Oct 13 $211.70, Sep 26 $209.35 -> median $210.53.
- Gold /50: Sep 18 $185, Sep 6 $155. Base then = median(Jul 15 $175.63, Jul 26 $115) = $145.31; ratio 1.17
  x newest base $211.70 = $247.66 (range $205-313). Approved Oct 30.
- Orange /25: Aug 30 $220.50 (one sale); Karim's own May 4 buy ($250) excluded. /10 sold Oct 18 $313.17 (ceiling).
