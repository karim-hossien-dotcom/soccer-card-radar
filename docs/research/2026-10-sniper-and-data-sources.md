# Sniper mechanics + legitimate data sources (2026-10-16)

## A. How snipers bid (facts with sources; inference marked)
- Gixen: eBay "third-party authorization" granted on ebay.com, renewed every 18 months (gixen.com/blog/ebay-third-party-authorizations). Inference: legacy Auth'n'Auth token + Trading API PlaceOffer under an older agreement (18-month = Auth'n'Auth token lifetime).
- Trading API PlaceOffer: "eBay is no longer accepting new applications for the PlaceOffer feature"; "automatic and/or scheduled use of PlaceOffer is prohibited"; license addendum: "You will not provide or operate an automated sniping tool" (developer.ebay.com/DevZone/XML/docs/Reference/eBay/PlaceOffer.html; placeoffer_api_license_addendum).
- Buy Offer API placeProxyBid: Limited Release, eBay Partner Network + Buy API application + compliance review + contracts + affiliate tracking (developer.ebay.com/api-docs/buy/buy-requirements.html). No reported approval timelines for individuals.
- User Agreement (Feb 2026 change, current 2026-06-28): bans automated means incl. "LLM-driven bots, or any end-to-end flow that attempts to place orders without human review" except with eBay's prior express permission. Sniping software in general "is allowed" (eBay help).
- Timing practice: eSnipe 3-5 s buffer; Gixen founder prefers ~8 s; Gixen retries after 2 s timeout; Mirror = 2 servers.

Conclusion: no legitimate API path for a new personal sniper. A self-built browser sniper is "automated means" without permission (account risk).
Ranked paths: 1) Assisted snipe: app computes max bid, alerts at T-60s with one-tap link, Karim bids (no API, no ToS issue; timing ~human). 2) Gixen as executor (sanctioned authorization). 3) Apply for Offer API anyway. PlaceOffer: not viable.

## B. Data sources
| Need | Primary | Fallback |
|---|---|---|
| Sold price by grade | SportsCardsPro API (Legendary $49/mo; soccer incl. Prizm WC; ungraded, 7, 8, 9, BGS 9.5, PSA 10; internal use only) | Card Hedge API (pay-per-call from $0.01, quote tiers); Card Ladder manual |
| Pop / gem rate | PSA Public API /pop/GetPSASpecPopulation (free; limits unverified) | GemRate partner API (quote) |
| Images | PSA GetImagesByCertNumber; PSA order-page scans | eBay Browse API (active listings) |
| Collection values | SportsCardsPro collection + API | Card Ladder manual review |
- Card Ladder: no API, no export (CSV import only). ToS bans "any robot, spider ... or other manual or automatic device to retrieve ... 'scrape'" and "systematically downloading and storing Content"; penalty: account termination without refund (cardladder.com/terms). A scheduled weekly pull violates this. Lower risk: request written consent from Card Ladder.
- eBay Marketplace Insights: Limited Release; apply anyway, low odds.
- Unverified: PSA API current limits/EULA, GemRate & Card Hedge pricing, Ximilar soccer coverage, 130point/Market Movers/Goldin terms.
