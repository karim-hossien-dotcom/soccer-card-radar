# Competitive gaps: Collection + Snipe sections (2026-10-16)

Researcher pass (2 agents, primary sources accessed 2026-10-16). Facts below are sourced; rankings are inference.

## Key facts
- Nobody combines raw comp vs graded comps x gem-rate odds - grading fee - selling fee into one grade-or-sell / max-bid number for soccer. The only real-comp ROI calculator found is Pokemon-only (PokemonPriceTracker).
- PSA app (rebuilt Sept 2026) tracks raw + graded and order progress, but gives no expected value for cards at PSA and no submission P&L.
- Card Ladder Pro ($20/mo, $200/yr): best comps, no grading P&L, thin soccer parallel coverage (e.g. 2014 Prizm WC showcase pages with "No results").
- Market Movers deal finder covers Buy It Now only, not auctions.
- Snipers (Gixen free / Mirror $11.99/yr; eSnipe 1.5c per $1 won; AuctionStealer $15/mo) have no comps, no photo screening, no spend cap.
- Photo pre-grade tools (CardGrade, Gemix, Ximilar) score condition but feed no value/ROI; accuracy self-reported; listing photos are low quality.

## eBay policy and API (affects Snipe design)
- Sniping, including software that bids for you, is allowed (eBay help: Bid sniping).
- User Agreement bans "robot ... or other automated means" without permission; amendment effective 2026-02-20 adds "buy-for-me agents, LLM-driven bots, or any end-to-end flow that attempts to place orders without human review" (per Value Added Resource / The Register; US page fetched still showed older text).
- Offer API (placeProxyBid) and Marketplace Insights: Limited Release, eBay Partner Network + business-model review + contracts. Unlikely for a personal app. SoccerScan keyset confirmed: no buy.offer.auction, no buy.marketplace.insights.
- Browse API: 5,000 calls/day default (+5,000 getItems); Growth Check for more. SoccerScan has it (client-credentials api_scope).
- Implication: Chrome-script bidding carries account-restriction risk even with per-bid approval. Gixen bids through an eBay-sanctioned third-party authorization: the lowest-risk executor for a personal app. No public Gixen API, so approved bids are entered manually (fine at < 50/month).

## Ranked gaps (for one collector's weekly use)
| # | Feature | Section | Effort | Data risk |
|---|---|---|---|---|
| 1 | Value engine: raw vs PSA 10/9/8 comps x gem rate x fees -> grade-or-sell call and max bid (one shared engine) | Both | M | CL has no API: values refreshed from CL by Karim-run sync; band multiples when no graded comps |
| 2 | Collection: portfolio, photos, at-PSA expected value, submission P&L, cost basis ledger (eBay + grading + vault fees) | Collection | S-M | Low (own data; PSA public API is cert lookup only) |
| 3 | Auction shortlist via Browse API priced against max-buy + $500 biweekly budget enforcement + win logging | Snipe | S | Low |
| 4 | Photo gradability screen: centering as hard check; corners/surface as warnings | Snipe | M-L | Medium (photo quality) |
| - | Bid execution | Snipe | S | Use Gixen (manual entry) over Chrome script; revisit if eBay grants Offer API |

Recommended for PM: 1 -> 2 -> 3, then 4. Success metric: one real snipe won within the $500 biweekly budget, logged into Collection automatically.

## Sources (accessed 2026-10-16)
cardladder.com/pricing; psacard.com/info/apps; heavy.com/sports/cards/psa-app-update-raw-collection (2026-09-23); pregradecards.com (vault, ROI); marketmoversapp.com/sci; sportscardinvestor.com/market-movers-deal-search-buying-guide; ludex.com/membership; intercom.help/alt-platform; pokemonpricetracker.com/blog/posts/when-to-grade-pokemon-cards-roi-calculator-guide-2026; cardgrader.ai/blog/psa-api; docs.gemrate.com; ebay.com/help/Buying/How_Bidding_Works/Bid_sniping?id=4224; ebay.com/help/policies/member-behaviour-policies/user-agreement?id=5414; valueaddedresource.net/ebay-bans-ai-agents-updates-arbitration-user-agreement-feb-2026; theregister.com/2026/01/22/ebay_updates_legalese_to_ban; developer.ebay.com/api-docs/buy/offer/static/overview.html; developer.ebay.com/api-docs/buy/buy-requirements.html; developer.ebay.com/develop/get-started/api-call-limits; developer.ebay.com/api-docs/buy/api-insights.html; gixen.com; esnipe.com/pricing; auctionstealer.com/pricing; ximilar.com.
