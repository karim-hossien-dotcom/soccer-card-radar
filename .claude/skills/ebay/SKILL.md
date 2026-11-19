---
name: ebay
description: eBay workstream - draft Karim's listings and posts, and find and save snipes for the Vault's target list. Use for listing drafts, lot pricing, sell decisions, or finding eBay auctions that match snipe targets.
---
# eBay (workstream 2 of 3)

Reads the Vault (values, costs, protected flag) and the one snipe list (SnipeTarget). Never owns a second list.
"Check eBay" means eBay itself. No bulk scraping (IP bans): stop when eBay starts returning error pages.

## Selling: drafts and posts
1. Pick cards: raw cards not on a grading list, not Card.protected, not Messi or Ronaldo (Karim: skip those on eBay).
2. Singles vs lots: a card whose expected net is $15 or more is a single; the rest go into lots by player, team or set.
3. Price:
   - Single: 90-day median of the exact card (card-comps rules); one sale = say n=1.
   - Lot: sold lots of the same kind in 90 days, $ per card. Ask = card count x a $/card between the lot median and
     p75 (above p75 is cut to p75, below the median is raised to it). No lot comps = "Estimate" in the draft notes.
4. Fees: eBay 13.25% + $0.40 per order; buyer pays shipping. Show expected net and a realistic net (offer at ~85%).
5. Title: Year + Set + Player + Parallel (+ serial, grade). Photos show only the card(s).
6. Drafts only. Nothing goes live, is repriced or relisted without Karim's yes for that listing.
Output: card-mcp ebay/listings-<date>.md (draft | cards | ask | expected net | realistic net | basis).

## Buying: find and save snipes
1. For each active SnipeTarget, match live eBay listings by mustInclude/exclude words and item condition
   (graded vs ungraded). The Snipe board does this daily (Vercel cron /api/scan).
2. Raw listings: photo screen (corners, edges, centering) before a listing is saved as a candidate.
3. Max bid = the target's C5 max (see the vault skill). Above max = watch only.
4. Save item number, end time and max for the Gixen hand-off. Never place a bid: every bid is Karim's, one by one,
   inside the $500 per 14-day budget.
Output: card-mcp ebay/snipes-<date>.md (target | listing | price | ends | max | screen verdict).
