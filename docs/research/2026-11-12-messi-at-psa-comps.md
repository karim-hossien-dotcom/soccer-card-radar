Incomplete: 19 open. Only 2 of 20 card/grade values could be set by the 90-day median rule (Scorers Club raw, Global Reach raw). Reasons: (a) Card Ladder and the eBay sold filter could not be used from this agent. It has no Chrome tool, and ebay.com/sch returns robots_disallowed. (b) The SportsCardsPro pages for Select #4 and #204 returned client_error. (c) No PSA Auction Prices page was found for any of the five specs. (d) Five cells have only 1-2 sales, and the hand-off rule sends those to researcher-2. Item 19: the PSA Estimate and Card Ladder Value for the 10 certs were not read. The PSA cert pages are not reachable from here, the order page needs Karim's login, and Card Ladder needs Chrome. Each open item is listed at the end with the searches to run.

# Messi slabs at PSA (order 26913695): 90-day comps, 2026-11-12

Researcher, following `.claude/skills/card-comps/SKILL.md`. Window: **2026-08-14 to 2026-11-12**. Nothing was written to the database.
This file has no costs (public repo). Proposed SQL is kept outside the repo (scratchpad `messi-comps.sql`).

## Question and what counts as "better"
Replace the stale Oct 16 and Oct 29 Vault comps for 5 Messi cards (10 slabs) with 90-day medians of the exact card. A value is
better when it is (1) built from sales of the exact insert with no parallel and **no autograph or relic**, (2) dated inside 90 days, and (3) reproducible
from the listed sales. While the slabs are at PSA, the Vault shows the **raw** comp (vault-comp.ts rule), so raw matters most right now.

## Identity and tier check (facts, sourced)
| Card | Checklist result | Source |
|---|---|---|
| 2022 Prizm WC Scorers Club #10 | Insert, no auto. Silver, Orange /25, Gold /10, Green /5 and Black /1 are separate cards | SCP set page, TCDB |
| 2022 Prizm WC Connections #1 Messi/Di Maria | Dual insert, no auto. Silver has its own PSA spec ("CONNECTIONS / SILVER PRIZM") | PSA APR (jp) spec 7770616 |
| 2022 Prizm WC Global Reach #10 | Insert, no auto. Silver, Orange /25 and Gold /10 are separate | SCP set page |
| 2022 Select FIFA #204 | **Base Field Level** (#201-250), no auto. No Concourse tier in 2022-23 Select FIFA: the tiers are Terrace 1-100, Mezzanine 101-200, Field Level 201-250. Messi also has **#103 Mezzanine**, which is not a comp for #4 or #204 | Cardboard Connection, Cardsmiths checklist, eBay catalog "Field Level #204" |
| 2022 Select FIFA #4 | **Base Terrace**, no auto | same, plus eBay catalog "Terrace #4" |

Base-tier parallels (all three tiers): Blue, Checkerboard, Multi-Color, Peacock, Purple Mojo, Red, Red Wave, Silver, Purple /75,
Orange /60, Tie-Dye /49, Zebra /25, White /20, Gold, Gold Mojo and Gold Wave /10, Green /5, Black 1/1. Exclude all of them.
Autograph versions of these numbers appear on eBay. The #4 catalog page shows "auto" listings at $1,098.79-$1,699.99, and Prizm WC has a
separate International Ink Autograph Messi. None of these is any of Karim's 5 cards.

## Method and limits (read first)
- Sales come from SportsCardsPro (SCP) sold lists, which are eBay and Fanatics sold listings with date, price and title, and from collectibles.com (eBay sold).
  SCP keeps Silver on a separate page from the base insert. The base pages were used.
- **Auto/relic filter (coordinator, Nov 12):** every title was checked for auto, autograph, signed, signature, "AU", ink, patch, relic,
  jersey, swatch and mem. A hit means the sale is excluded and listed under "Excluded, auto" below.
- **Confirmation was by title only.** I could not open the sale photos. A photo check would catch two things: a Prizm Silver finish (unnumbered, so a title that
  leaves out "Silver" cannot be ruled out) and on-card ink. Treat these medians as title-confirmed. Spot-checking photos is an open item.
- Also excluded on sight: other graders (SGC, VGC, TAG, CSG), titles naming a parallel, titles naming a different set, and duplicates of the same sale on two sites.
- The eBay `/sch` sold filter was blocked (robots_disallowed). Card Ladder was not reachable (no browser in this agent). PSA APR had no page for these specs in search.

## Excluded, auto (and relic)
**No sale in any list I read had an auto, signed, AU, ink, patch, relic or swatch word in its title.** That covers the 29 raw sales used, the 5 graded
90-day sales, and the older context sales on the same pages. So the two new raw medians below are not polluted by autos, as far as titles show.
What was seen but never counted, because these are different cards:
| Seen | Price | Where | Why it is not a comp |
|---|---|---|---|
| Select #4 "auto" listings, PSA 9/10 and PSA/DNA 7 auto 10 | $1,098.79-$1,699.99 (asks) | eBay catalog 10061293534 | Autographed version. Also asks, not sales |
| 2022-23 Select Jumbo Swatch #JS-LMI Purple /49 | $1,000 (ask) | eBay catalog 22061286262 | Memorabilia card |

Where the auto pollution in the Vault most likely came from (inference, not verified): the old comps I cannot reproduce from base sales.
These are Scorers Club PSA 10 275.88 (n=5), Connections PSA 8/9/10 (43/56/184.13), Global Reach PSA 8 (31) and Select #4 PSA 10 (300).
A single auto or parallel sale in a 5-sale median, or a workbook n=1, would produce values like these. The comp rows don't store sale titles, so this can't be proven from here.
Price-auditor should pull the sales behind those rows.

## PSA Estimate and Card Ladder Value per cert (context only, never a comp)
| Cert | Card | PSA Estimate | CL Value | Built on auto/parallel? |
|---|---|---|---|---|
| 163344654, 163344655 | Scorers Club #10 | not read | not read | unknown |
| 163344656 | Connections #1 | not read | not read | unknown |
| 163344657, 163344658 | Global Reach #10 | not read | not read | unknown |
| 163344659, 163344660 | Select #204 | not read | not read | unknown |
| 163344661, 163344662, 163344663 | Select #4 | not read | not read | unknown |

Why: psacard.com/cert/<n> is not on this agent's fetch allowlist and the certs aren't indexed by search. The PSA order page needs Karim's
login, and Card Ladder cert search needs his Chrome. Next route, in Karim's Chrome: PSA order 26913695, then each cert, then read "PSA Estimate"
and open its recent-sales list. On Card Ladder, use the # button, enter the cert, then CL Value, then the sales behind it. For each figure, list the sales it uses and flag
any title or photo that shows auto, signed, ink, patch, relic or a parallel. Note that while the cards are still at PSA, an estimate may be keyed to the
spec rather than the grade.

## 1. Scorers Club #10 (certs 163344654, 163344655)
**Raw: 17 confirmed sales in 90 days.** Median **$16.41** (IQR $11.76-$19.97). Auto check: none.
| Date | Price | Title (abridged) | Source |
|---|---|---|---|
| 2026-10-31 | 19.95 | 2022 Panini Prizm World Cup Qatar - Scorers Club Lionel Messi #10 | collectibles.com (eBay) |
| 2026-10-18 | 16.41 | ...Qatar Scorers Club Lionel Messi #10 0w77 | SCP (eBay) |
| 2026-10-09 | 13.04 | 2022-23 Prizm World Cup Lionel Messi Scorers Club #10 Argentina | SCP |
| 2026-10-07 | 19.99 | ...Qatar Scorers Club Lionel Messi #10 Argentina | SCP |
| 2026-10-05 | 3.25 | LIONEL MESSI 2022-23 PRIZM WORLD CUP #10 SCORERS CLUB ARGENTINA A | SCP |
| 2026-10-03 | 21.05 | 2022-23 Prizm World Cup Lionel Messi Scorers Club #10 Argentina (collectibles.com shows it as Oct 2; counted once) | SCP |
| 2026-09-28 | 10.50 | 2022-23 Prizm World Cup Soccer Lionel Messi Scorers Club #10 | SCP |
| 2026-09-24 | 19.79 | 2022 Prizm FIFA World Cup #10 Lionel Messi Scorers Club | SCP |
| 2026-09-24 | 37.00 | ...QATAR FIFA LIONEL MESSI SCORERS CLUB #10 ARGENTINA (best offer) | SCP |
| 2026-09-24 | 19.99 | 2022 Prizm FIFA World Cup #10 Lionel Messi Scorers Club | SCP |
| 2026-09-20 | 9.38 | 2022-23 Prizm World Cup Lionel Messi Scorers Club #10 Argentina | SCP |
| 2026-09-13 | 17.00 | Prizm World Cup Qatar 2022 Lionel Messi Scorers Club #10 Insert | SCP |
| 2026-09-12 | 18.08 | ...Qatar Scorers Club Lionel Messi #10 1di2 | SCP |
| 2026-09-11 | 11.01 | 2022 Prizm World Cup Qatar Scorers Club Lionel Messi Argentina #10 | SCP |
| 2026-09-07 | 12.50 | ...Qatar - Scorers Club Lionel Messi #10 | SCP |
| 2026-08-27 | 12.50 | ...Qatar - Scorers Club Lionel Messi #10 | SCP, collectibles.com |
| 2026-08-22 | 15.00 | Panini 2022 Prizm World Cup Qatar Lionel Messi Scorers Club Insert #10 | SCP |

Excluded: 2026-10-28 $16.50 "VGC MT 10" (other grader). 2026-08-12 $20.00 (outside the window). The trailing "A" on Oct 5 is a seller lot letter, not "AU".

**PSA 8: no 90-day sale.** Context only: 2026-07-11 $40, 06-18 $38, 05-28 $30 (SCP, PSA 8 titles). No Card Ladder value read. Open.
**PSA 9: n=1.** 2026-09-22 $52.00, "2022-23 Panini Prizm World Cup Lionel Messi Scorers Club #10 Argentina PSA 9" (SCP). Excluded: 06-23 $32 (SGC 9).
Context (outside 90 days): 07-20 $73, 07-15 $104.99. Goes to researcher-2 (one sale).
**PSA 10: n=2.** 2026-09-22 $250.00 (best offer, "LIONEL MESSI 2022 PANINI PRIZM WORLD CUP QATAR SCORERS CLUB #10 PSA 10") and 2026-09-02 $282.00
("2022-23 Panini Prizm World Cup Lionel Messi Scorers Club #10 Argentina PSA 10"). Median $266.00. Context: 07-09 $232.50, 07-04 $285, 06-17 $300.
The Silver PSA 10 (07-16 $600, 07-20 $500) is a different card. Goes to researcher-2 (two sales).

## 2. Connections #1 Messi / Di Maria (cert 163344656)
**No 90-day sale found in any grade.** The newest base sales on SCP are raw 2025-08-16 $14.99, PSA 10 2025-06-24 $72, PSA 9 2024-03-29 $12.05
and PSA 8 2024-07-09 $21.50. Silver Prizm PSA sales (PSA APR spec 7770616): newest 2025-09-18 PSA 9 $39. Different card, context only.
SCP may have stopped matching this card after Aug 2025. Messi 2022 inserts rose sharply in 2026: Scorers Club PSA 10 went from $72 (Jun 2025)
to $250-282 (Sep 2026), and Global Reach PSA 10 from $88-90 (spring 2026) to $190-225. So the 2024-25 sales cannot be used without a
player index (base-move rule). All 4 grades are open and go to researcher-2.

## 3. Global Reach #10 (certs 163344657, 163344658)
**Raw: 12 confirmed sales in 90 days.** Median **$8.13** (IQR $4.87-$10.00). Auto check: none.
| Date | Price | Title (abridged) | Source |
|---|---|---|---|
| 2026-10-17 | 2.30 | 2022 Lionel Messi Panini Prizm World Cup Qatar Global Reach #10 | SCP (eBay) |
| 2026-10-15 | 10.00 | Panini 2022 Prizm Chrome World Cup Qatar Global Reach Lionel Messi #10 Argentina | SCP |
| 2026-10-14 | 9.99 | Lionel Messi 2022 Panini Prizm FIFA World Cup Qatar Global Reach #10 | SCP |
| 2026-10-03 | 15.50 | 2022-23 Prizm World Cup Lionel Messi Global Reach #10 Argentina | SCP |
| 2026-09-23 | 3.25 | 2022 Prizm FIFA World Cup Soccer #10 Lionel Messi Global Reach Argentina | SCP |
| 2026-09-22 | 6.49 | 2022-23 Prizm World Cup Lionel Messi Global Reach #10 Argentina (B) | SCP |
| 2026-09-22 | 6.50 | same seller, (A) | SCP |
| 2026-09-22 | 7.01 | 2022-23 Prizm World Cup Lionel Messi Global Reach #10 Argentina | SCP |
| 2026-09-13 | 3.00 | ...Qatar - Global Reach Lionel Messi #10 | SCP |
| 2026-09-08 | 15.00 | 2022 Prizm World Cup Qatar - Global Reach Lionel Messi #10 | SCP |
| 2026-09-08 | 9.25 | 2022 Prizm World Cup Qatar - Global Reach Lionel Messi #10 | SCP |
| 2026-08-29 | 9.98 | ...Qatar - Global Reach Lionel Messi #10 | SCP |

Excluded: 2026-10-06 $17.41 "2022 Panini Prizm Road To World Cup ... Global Reach" (the title names a different product line, so the card is not confirmed). 08-02 $6.50 (outside the window).

**PSA 8: no 90-day sale.** Context: 2026-07-31 $44.99 (14 days outside the window), 2023-09-29 $15 (Goldin). Open.
**PSA 9: n=2.** 2026-09-22 $61.00 ("2022-23 ... Global Reach #10 Argentina PSA 9") and 2026-08-20 $99.99 ("... GLOBAL REACH #10 LIONEL MESSI PSA 9"). Median $80.50.
Context: 08-11 $66, 07-07 $75, 06-10 $110. Goes to researcher-2.
**PSA 10: n=1.** 2026-10-01 $190.00 ("Lionel Messi 2022 Panini Prizm World Cup Global Reach PSA 10 Argentina #10"). Context: 07-16 $225, 07-11 $200,
04-27 $90, 03-29 $88. Excluded: SGC 10 06-23 $63. Goes to researcher-2.

## 4. Select FIFA #204 Field Level (certs 163344659, 163344660)
**No sale read.** The SCP card page returned client_error (one retry). The eBay catalog page (Field Level #204, base) shows only active asks:
raw $11.99-$64.08. These are asks, not comps. The SCP set page has no base #204 row. It lists only #204 parallels: Tie-Dye /49, Zebra /25 and Gold /10,
all different cards. All 4 grades are open.

## 5. Select FIFA #4 Terrace (certs 163344661, 163344662, 163344663)
**No sale read.** The SCP card page returned client_error. SCP's set-page guide figures for #4 base (ungraded $4.69, grade 9 $23.74, PSA 10 $57.73)
are undated guide values, not sales, so they are not used. Active asks on the eBay catalog page are PSA 10 $150-$199.99 and PSA 9 $49.99-$120.
At least one of those asks is a Silver and is excluded. The auto asks of $1,098.79-$1,699.99 are also excluded. All 4 grades are open.

## Old Vault comps vs this check
| Card | Grade | Old | New | n | Verdict |
|---|---|---|---|---|---|
| Scorers Club | raw | 15.00 | **16.41** | 17 | Stale (Oct 29), not wrong. 17 base sales, no autos, support a small rise |
| Scorers Club | PSA 9 | 52 | 52.00 (hold) | 1 | Same single sale (Sep 22). n=1, so researcher-2 |
| Scorers Club | PSA 10 | 275.88 (n=5) | 266.00 (hold) | 2 | Can't reproduce. Only 2 base PSA 10 sales fall in a 90-day window ending Oct 29, and 275.88 is not one of them, so the "median of 5" took in other sales. Suspects: Silver PSA 10s ($500-600 in July) or an auto. Treat as suspect |
| Scorers Club | PSA 8 | none | open | 0 | No sale since Jul 11 |
| Connections | raw | 9.99 | open | 0 | Stale. No sale found after Aug 2025 |
| Connections | PSA 8 | 43 | open | 0 | Suspect: the only base PSA 8 sale ever seen is $21.50 (2024) |
| Connections | PSA 9 | 56 | open | 0 | Suspect: the highest base PSA 9 seen is $26. $56 looks like a parallel or auto price |
| Connections | PSA 10 | 184.13 | open | 0 | Suspect: the highest base PSA 10 seen is $72. Could be a real 2026 rise SCP missed. Needs Card Ladder |
| Global Reach | raw | 6.50 | **8.13** | 12 | Stale. 12 sales, no autos, support $8.13 |
| Global Reach | PSA 8 | 31 | open | 0 | Can't reproduce: no PSA 8 sale at $31. The newest is $44.99 (Jul 31) |
| Global Reach | PSA 9 | 83 | 80.50 (hold) | 2 | Close. n=2, so researcher-2 |
| Global Reach | PSA 10 | 190 (n=1) | 190.00 (hold) | 1 | Same single sale (Oct 1). Still n=1 |
| Select #204 | raw | 7.25 | open | 0 | Not checked (source down) |
| Select #204 | PSA 9 | 36 | open | 0 | Not checked |
| Select #204 | "CGC AUTH" | 8.00 | delete (proposed) | - | **Wrong grade and grader.** The cards are PSA slabs, and "Authentic" is not a numeric grade, so this row is not a comp for any of Karim's cards. If "AUTH" came from an autograph-authenticated slab, it is also an auto. Price-auditor should propose removing it |
| Select #4 | raw | 4.75 | open | 0 | Not checked. SCP's undated guide figure is $4.69 (context only) |
| Select #4 | PSA 9 | 43 | open | 0 | Not checked |
| Select #4 | PSA 10 | 300 (workbook n=1) | open | 0 | Suspect: workbook_import n=1. SCP guide $57.73 and asks of $150-200 both sit well below it, and auto asks for #4 sit at $1,099+. Replace once sales are read |

## Hand-off to researcher-2 (do not guess; per the hand-off rule)
Searches run: Google/Bing-indexed SCP base pages (Scorers Club #10, Global Reach #10, Connections #1), the SCP Silver pages, the SCP set pages,
collectibles.com Scorers Club, PSA APR (jp) Connections Silver, and eBay catalog pages 16057543399, 14061277385, 10061293534 and 4061294038 (Purple /75 #204, not ours).
- Scorers Club PSA 9 (n=1: $52, Sep 22) and PSA 10 (n=2: $250 Sep 22, $282 Sep 2). Base raw context: 17 sales, median $16.41.
- Scorers Club PSA 8 (no 90-day sale; $40 Jul 11, $38 Jun 18, $30 May 28).
- Global Reach PSA 9 (n=2: $61 Sep 22, $99.99 Aug 20), PSA 10 (n=1: $190 Oct 1), PSA 8 (none; $44.99 Jul 31).
- Connections, all grades: newest sales are 2024-25 (listed in section 2) and the Messi market has moved. Base-move or grade-ratio estimate needed.
  The thin_blend run needs Messi's Card Ladder index factors (Chart.instances), which this agent could not read.
- Select #204 and #4, all grades: first get sales (steps below).
- Auto filter applies to every input researcher-2 uses, including ratio pairs.

## Open items (19) and the next route for each
1-4. Select #204 raw/8/9/10, and 5-8. Select #4 raw/8/9/10. Use Card Ladder in Karim's Chrome, with cert search first (# button) on 163344659 and 163344661, then Same Grade.
   Text queries: `2023 Select (Messi) !Terrace -Silver -Blue -Red -Purple -Orange -Tie -Zebra -White -Gold -Green -Black -Peacock -Checkerboard -Multi -Mojo -Wave -Auto -Signed -Patch -Swatch -Lot -BGS -SGC -CGC`
   (CL labels the season by its second year, so "2023 Select" = 2022-23), and the same with `Field Level`.
   eBay sold: "2022 Select Messi Field Level 204" and "2022 Select Messi Terrace 4", excluding auto and signed. Check each photo for the tier name, a prizm finish and ink.
   Retry SCP pages `lionel-messi-204` and `lionel-messi-4` later.
9-12. Connections raw/8/9/10. Card Ladder cert 163344656, Same Grade, then `2022 Prizm World Cup Connections Messi Di Maria -Silver -Blue -Red -Orange -Gold -Green -Black -Auto -Signed -Lot -BGS -SGC -CGC`.
13. Scorers Club PSA 8, 14. Scorers Club PSA 9, 15. Scorers Club PSA 10, 16. Global Reach PSA 8, 17. Global Reach PSA 9, 18. Global Reach PSA 10.
   Check Card Ladder for sales SCP missed (which could lift n to 3 or more). If there are none, researcher-2 applies thin_blend with index factors.
19. PSA Estimate and CL Value for all 10 certs (route in the section above). Context only. Record whether each is built on auto or parallel sales.
Also: spot-check the photos of the 29 raw sales above for a Silver finish or ink. If any is Silver or signed, drop it and recompute the median.

## Facts vs inference
Facts: every dated sale above, the checklist tiers, the eBay catalog names, and the auto asks seen. Inference (not verified): SCP stopped matching
Connections after Aug 2025, and the irreproducible old values came from parallel or auto sales.

## Sources (checked 2026-11-12)
- https://www.sportscardspro.com/game/soccer-cards-2022-panini-prizm-world-cup-scorers-club/lionel-messi-10
- https://www.sportscardspro.com/game/soccer-cards-2022-panini-prizm-world-cup-scorers-club/lionel-messi-silver-10
- https://collectibles.com/soccer-cards/ci-2022-panini-prizm-world-cup-scorers-club-10-lionel-messi
- https://collectibles.com/collectible-items/12933988
- https://www.sportscardspro.com/game/soccer-cards-2022-panini-prizm-world-cup-global-reach/lionel-messi-10
- https://sportscardpro.com/game/soccer-cards-2022-panini-prizm-world-cup-global-reach/lionel-messi-silver-10
- https://www.sportscardspro.com/console/soccer-cards-2022-panini-prizm-world-cup-global-reach
- https://www.sportscardspro.com/console/soccer-cards-2022-panini-prizm-world-cup-scorers-club
- https://www.sportscardspro.com/game/soccer-cards-2022-panini-prizm-world-cup-connections/angel-di-maria-lionel-messi-1
- https://www.psacard.co.jp/auctionprices/soccer-cards/2022-panini-prizm-world-cup-qatar-connections/angel-di-maria-lionel-messi/7770616
- https://www.sportscardspro.com/console/soccer-cards-2022-panini-select-fifa
- https://www.sportscardpro.com/game/soccer-cards-2022-panini-select-fifa/lionel-messi-zebra-204
- https://www.cardboardconnection.com/2022-23-panini-select-fifa-soccer-cards
- https://cardsmithsbreaks.com/full-checklist/2022-23-panini-select-fifa-soccer
- https://www.ebay.com/p/16057543399 , https://www.ebay.com/p/14061277385 , https://www.ebay.com/p/10061293534 , https://www.ebay.com/p/4061294038 , https://www.ebay.com/p/22061286262
- https://www.ebay.com/itm/117483589949 (PSA 9 Scorers Club, ended unsold Nov 5; not a sale)

## Coordinator follow-up (2026-11-12, Card Ladder in Karim's Chrome)
- Select #4 graded: every PSA 9/10 sale in 90 days is a parallel (Silver PSA 10 $300 Oct 5 = source of the old $300; Purple Mojo $242-325; Tie-Dye /49 $370; White PSA 9 $220). No base PSA 9/10 sale.
- Select #4 raw base: 10 sales (Sep 15-Oct 30) -> median $4.82, range $3.00-9.99. Written.
- Select #204: "CGC AUTH" rows are CGC Authentic sales (not a grade); a Red AUTO PSA 9 ($750) is in the same results. Raw base: 4 sales -> $7.25. Written. No base PSA 9/10 sale.
- Scorers Club raw $16.41 (n=17) and Global Reach raw $8.13 (n=12) written.
- Proposed (needs Karim): remove Select #4 PSA 10 $300 / PSA 9 $43 (workbook) and Select #204 CGC AUTH / PSA 9 $36.
