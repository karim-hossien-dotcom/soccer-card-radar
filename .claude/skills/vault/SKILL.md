---
name: vault
description: My Vault workstream - what Karim owns and what he wants. Card intake, cost basis, values, photos and grading checks, and the one snipe target list. Use for any Vault update, pricing run, photo or grading check, or change to snipe targets.
---
# My Vault (workstream 1 of 3)

What Karim owns (Card, LedgerEntry, CardComp, CardValueSnapshot) and what he wants (SnipeTarget, the ONE target list
eBay and Veriswap both read). Supabase project zsubyufjenapkgkwpqzv. Values follow .claude/skills/card-comps exactly.

## Who does what
- Coordinator (main session) runs this skill and is the only writer.
- researcher agent: read-only fan-out for sales lookups and player/rookie research.
- checker agent: clean-context re-check of every value, cost and photo before it is written or reported.

## Updates (intake, purchases, status)
1. New card: identity from the PSA cert label or the set checklist (year, set, number, parallel, print run, auto).
   Raw photo batches: CollX export or photos -> one Card row per card; unclear serials go on a reshoot list.
2. Cost: eBay purchase history first (eBay itself, also Selling > past purchases), then PSA order fees (service fee
   plus its share of return shipping from the submission form). No record = $0, source pack_pull_assumed.
3. Status: raw -> at_grader -> graded from PSA orders; sold/traded when Karim says so. Never reactivate a sold row.
4. Card.protected = true is set only by Karim (today: 2014 Prizm WC #161 Ronaldo Silver BGS 9, 2018 Prizm WC #154
   Ronaldo Light Blue Lazer PSA 9). Never change it in a job.

## Pricing
- Only two values: 90-day median of the exact card, else its Card Ladder value for that grade; neither = "no market".
- Each grade from its own sales or CL value only. Run comp-guard, write CardComp + CompSale, track OpenItem.
- Weekly: the Sunday prices job does the full run; the checker's Sunday audit re-checks it.

## Photos and grading
- Photo shows only the card; graded = PSA cert-page scan of Karim's own slab; raw = the raw card.
- Grading screen checks corners and edge whitening/chipping against PSA, Beckett and TAG points, not only centering.
- PSA grading cost per card = service fee + its share of return shipping.

## Snipe targets (the one list)
- Targets come from Karim's eBay watch list and saved searches plus researcher picks he approves.
- Raw, PSA 9 and PSA 10 values per the card-comps rules; compsAsOf on every refresh.
- Max bid: C5 (EV after 13% eBay fee and grading fee / 2, capped at 80% of raw). No PSA 9 + PSA 10 pair = 80% of raw,
  tagged "[max: 80% raw rule]" and recomputed every run. A stored maxBid without that tag is Karim's and never changed.
- $500 per 14-day cycle (Assumption snipe_budget).

## Writes need Karim's yes
Except what an approved job rule covers (prices job: comps, costs, ownership sync, rule max bids). Report first.
