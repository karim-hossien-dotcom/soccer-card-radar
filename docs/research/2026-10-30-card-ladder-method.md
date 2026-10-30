# How Card Ladder searches and values cards (from its help centre, read 2026-10-30)

Sources: cardladder.zendesk.com/hc/en-us — "12 Rules for Writing Search Queries" (12047786944663), "How to Search Sales History"
(23672925718935), "Card Ladder Search Synonyms" (23672606385431), "View Sales of a Single Card" (19095828773655),
"Card Ladder Value Algorithm (graded, no Ladder profile)" (41757251784215), "Grade Ratio Value" (13406278121751),
"Estimate the Value of any Card in Your Collection" (12047139141655), "Find the Value of Any Card" (12047748853655),
"Do you only track graded cards?" (12047288062103), "Ladder vs Sales History" (11943075474071).

## Query language
- Few inclusion words: year, set, player, insert. Avoid the card number unless needed.
- `(a,b)` = run each term as its own search (OR). Example: `1986 Fleer (Stickers,Sticker) Jordan PSA 9`.
- `-word` excludes; `-(PSA 9)` excludes the exact phrase inside the parentheses.
- Exclusions, in order: other grading companies; memorabilia the card doesn't have (auto, patch, relic); lots
  (bundle, bonus, lot); sealed product (box, pack); reprints; complete sets; checklists; qualifiers (OC, MK);
  other grades; every other parallel/variation name. Ultra-modern cards need long exclusion lists.
- `!` anywhere in the query: no typo correction and no synonyms (exact words only).
- Synonyms on by default: auto = autograph = signed = signature(s); refractor(s); x-fractor; rc = rookie;
  jsy = jersey = relic; rpa; holo; die-cut; patch(es).
- Add `Raw` to a query to see cards Card Ladder tracks raw.
- Cert search: the # button in the search box, cert number + grader -> all graded sales of that exact card.
- Exact card: open any sale of it -> View All Sales -> All Graded / Same Grade / Same Grading Company.
- Filters: price, date, platform, listing type, seller ID, verified only.
- Sales History is every sale (unvetted); only Ladder cards (green check) have research-team-vetted sales.

## Values
- CL Value (graded, no Ladder profile): exact card + grade + grader. Last 6 months (3 months if >10 sales);
  IQR outlier removal (1.5x) on the newest 25; newest surviving sale = value; if older than 2 weeks, scaled by the
  player's index (price / index at sale x index today); no value if the index has no point within 60 days of either date.
- Grade Ratio Value (when the card hasn't sold in over a year): ratio = this grade's price / other grade's price from
  two sales within 6 months of each other; the other grade must also have sold in the last 6 months; value = ratio x
  the other grade's latest sale. With several eligible grades, use the highest. CL notes ratios drift over time.
- Collection estimates: automatic (graded, by cert), index + purchase price, index + manual sale, custom sales query
  (their own method for Ladder cards), multipliers, manual.

## What we take from it
- Search: exact-card view or cert first; text queries with full exclusion lists; `!` when names are similar.
- Parallel ratios (researcher-2): use paired sales within 6 months of each other, require a comparison sale in the
  last 6 months, prefer the closest parallel (CL prefers the highest grade); report ratio drift.
- Our rule stays stricter than CL for raw: never derive raw from graded.
