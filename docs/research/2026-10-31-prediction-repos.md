# Card-price prediction: repos, papers, and methods we can run ourselves (checked 2026-10-31)

## Question and what "better" means
Is there an existing, credible model (GitHub repo or published study) that predicts sports-card prices or links player
performance or events to card prices, and could we run it on our data? For Karim, "better" means something he can use
weekly that flags cards likely to be undervalued (for buying) or overheated (for not buying or for selling), backed by
numbers he can check. A black box doesn't count.

Data we already hold (from the repo migrations): `CardComp` (sales per exact card), `CardPop` (PSA pop),
`SoldStatsHistory` (weekly median / trend7d / trend30d per player lane, kept since 2026-05 because eBay only shows about 90 days),
`PlayerForm` (season lines, approved by Karim), `SnipeTarget`, and Card Ladder sales history read by hand.

## Verdict (blunt)
**Nothing credible exists to adopt.** No public repo predicts sports-card prices with a reported backtest. No repo
links soccer performance or tournaments to card prices. What exists falls into four groups:
- trackers that average eBay prices and predict nothing;
- toy or MVP scorers with mock data and no accuracy figures;
- a grading-image model (not pricing);
- a few academic studies with useful *effect directions* but no reusable code.

The studies are worth borrowing as method templates, especially the event study around a discrete shock. They aren't
worth borrowing as software.

## What was checked (time-boxed, about 15 min of searching)
| Item | Type | Stars / date | Predicts | Data needed | Reported accuracy | Licence | Runs on our data? |
|---|---|---|---|---|---|---|---|
| [sstockdev/cardStatX](https://github.com/sstockdev/cardStatX) | GitHub repo | 0 stars; archived 2025-12-18 | Nothing. Weekly/monthly averages of eBay prices | eBay OAuth token, TCDB scrape | None | MIT | No value. We already have better medians |
| [rjexile/sports-card-agent](https://mcpservers.org/servers/rjexile/sports-card-agent) | MCP server | stars not shown | "Buy/sell/hold" from trend + player stats (NBA/NFL/MLB only) | eBay keys, Ball Don't Lie API; mock data if none | None (29 unit tests, not a backtest) | MIT | No. US sports only, no soccer stats, method not described |
| [rthorst/mint_condition](https://awesome.ecosyste.ms/projects/github.com%2Frthorst%2Fmint_condition) | GitHub repo | 50 stars; last push 2020-04-14 | PSA-style grade from a photo (not price) | ~90k graded eBay images via eBay API | Not stated on page | Not stated | Not for pricing. Already covered by docs/research/2026-10-29-grading-tech.md |
| [MMStudioCreations/poke-predict](https://github.com/MMStudioCreations/poke-predict) | GitHub repo (Pokemon) | 0 stars, 3 commits | "Undervalued" score over 30d / 90d / 6m | Mock data only | None; no backtest | Not stated | Only as an idea: a weighted score (momentum 25 / catalyst 30 / grading 20 / volume 15 / sentiment 10) with arbitrary weights |
| [OffWorldTensor pokemon-price-predictor](https://corsage-trickily-pungent5.pages.dev/OffWorldTensor/pokemon-price-predictor) | HF model (Pokemon) | n/a | P(price +30% in 6 months), MLP | TCG metadata + price history | None reported | Not stated | No. Different market, no metrics |
| [Card Hedge, Medium 2023-05-03](https://medium.com/@cardhedge/unlocking-sports-card-value-a-data-driven-approach-to-identifying-potential-investment-gems-a9c28d396262) | Blog "ML model" | n/a | "Undervalued" gap vs last sale | Last sale, gem rate, age | None; its worked examples don't reproduce its own formula | n/a | No. Fixed constants, no training |
| [Stanford CS229 2014, MTG prices](https://cs229.stanford.edu/proj2014/Matt%20Pawlicki,%20Joe%20Polin,%20Jesse%20Zhang,%20Prediction%20of%20Price%20Increase%20for%20MTG%20Cards.pdf) | Student paper | 2014 | Daily "buy" signal for MTG cards | Daily prices, tournament usage, volume | Test error 11% (LR), 15% (SVM) | n/a | Not directly: needs daily prices and volume we don't have. Its useful idea is that a usage/catalyst feature plus a short price window beats price alone |
| [Aquino & Gershenson, J. Sports Econ. 2024](https://econpapers.repec.org/RePEc:sae:jospec:v:25:y:2024:i:6:p:683-706) | Peer-reviewed | 2024 | Effect of a player's death on baseball card prices | High-frequency sales | About +20% after death, persisting at least 60 days (interrupted time series) | n/a | Method yes (event study), event no |
| [Bautista & Orosco, UP Diliman 2022](https://selib.upd.edu.ph/etdir/items/e9677133-9f2f-4167-930f-ed1c45b87d35/full) | Thesis | 2022 | NBA card price vs in-season stats | Market Movers prices + Stathead stats | Significant: injuries (-), points and blocks per game (+). No R² on the page | n/a | Method yes (panel + LASSO), but we have few players |
| [Lucas, ECU MSc 2025](https://thescholarship.ecu.edu/items/3ce5162d-192b-4c38-bf9e-cb39f7b45d15/full) | Thesis | 2025 | NFL card price by position (XGBoost / stacking) | Performance, draft, condition | Feature R² > 0.60; final model error not on the page; no code | n/a | No. Cross-sectional level model, not a timing signal |

Not found: any soccer-specific model, any World Cup event study, any public Card Ladder-based model. (The
[Panini 2014 WC Prizm price piece](https://blog.paniniamerica.net/panini-america-studies-staggering-prices-of-2014-fifa-world-cup-prizms-best-cards/)
is marketing, not analysis.)

## Methods we can apply ourselves (simple and defensible), ranked
These are inference, not sourced results. Any number they produce is a **benchmark signal, not a price**. Values still
follow the card-comps skill, and any estimate goes through researcher-2 and Karim.

| # | Method | What it answers | Data needed | Have it? | Effort |
|---|---|---|---|---|---|
| 1 | **Event study around the World Cup** (pre window = 90 days before Jun 11; event = Jun 11-Jul 19; post = Jul 20-Oct 31). For each player, compare the median of their tracked cards in each window and normalise by a market control (median of all tracked players, or the CL index). Abnormal move = player move minus control move. Then compare abnormal moves with `wc` performance in 2026-10-31-player-windows.json | Did WC heroes (Messi, Mbappe, Bellingham, Haaland) re-rate and stay up, or spike and fade? Who is still above the pre-WC level without a performance reason (overheated)? Who fell despite strong form (possible dip buy)? | Dated sales per exact card for Mar-Oct 2026 (Card Ladder history covers this; `SoldStatsHistory` from May), plus the stats JSON | Mostly. Pre-May history must come from Card Ladder by hand | M |
| 2 | **Momentum and mean reversion on 30/90-day medians**: ratio r = median30 / median90 per exact card or player lane; flag r < 0.8 with a stable or rising W3 form line as a "dip". Flag r > 1.3 with no new event as "heated". Backtest on `SoldStatsHistory` once there are 26 or more weeks (about Nov 2026) | Weekly Dips tab signal that can be checked against what happened 4-8 weeks later | `SoldStatsHistory` (weekly median, trend30d already stored), `PlayerForm` | Yes (thin until about 26 weeks) | S |
| 3 | **Form-to-price lag check**: per player, correlate weekly change in G+A per 90 (from approved `PlayerForm` rows) with the price change 1-4 weeks later. Report as a table, not a model, because 23 players is too few for regression | Whether stats lead prices for these players, or prices move first (hype) | `PlayerForm` refreshed weekly (Mon task) + `SoldStatsHistory` | Partly. Form history is short | M |
| 4 | Event catalog (transfers, injuries, call-ups, awards) as dated rows that can be overlaid on price charts | Explains spikes; feeds #1 | Events column of the stats JSON | Yes, from this research | S |

Not recommended: ML regression or XGBoost on our data. With about 23 players and a few hundred exact-card sales, it will
overfit, and none of the published models report out-of-sample accuracy we could hold ourselves to.

## Flags
- No eBay API approval is needed for 1-4. They use data we already collect. Do not add bulk eBay scraping for this (CLAUDE.md: IP bans).
- Card Ladder: reading sales history by hand is how we use it today. Bulk export or automated pulls may breach CL's terms. Not checked here: confirm before automating #1.
- Ball Don't Lie and similar stats APIs don't cover soccer. FotMob and goal.com data was read by hand; their figures conflicted for several players (see the JSON notes). Automating stats pulls from them is a ToS question.

## Recommended for PM
1. **Momentum dip/heat flag on the Dips tab** (method 2). S effort, uses `SoldStatsHistory` plus `PlayerForm`, runs weekly. Label it a benchmark signal.
2. **World Cup event study report** (method 1). M effort, one-off research run by researcher plus a small Radar card showing the abnormal move per player. Needs Card Ladder pre-May sales by hand.
3. **Event catalog rows** (method 4). S effort, stored next to `PlayerForm` so the charts can show events.
4. **Form-to-price lag table** (method 3). M effort; worth doing only after about 26 weeks of history (from about Nov 2026).
5. No external repo to adopt. Don't spend engineering time integrating any listed above.

## Sources (accessed 2026-10-31)
- https://github.com/sstockdev/cardStatX
- https://mcpservers.org/servers/rjexile/sports-card-agent
- https://awesome.ecosyste.ms/projects/github.com%2Frthorst%2Fmint_condition
- https://github.com/MMStudioCreations/poke-predict
- https://corsage-trickily-pungent5.pages.dev/OffWorldTensor/pokemon-price-predictor
- https://medium.com/@cardhedge/unlocking-sports-card-value-a-data-driven-approach-to-identifying-potential-investment-gems-a9c28d396262
- https://cs229.stanford.edu/proj2014/Matt%20Pawlicki,%20Joe%20Polin,%20Jesse%20Zhang,%20Prediction%20of%20Price%20Increase%20for%20MTG%20Cards.pdf
- https://econpapers.repec.org/RePEc:sae:jospec:v:25:y:2024:i:6:p:683-706
- https://selib.upd.edu.ph/etdir/items/e9677133-9f2f-4167-930f-ed1c45b87d35/full
- https://thescholarship.ecu.edu/items/3ce5162d-192b-4c38-bf9e-cb39f7b45d15/full
- https://blog.paniniamerica.net/panini-america-studies-staggering-prices-of-2014-fifa-world-cup-prizms-best-cards/
- Repo: packages/db/migrations/20260512_sold_stats_history.sql, 20261016e_snipe_board.sql
