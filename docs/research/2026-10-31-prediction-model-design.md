# Prediction model design: card sales + player development (checked 2026-10-31)

Follows docs/research/2026-10-31-prediction-repos.md, which found no credible card-price model. This pass looks at the
next-closest fields we can borrow from: football player market value (Transfermarkt), collectible price dynamics, and
free player-signal data. Time-boxed to about 20 min of searching.

## Question and what "better" means
Which features and validation methods should our own model use to predict the **4-8 week card price change** for about
23 tracked players? "Better" for Karim means three things. It runs weekly. It ranks which players' cards to buy now
(undervalued) or skip (heated). It can be checked against what actually happened. Any output is a **benchmark signal,
not a price**. Card values still follow the card-comps skill.

## Verdict (blunt)
- Player-value models are mature, but they predict the **level** of a Transfermarkt value, not its **change**. Level
  models report R² 0.55-0.93. The one public model that predicts the change scores only **R² 0.205** on a time-split
  test, and its MAE is just 8% better than "no change". That is the realistic ceiling: changes are hard to predict
  even with 500k rows. With 23 players we will do worse.
- The strongest borrowable evidence for **cards** is a peer-reviewed-style study of baseball cards (Engelberg, Le &
  Williams 2017). It found momentum (3-month formation and 3-month hold earned about 5.6% per month), drift after good
  performance (about 1.5-1.8% per month top-minus-bottom decile) and underperformance of new issues. Caveat (inference):
  it used Beckett price-guide prices, which update slowly and can create artificial momentum.
- Recommended: a **transparent ranked score**, not XGBoost. It is validated walk-forward on rank correlation and on
  the top-pick hit rate against a naive baseline.

## 1. Player market value / breakout models (facts, sourced)
| Item | Stars / date | Target | Model | Data | Accuracy | Top features (importance) | Licence / code |
|---|---|---|---|---|---|---|---|
| [player-value-lgbm (HF)](https://huggingface.co/DanielRegaladoCardoso/player-value-lgbm) + [features dataset](https://huggingface.co/datasets/DanielRegaladoCardoso/player-value-features) | n/a; test set 2024+ | **log change to the next TM valuation (~6 months)** | LightGBM, L1 loss, 84 features | dcaribou/Kaggle player-scores: ~507k valuations, 31k players | Test R² **0.205**. MAE(log) 0.197 vs naive 0.2145. Ridge R² 0.130. AutoETS/Theta negative | By gain: citizenship, year, **value_diff_1**, log_value, **age**, month, value_diff_3, **international_caps**, **age_minus_position_peak**, value_lag_1 | Apache 2.0. Temporal split: train to 2022, val 2023, test 2024+. Code: github.com/DanielRegaladoUMiami/player-value-ml (could not fetch; not on allowlist) |
| [Omejieke et al., arXiv 2603.17687](https://arxiv.org/html/2603.17687) | 2026 | log TM value level; "undervalued" = top 15% mispricing | XGBoost, TabNet, LR; DistilBERT news sentiment | TM weekly valuations 2015-2024, 280k snapshots, 70k news articles | Regression R² 0.935 (level). Undervalued shortlist **ROC-AUC 0.677**, F1 0.263. Text alone ~0.51 (random) | SHAP: **mv_trend** #1, mv volatility #2, **age** #3, contract/fees moderate, news marginal | No code yet ("upon acceptance") |
| [Fotache et al., Applied Sciences 16(10) 5035](https://www.mdpi.com/2076-3417/16/10/5035) | May 2026 | sqrt TM value (level) | XGBoost best of LR/RF/SVM/MLP | worldfootballR (FBref + TM), 14,211 player-seasons, top 5 leagues | Test R² 0.60-**0.733** (XGB) | Permutation: **playing time** and **age** top 2, then **goals/90, assists/90**. Height flat | R code: github.com/marinfotache/ML_Football_Players_Market_Value |
| [arXiv 2212.11041 "What should clubs monitor..."](https://ar5iv.labs.arxiv.org/html/2212.11041) | 2022 | log TM value **2 years ahead** | Lasso + RF per position | Wyscout 2015-22 + TM 416k valuations | CV R² 0.49-0.62. Without league value 0.35-0.44 | **League average value**, **total minutes**, **age** (squared, negative), top-20 academy. Goals not selected (collinear) | No code |
| [arXiv 2207.11361](https://arxiv.org/abs/2207.11361) | 2022 | weekly salary (value proxy) | Mixed effects + RF | FBref + Capology, 1,684 players | Mixed R² 0.43 marginal / 0.61 conditional. RF 0.948 **in-sample only** (not credible) | Achievement score, goals, shots on target, age. Minutes and assists weak | github.com/leolee20/Final-year-project |
| [arXiv 2206.13246](https://arxiv.org/abs/2206.13246) | 2022 | TM value level | LightGBM + Optuna | SoFIFA 2022 + WhoScored | RMSE/MAE only | SHAP: FIFA Overall, release clause, age | No code. Uses SoFIFA (403 for us) |

**Feature consensus across these papers:**
- Playing time / minutes and age (or age vs position peak) appear in every one.
- Recent value trend is #1 in the two models that include it (diff_1 / mv_trend).
- Output per 90 (goals, assists, xG) matters but is collinear with minutes.
- League strength dominates cross-player level models. It is near-constant within one player over 8 weeks, so it is
  useless for our timing question (inference).
- News sentiment adds little (AUC 0.677 to 0.604 without text; text alone is random).

## 2. Collectible / card / sneaker price dynamics
| Item | Market | Finding | Accuracy / magnitude | Use for us |
|---|---|---|---|---|
| [Engelberg, Le & Williams, "Stock Market Anomalies and Baseball Cards" (AEA 2018 session)](https://aeaweb.org/conference/2018/preliminary/paper/E5ZtkdkZ) ([summary](https://alphaarchitect.com/stock-market-anomalies-and-baseball-cards/)) | Baseball cards. Beckett guides 1991-96, 37k cards, 1.66M prices | Momentum, performance drift, new-issue underperformance | 3m/3m momentum ~5.6%/month, profitable in 66 of 68 months. Active players 9.4%/month vs retired 2.7%. Sets <10 years old 4.6% vs older 0.9%. Prior-year stats decile spread 1.5-1.8%/month. Rookie cards -6.6% (or -8.6%; the paper is inconsistent) over 12 months | **Best evidence for our two feature families (price momentum + form).** Inference: guide prices are smoothed, so the momentum is likely overstated relative to eBay sales |
| [Ma & Treiber, Duke 2020](https://sites.duke.edu/djepapers/files/2020/08/matreiber-dje.pdf) | Sneakers, StockX, 349k sales, 30 shoes | Hedonic OLS. Premiums decay with days since release. Restock (supply shock) about -0.93 log. Hype +10% gives +0.3% premium | R² 0.65 (level) | Supply shocks matter more than hype. Card analogue (inference): reprints / new parallels of the same player, PSA pop jumps |
| Prior pass: Aquino & Gershenson 2024, Bautista & Orosco 2022, CS229 MTG 2014 | see 2026-10-31-prediction-repos.md | event +20%, injuries (-), stats (+) | as reported there | not repeated |

## 3. Free data sources for weekly player signals
| Source | Reachable from our runner | Cadence / freshness | Fields | Coverage gap | Terms |
|---|---|---|---|---|---|
| **Understat** via [understatapi 0.7.1 (Feb 2026)](https://pypi.org/project/understatapi) | Yes (stated by coordinator) | Per match. League `get_player_data(season)` = all players in one call | minutes, goals, assists, **xG, xA, npxG**, shots, key passes | EPL, La Liga, Serie A, Bundesliga, Ligue 1, RFPL only. **Not** MLS (Messi), Saudi (Ronaldo), Portugal, etc. | Understat ToS not checked. One league call per week is light, not bulk |
| **ESPN** hidden API ([pseudo-r/Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API), MIT, 663 stars, updated Jul 2026) | Yes (stated) | Per match | Rosters, scoreboards, Core v2 athlete `statistics` / `statisticslog` (soccer support not confirmed on the page; common v3 `/stats` and `/gamelog` are marked unsupported for soccer) | 24 soccer leagues incl. `usa.1`. Saudi slug not verified | Unofficial. The page says to follow ESPN ToS. No published rate limits |
| **dcaribou/transfermarkt-datasets** ([GitHub](https://github.com/dcaribou/transfermarkt-datasets), 524 stars, CC0-1.0; [Kaggle player-scores](https://www.kaggle.com/datasets/davidcariboo/player-scores)) | Downloadable without scraping: R2 bucket `https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/transfermarkt-datasets.duckdb` (also `.zip` and per-table `*.csv.gz`), per [README](https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/master/README.md). Not test-downloaded in this pass | **Updates paused.** player_valuations end 2026-06-12, appearances 2026-06-28, games 2026-07-06. No resume date | player_valuations (650k), appearances, games, transfers, players (caps) | Fine for **history/backtest**, useless for weekly signals until it resumes | CC0 |
| **felipeall/transfermarkt-api** ([ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Ffelipeall%2Ftransfermarkt-api), MIT, 292 stars, last push 2025-04-13; [service notes](https://deepwiki.com/felipeall/transfermarkt-api/4.1.2-player-market-value-service)) | Not tested | Live per request | marketValueHistory (date, value, club) via TM's `ceapi/marketValueDevelopment` endpoint | n/a | **It scrapes Transfermarkt live.** Transfermarkt ToS not checked. TM values change only 2-3 times a year, so they are not a weekly signal anyway |
| Card Ladder player index (already read by hand: 2026-10-31-cardladder-player-indexes.json) | By hand | 15 points per player | Index + top-card values | 9 players in the file | CL ToS for automation not checked (prior pass) |

Observation from our own file (fact): several CL card series are flat step functions. Examples: Salah 2018 WC Silver
PSA 10 at $90 for 7 points; Ronaldo 2003 Mega Craques PSA 10 at $156,000 for 9 points. These are carried-forward last
sales, not new prices. Inference: training on them creates fake low volatility and fake momentum. Weeks with no new
sale must be marked missing, not repeated.

## Gap table (what we can borrow vs what we lack)
| Capability | Who does it | How well | What they miss | Effort for us |
|---|---|---|---|---|
| Predict value **change** from lags + performance | player-value-lgbm | R² 0.205 out of sample, honest baselines | Player value, not cards. Needs 500k rows | M to copy the feature recipe (groups A, B, I), S to copy the baseline table |
| Price momentum / form drift for cards | Engelberg et al. | Strong in-sample effects, 6 years | Guide prices, baseball, 1990s | S (we have SoldStatsHistory) |
| Undervalued shortlist + AUC evaluation | Omejieke et al. | AUC 0.677 | Level mispricing, not timing. No code | S (copy the eval: top-15% label, AUC / hit rate) |
| Weekly minutes / xG for players | Understat | Good for top-5 leagues | Messi, Ronaldo, others outside top 5 | S |
| Historical TM valuations for backtest | dcaribou R2 / Kaggle | 650k rows, CC0 | Paused since Jul 2026 | S (one download) |
| Card-price target history | Our SoldStatsHistory (since 2026-05) + CL by hand | ~26 weeks by Nov 2026 | Short. Lanes mix cards | already have |

## 4. Recommended minimal model (inference, not sourced)
**Target.** y = log(median_{t+6w} / median_t) per player lane from SoldStatsHistory, **minus the cross-player median
of the same week** (excess move). This removes market-wide swings, which we cannot predict. Use 6 weeks as the middle
of 4-8. Score as a **rank** each week, not a price.

**Features (5, each z-scored across players within the week):**
1. **12-week price momentum** (log median_t / median_{t-12w}), with a 4-week reversal term as a check. Evidence:
   Engelberg 3m/3m momentum, stronger for active players and young sets. value_diff_1 is #3 and mv_trend is SHAP #1
   in the value models.
2. **Minutes share change** (last 4 matches' minutes vs the season-to-date share). Evidence: top-2 in Fotache, top in
   2212.11041.
3. **Output per 90 change**, (xG+xA)/90 over the last 5 matches minus the prior season. Use G+A where xG is
   unavailable. Evidence: Engelberg performance drift 1.5-1.8%/month; Fotache goals/assists per 90 rank next after
   minutes.
4. **Age minus position peak** (about 27 for forwards). Evidence: age is top-3 in every model; age_minus_position_peak
   is in the LGBM top 10. Inference: it probably works as a modifier (young and rising), not a weekly mover.
5. **Event flag** (transfer, injury, call-up, major tournament window) from the event catalog. Evidence: +20% event
   effect (Aquino & Gershenson), supply shock -0.93 log (sneakers), international_caps in the LGBM top 10. Use a dummy,
   not a learned weight, until there are 10 or more events.

**Model.** Equal-weight sum of the 5 z-scores (sign fixed by the evidence above). Then, only if it beats the
baselines, a ridge regression pooled across players with heavy shrinkage. No per-player models, no GBM, no tuning
grid.

**Baselines it must beat:** (a) no change; (b) momentum alone; (c) random rank.

**Validation (walk-forward):**
- Expanding window. Refit at week t only on rows whose 6-week outcome is fully known at t (6-week embargo).
- Metrics:
  - weekly Spearman rank correlation (IC) between score and outcome, averaged;
  - hit rate: did the top 4 players (top ~quintile) beat the cross-player median at 6 weeks?
  - top-minus-bottom quintile spread.
- Report non-overlapping 6-week blocks separately, because overlapping targets inflate significance.
- Sample size (blunt): 23 players × ~26 weeks ≈ 4 non-overlapping blocks ≈ 90 independent observations. The standard
  error of a weekly IC with 23 names is about 0.2. Only a mean IC above about 0.15, stable for 20+ weeks, is worth
  acting on. Expect "inconclusive" until about mid-2027.

**What will make it overfit:**
- More than 5 features, or any tuning on the same 26 weeks.
- Overlapping 6-week targets treated as independent.
- Carried-forward stale prices (CL step series, lanes with sampleSize < 5).
- Form stats revised after the fact, used as if known at t.
- Survivorship: the 23 players were picked partly because their cards rose.
- One-off regime: the 2026 World Cup (Jun 11-Jul 19) dominates the short history. Any model fit through it may learn
  "WC heroes rise", which won't repeat until 2030.
- Lanes mixing many cards: composition shifts (more /10 sales one week) look like price moves.

**Where the TM data fits:** use the dcaribou snapshot (to 2026-06) only as an **offline sanity check**. Does TM
value_diff for our 23 players lead card momentum in 2026 H1? It is not a weekly feature: TM revalues 2-3 times a year,
and the feed is paused.

## Ranking (weekly usefulness × money impact / effort)
1. **Understat weekly pull for the top-5-league players** into PlayerForm-style rows (minutes, xG, xA). Weekly yes,
   money medium, effort S. Feeds features 2 and 3. Flags: Understat ToS unchecked. Messi and Ronaldo need ESPN (soccer
   stats support unconfirmed) or the current manual rows.
2. **Score + walk-forward backtest harness** on SoldStatsHistory (features 1, 4, 5 now; 2 and 3 when (1) lands), with
   the baseline table. Weekly yes, money high if it works, effort M.
3. **Stale-price hygiene**: mark no-sale weeks as missing, and require sampleSize >= 5 for a lane to be scored. Effort
   S. Prerequisite for (2).
4. **One-off TM history check** from the dcaribou R2 download (CC0, no scraping). Effort S. Research only.
5. Not recommended: felipeall/transfermarkt-api (live scraping of TM, ToS unknown, low cadence), news sentiment
   (no lift in the literature), GBM on our data.

No eBay API approval is needed for any of these. No eBay scraping is added. Card Ladder stays manual.

## Facts vs inference
Sourced facts: everything in the tables in sections 1-3, with the links given. Inference: the model design (section 4),
the feature signs, the IC threshold and the sample-size arithmetic, the guide-price caveat on Engelberg, and the
stale-series risk drawn from our own JSON.

## Recommended for PM
1. Understat weekly player-signal ingest (S). Flag: Understat ToS to confirm. Players outside the top 5 leagues stay manual.
2. Stale-price hygiene in SoldStatsHistory scoring (S).
3. Prediction score + walk-forward backtest report on the Dips tab, extending the existing dip/heat flag, not a new
   page (M). Label it a benchmark signal.
4. One-off dcaribou TM-history lead/lag check (S, research).

## Sources (accessed 2026-10-31)
- https://huggingface.co/DanielRegaladoCardoso/player-value-lgbm
- https://huggingface.co/datasets/DanielRegaladoCardoso/player-value-features
- https://arxiv.org/html/2603.17687
- https://www.mdpi.com/2076-3417/16/10/5035
- https://ar5iv.labs.arxiv.org/html/2212.11041
- https://arxiv.org/abs/2207.11361
- https://arxiv.org/abs/2206.13246
- https://aeaweb.org/conference/2018/preliminary/paper/E5ZtkdkZ
- https://alphaarchitect.com/stock-market-anomalies-and-baseball-cards/
- https://sites.duke.edu/djepapers/files/2020/08/matreiber-dje.pdf
- https://raw.githubusercontent.com/dcaribou/transfermarkt-datasets/master/README.md
- https://github.com/dcaribou/transfermarkt-datasets
- https://awesome.ecosyste.ms/projects/github.com%2Ffelipeall%2Ftransfermarkt-api
- https://deepwiki.com/felipeall/transfermarkt-api/4.1.2-player-market-value-service
- https://pypi.org/project/understatapi
- https://github.com/pseudo-r/Public-ESPN-API
- Repo: packages/db/migrations/20260512_sold_stats_history.sql, 20261016e_snipe_board.sql;
  docs/research/2026-10-31-cardladder-player-indexes.json
