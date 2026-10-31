# Rookie radar, 2026-10-31 (report only)

Question: which players aged 21 or under can Karim buy before the hype, inside the $500 biweekly snipe budget (single max bids $20-250)?
"Better" means a player whose role is growing while his key card's 90-day raw price is still flat.

**Status: only half done.** The form screen is done. The price gate (90-day raw eBay sold, 30-day vs 90-day change) could
**not** be run. No prices appear below, and nothing is a pick yet. Each name is provisional until its comps are pulled.

## Why no prices
Checked 2026-10-31 from this agent session:
- eBay sold search (`ebay.com/sch ... LH_Sold=1`): not on the fetch allowlist.
- 130point: search returns only its homepage and blog pages, no sales.
- Card Ladder showcase pages: fetch fails (client_error). The app needs a login.
- SportsCardsPro card pages: fetch fails (client_error).
- eBay `/itm` and `/p` pages: fetch fine, but show only **active** listings (asking prices), not sales.
- CardPulse / Sports Card Investor: no individual sales. SCI shows 0.0% change with no dollar values.
Under the card-comps rules an asking price isn't a comp, and "not checked" is not "no sale found". These cards therefore do
**not** go to researcher-2: the cause is access, not thin comps.

## Form screen (FotMob player pages, read 2026-10-31; baseline = PlayerForm seed of 2026-10-16)
FotMob pages contradict themselves on some scorelines and totals (the fetch flagged this on most pages). Minutes and G/A
below come from the per-match rows. Confirm on Transfermarkt or the match pages before any row is approved.

### Provisional picks (form passes; price gate NOT run)
| # | Player | Age, club | Why now (dated, sourced) | Key card | 90-day raw median | 30d vs 90d | Proposed Snipe target (not created) | Max-bid input | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rio Ngumoha | 18, Liverpool | UCL: 85' Oct 14 (at LASK), 74' + 2 assists Oct 20 vs Villarreal (rating 9.0), 82' EFL Cup Oct 28. England senior: competitive debut Sep 29 (NL at Czechia, 19'), 17' Oct 6. PL is still a bench role: 6 apps, 1 start, 166' [1][2] | 2025-26 Topps Chrome UCC #191 Rio Ngumoha RC (base). CL label: "2026 Topps Chrome UCC". Number from CardPulse [11], not the official checklist | Not checked (access). Active asks for base $0.99-3.99 [12]; Image Variation SP ask $39.95 [13]. Asks, not comps | Unknown | query `2025-26 Topps Chrome UCC Rio Ngumoha 191 RC`; mustInclude `chrome`,`ngumoha`,`191`,`2025\|2026`; exclude `psa,bgs,sgc,cgc,beckett,graded,lot,refractor,x-fractor,xfractor,gold,green,blue,red,orange,purple,pink,black,aqua,sapphire,superfractor,auto,variation,ssp,sp,wonderkids,anime,radiating,helix` | Not available | Med on form, none on price. The base sits under $5 (asks), below the $20-250 bid band. A numbered parallel (e.g. Gold /50) would fit the budget better, but needs its own comps |
| 2 | Franco Mastantuono | 19, Fiorentina (loan from Real Madrid, Aug 2026-Jun 2027) | Loan move, now a starter: 9 apps, 9 starts, 700' in Serie A. Hat-trick Sep 11 at Venezia; no club G/A in October (89' Oct 29, 75' Oct 25, 69' Oct 18, 90' Oct 10). Argentina: goal Oct 4 vs Burkina Faso [3][4] | 2025-26 Topps Chrome UCC #172 Franco Mastantuono RC (base) [11]. Karim owns the 2025-26 Helix #4 PSA 8 (seed import) | Not checked (access) | Unknown | query `2025-26 Topps Chrome UCC Mastantuono 172 RC`; mustInclude `chrome`,`mastantuono`,`172`,`2025\|2026`; exclude as row 1 plus `shadow`,`etch` | Not available | Med-low. Minutes are up, but G+A per 90 is falling since September, not rising. He also plays outside the UCC set's club competitions this season |
| 3 | Rodrigo Mora | 19, Roma | October minutes rising: 45' + assist Oct 14 (UCL at Real Madrid), 63' Oct 17, 90' Oct 20 (UCL), goal in 34' Oct 27. Serie A: 7 apps, 3 starts, 274', 2 G. Portugal U21 only (goal Sep 30) [5] | First Chrome UCC rookie **not identified**. CardPulse lists him only in the 2025-26 "Future Stars" subset with no number [11]. Needs the official checklist | Not checked | Unknown | Not proposed until the card is confirmed | Not available | Low. The card can't be named yet |

### Already moved
- None can be called. "Moved" needs the 30-day vs 90-day comparison, and that wasn't available.

### Watching, not yet (one line each, FotMob 2026-10-31 unless noted)
- Estevao (19, Chelsea): one strong game, 87' and rating 8.2 vs Man Utd on Oct 31, after 6' / 18' / unused in October. Brazil G+A Oct 3. One game is not a trend [6]. Key card per CardPulse: 2025-26 UCC #66 [11].
- Senny Mayulu (20, PSG): back from injury, goal in 25' vs Lyon Oct 26, 43' total in the league. France U21 [7].
- Ayyoub Bouaddi (19, Man City): big move Aug 26 2026 and Morocco World Cup squad, both more than 6 weeks old. October: 90' Oct 17, 45' + assist Oct 14 (UCL), 55' Oct 31 [8][9].
- Max Dowman (16, Arsenal): 19' in the PL. 2 goals in the EFL Cup Sep 15, 85' EFL Cup Oct 27. Loan talk Oct 12 [10].
- Ethan Nwaneri (19, Dortmund loan): starter (5 apps, 4 starts, 310') but 0 G/A. England U21 only [14].
- Mikey Moore (19, Köln loan): starter (6 apps, 4 starts, 384') but 0 G/A. England U20 [15].
- Myles Lewis-Skelly (20, Arsenal): England regular (4 Nations League games, Sep-Oct), Arsenal rotation, 0 G/A [16].
- Geovany Quenda (19, Chelsea): 5 apps, 101' (72' Oct 24). Portugal U21, no senior call [17].
- Junior Kroupi (20, Bournemouth): 3' on Oct 25 after foot surgery. Prior season 13 PL goals [18].
- Lucas Bergvall (20, Spurs): 144' in the PL, no minutes since Oct 10 [19].
- Shea Lacey (19, Man Utd): 12' in the PL, unused 5 times since Sep 13 [20].
- Claudio Echeverri (20, Benfica loan): no minutes since Sep 13 [21].
- Kenan Yildiz (21, Juventus): broken foot (Aug), back early December [22].
- Nico Paz: best numbers on the list (Serie A 8 starts, 3 G 3 A, rating 8.11. UCL 2 G 1 A vs Man Utd Oct 21), but he is **22**, outside the age limit. He is also likely priced already [23].

## Couldn't verify, and why
- All prices and price trends: see "Why no prices".
- Card numbers come from CardPulse's release guide (secondary), not the official Topps checklist. "First" Chrome UCC is also
  unconfirmed for Estevao, Mora, Mayulu and Bouaddi (earlier Topps sets may exist).
- FotMob totals and match rows disagree on several pages (Bouaddi, Mastantuono, Lacey, Echeverri). The Oct 16 seed showed
  Echeverri on 2 apps / 47'. FotMob now shows 1 app / 18'.
- No league-wide scan for the 5 extra players. I added no one without stats behind it.

## Next step to finish the price gate (needs Karim)
Pull 90-day raw sold comps for #191 Ngumoha and #172 Mastantuono (base, plus one numbered parallel each in the $20-250
band) from a logged-in Card Ladder or eBay session, following .claude/skills/card-comps/SKILL.md. Check each sale photo
for a stamped serial before counting it as base.

## Recommended for PM
Ranked by (weekly use x money impact) / effort:
1. **A sold-comps source agents can read (M).** Every weekly comps, audit and radar task stalls here. The option in
   docs/research/2026-10-sniper-and-data-sources.md is the SportsCardsPro API ($49/mo, internal use only). That price is
   from an earlier doc, not re-checked today. It needs Karim's approval of the cost and a ToS check. No scraping.
2. **PlayerForm refresh with a "rising" flag (S).** Store the Oct 31 rows next to the Oct 16 seed and flag minutes or G+A
   per 90 increases. Data already sits in PlayerForm; needs Karim's approval of the rows.
3. **Checklist-confirmed key card per prospect (S).** One verified card name per watch-list player, so the snipe query is
   right before any price work.

## Sources (all accessed 2026-10-31)
1. https://www.fotmob.com/players/1597668/rio-ngumoha
2. https://en.wikipedia.org/wiki/Rio_Ngumoha
3. https://www.fotmob.com/players/1607566/franco-mastantuono
4. https://www.fotmob.com/news/1x3pfmuee8hp1b9cjbg65vf3y-mastantuono-joins-fiorentina-season-long-loan-from-real-madrid
5. https://www.fotmob.com/players/1525065/rodrigo-mora
6. https://www.fotmob.com/nb/players/1580774/estevao
7. https://www.fotmob.com/players/1574189/senny-mayulu
8. https://www.fotmob.com/fr/players/1561552
9. https://en.wikipedia.org/wiki/Ayyoub_Bouaddi
10. https://www.fotmob.com/players/1635773 ; https://www.fichajes.net/en/news/arsenal-is-studying-the-departure-of-max-dowman-20261012.html
11. https://www.cardpulse.club/blog/topps-chrome-ucc-2025-26-release-guide
12. https://www.ebay.com/p/20096513216 ; https://www.ebay.com/itm/287328051600 (active asks)
13. https://www.ebay.com/itm/158010789976 (active ask)
14. https://www.fotmob.com/players/1254234/ethan-nwaneri
15. https://www.fotmob.com/players/1407250/mikey-moore
16. https://www.fotmob.com/players/1406436/myles-lewis-skelly
17. https://www.fotmob.com/nb/players/1530314/geovany-quenda
18. https://www.fotmob.com/en-GB/players/1460534/eli-junior-kroupi
19. https://www.fotmob.com/players/1386775/lucas-bergvall
20. https://www.fotmob.com/players/1436260/shea-lacey
21. https://www.fotmob.com/players/1486264/claudio-echeverri
22. https://www.fotmob.com/players/1412132/kenan-yildiz
23. https://www.fotmob.com/players/1347574/nico-paz
24. https://www.sportscardinvestor.com/subjects/rio-ngumoha-soccer (no prices shown)

## Coordinator follow-up: Card Ladder sales (Karim's session, 2026-10-31, raw, no autos)
Rio Ngumoha 2025-26 Topps Chrome UCC #191:
- Base / Sapphire base: Oct 29 $1.34 (BO), Oct 24 Sapphire $6.50, Oct 11 Sapphire $9.00 / $7.08
- Blue /150: Oct 11 $13.50; Blue Lava /150: Oct 23 $15.51, $15.01
- Teal /299: Oct 27 $12.00, Oct 26 $21.50
- Negative Refractor SP: Oct 25 $32.50, $40.00 (BO)
- Green Starball /99: Sep 21 $46.00 x2; Sapphire Green /99: Sep 24 $37.01
- Purple Lava /75: Oct 8 $60.00 (BO)
- Orange Geometric /25: Oct 11 $140.02; Orange Refractor /25: Oct 26 $318.39 (one sale each; different parallels)
- True Red /5: Oct 23 $2,942.83 (BO)
Franco Mastantuono 2025-26 Topps Chrome UCC #172:
- Teal Lava /299 Oct 29 $4.25; Aqua /199 Oct 25 $3.25, Aqua Lava /199 Oct 21 $1.99; Sapphire base Oct 20 $4.00
- Purple Starball /75: Oct 19 $50.00 (BO); Orange X-Fractor /25: Oct 25 $76.18
Read: no hype yet in either. Most numbered parallels have 1-2 sales, so no 90-day median exists per exact parallel.
