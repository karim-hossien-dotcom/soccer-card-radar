---
name: card-comps
description: Karim's rules for pricing a card - 90-day comps of the exact card, naming, Card Ladder search and value rules (90-day median, else the Card Ladder value). Use whenever finding, checking or proposing a card's value or a comp.
---
# Card comps (single source of truth; researcher, researcher-2, price-auditor and scheduled tasks follow this)

## Value rules (Karim, Nov 19 2026; replaces the Oct 29 - Nov 12 rules)
Only two ways to value a card:
1. Median of sales of the EXACT card (year, set, insert, number, parallel, print run, auto or not, solo or dual, grader
   and grade) in the last 90 days, after the sale check. Older sales are never used.
2. No exact 90-day sale: the Card Ladder value for that exact card and grade (its own cert or ladder profile). Card
   Ladder index-adjusts it even when the last sale is old; use their number and do no index math of our own. Source
   `cardladder_value`, with the CL page and date as evidence.
Neither: no value. Write no CardComp; open item "no market: no 90-day sale and no CL value".
- No estimates of any kind: thin_blend, base-move, parallel or grade ratios and proxies are withdrawn (Nov 19 2026).
- Grades never derive from each other: no multiples or bands, no PSA 9 / 2 or PSA 10 / 4, no raw from graded or the reverse.
- Wherever a card's value is used (Vault, Snipe, eBay drafts, Veriswap bundles and offers), use the comp for the card's
  OWN grade; another grade's comp is never a substitute.
- Sources for sales, in order: eBay sold -> Card Ladder sales history -> PSA Auction Prices. Check every source before
  writing "no sale found". Zero results means the query was too narrow: broaden it. PSA Estimate is never the number.
- Never invent or "fill in" a price. Karim's own purchases and sales are never comps. Cost is shown separately.
- Every proposed CardComp passes `pnpm -s --filter @soccer-card-radar/shared comp-guard <input.json>` before insert.
- Approved owner values are ONLY CardComp rows with source owner_set or ratio_to_base: they stand. workbook_import rows
  are ordinary old prices: newer comps replace them.
- Vault value of a card = newest CardComp for its current grade ("raw" when raw or at PSA); same-date ties: owner_set /
  ratio_to_base win, workbook_import loses (apps/dashboard/src/lib/vault-comp.ts).
- Snipe max bid (a bidding rule, not a valuation): C5 in packages/shared/src/snipe-score.ts, EV after 13% eBay fee and
  grading fee / 2, capped at 80% of raw; no EV = 80% of raw. A stored SnipeTarget.maxBid overrides it; only Karim sets one.
- Protected cards (Card.protected = true): never in a trade, bundle, offer or listing unless Karim approves that deal for
  a bigger card.

## Sale check: every sale, before it can enter any value (Karim, Nov 12 2026)
Card Ladder and PSA results mix in parallels, autos, other grades and Karim's own sales; their CL Value and PSA Estimate
are built on that mix. Never take their number. Take their sale LIST and keep a sale only if ALL of these pass:
1. Same card: year, set, insert, card number (Select #4 Terrace is not #103 Mezzanine). Identity = PSA cert label.
2. Same parallel. Base card: reject any colour/parallel word (Silver, Prizm, Mojo, Purple, Tie-Dye, Zebra, Gold, Rose
   Gold, Shimmer, White, Red Wave, Multi-Color, Refractor colour, Lava, Wave...) and any serial (/xx, xx/xx). Parallel card:
   keep only that exact parallel and print run (Rose Gold /299 is not Gold /50). Names come from the set checklist.
3. Same auto status as the card. Non-auto card: reject auto/autograph/signed/signature/AU/patch/relic. Auto card: keep
   only autos of the same kind (on-card vs patch).
4. Same grader and grade (raw = ungraded; "CGC Authentic"/"AUTH"/"Altered" is never a grade). No lots.
5. Not Karim's own sale or buy: seller or buyer = his eBay account, or same date+price as his ledger.
6. Ambiguous title: check the photo; still unclear -> reject.
7. Age: only sales in the last 90 days make a value. None: the exact card's CL value. Neither: "no market".
Write every kept and rejected sale (date, price, title, source, reason) into the job report. A value without its list
of kept sales is not written.

## Verifier gate (Karim, Nov 12 2026): nothing is written until it passes
Before any CardComp insert, a separate verifier agent (price-auditor role, fresh context) re-reads the kept-sales list
for every proposed value and re-applies the sale check above. It rejects a value when: any kept sale fails a check;
n=1 with no low/high and confidence above 2; the grade label is not raw/PSA/BGS/SGC/CGC + number; the source is
workbook_import; the value moved more than 50% from the last comp without the reason shown. Rejected values go back
for redo, then stay "open" in the report (first line Incomplete: N open). Only verified rows are inserted.

## Writing a value (shipped Nov 12 2026: comp-guard, CompSale, OpenItem). Every job, every value, in this order
1. Build the comp-guard input: `card` (from the Card row: item, year, setName, cardNumber, parallel, printRun, isAuto,
   grader, grade, status), `proposed` (grade, price, low, high, sampleSize, source, method, confidence), `sales` (exact-card
   sales only, each with kept true/false and rejectReason when false), `signals` (estimates only: ratio/proxy inputs),
   `ledger` (the card's LedgerEntry rows), `ownSellerIds` (Karim's eBay account), `previous` (newest comp for the same
   grade) and `reason` (required when the value moves more than 50%).
2. Run `pnpm -s --filter @soccer-card-radar/shared comp-guard <input.json>` from a repo checkout. Exit 1 = not written:
   fix and retry, or record it as an open item. Exit 2 = bad input.
3. Only on exit 0: INSERT the CardComp row, then INSERT one "CompSale" row per sale for that comp id (date, price, title,
   source ebay|cardladder|psa_apr, url, kept, rejectReason = comp-guard code: card, parallel_word, auto_mismatch,
   grade_mismatch, lot, own_sale, sale_age; or unclear when the photo/title can't settle it). Rejected sales are stored too.
4. Open items: for each item still open at the end, upsert into "OpenItem" (job, cardId, title, reason) with
   `on conflict (job, "cardId", title) where "closedAt" is null do update set "lastSeen" = now(), reason = excluded.reason`;
   for each item from an earlier run that this run resolved, set closedAt = now() and closedHow (one line: what fixed it).

## Parallels
- Withdrawn Nov 19 2026: the base-move rule and ratio pairing. A parallel is valued like any card: its own 90-day
  median, else its own Card Ladder value, else "no market". A numbered parallel below its base is reported, not re-priced.

## Naming (cards were mis-identified before)
- Search as Year + Set + Player + Parallel, set as one simple word: "2026 Prizm Haaland White",
  "2018 Topps Chrome Ronaldo Purple", "2025 Select Ronaldo Dragon".
- Card Ladder labels a season by its SECOND year: "2025 Merlin" = 2024-25 Merlin.
- Seller titles are unreliable for the year and often omit the parallel colour: check each sale photo for a stamped
  serial ("09/10") before calling it base. Trust the card, not the title.
- Sellers name the same parallel differently (Merlin #97 Gold /50 is often titled "Gold Atomic"): search by print run
  and grade ("/50 PSA 10") as well as the colour word, and check the serial in the photo, before calling a card unsold.
- An "Auto Patch" / patch auto is a different card from an on-card "Autograph" of the same set (Dynasty DAV-KM1 is
  on-card; Sep 27 2026 $1,184 "Auto Patch Black 4/5" is not a comp for it). A Card Ladder value with no exact sale
  behind it for that exact card and grade is not a comp either.
- (Withdrawn Nov 19 2026: proxy signals. No 90-day sale and no CL value = "no market", never its purchase price.) Old note: proxy = the same player's
  same tier in the same grade (e.g. other 2024-26 Topps Gold /50 autos PSA 10 of that player), last 90 days; never
  other players unless the same player has none (Karim, Nov 10 2026: Bellingham gold auto PSA 10s).
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
