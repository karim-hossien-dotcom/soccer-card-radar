# Inversion audit: parallels valued below their own base (2026-10-29)

**Status: INCOMPLETE.** Card Ladder blocked searches ("Too many searches. Please wait and try again.") after about 10 queries. It was still blocked after waiting about 15 minutes. Another session was searching Card Ladder on the same account at the same time (tab "mainoo match ball"). 5 parallels were checked against live Card Ladder sales. 2 more were checked against the documented sales in `.claude/agents/researcher-2.md`. The other 62 are listed below with the exact query to run.

Method: Vault value = latest raw `CardComp` row (query in the task brief). Base = raw Card Ladder sales from 2026-07-31 to 2026-10-29 for the same year, set, insert and number. Titles had to contain the year, player, number and set word. Excluded: titles with a colour or parallel word, a serial (/NN), a grading company (PSA/BGS/SGC/CGC/TAG and others), lots, multi-card listings and autos (unless the card is an auto). "Recent" means the last 30 days (from 2026-09-29). Nothing was written to the database.

## Results

| card id | item | Vault value (source, date, n) | base median (n, date range) | verdict | note | query |
|---|---|---|---|---|---|---|
| 14332c38 | 2024-25 Merlin Match Ball Signature Relics #KM Mainoo Gold | $155.00 (cardladder_sales, 2026-10-29, n=3) | $210.53 (n=2: $211.70 Oct 13, $209.35 Sep 26) | **INVERSION (provisional)** | Base data comes from the researcher-2.md worked example and was not re-pulled here (rate limit). Base was $110-117 in Jun-Jul, so it has risen sharply. The Gold's own sales (Sep 1-18) came before that rise. Hand off to researcher-2: its ratio estimate is about $328. | (doc) "2024 Merlin Mainoo Match Ball" |
| 3268551e | 2020 Merlin Chrome UCL #100 Mbappe Blue Refractor /75 | $56.00 (cardladder_sales, 2026-10-29, n=1) | $1.74 (n=6, Aug 6-Oct 18) | OK | Base flat to soft: last 30d $1.22 (n=3), earlier $2.00 (n=3) | "2020 Merlin Mbappe 100" |
| 338279d1 | 2017 Topps Chrome UCL #24 Salah Blue Refractor /150 | $198.60 (cardladder_value, 2026-10-29, n=0) | $2.48 (n=6, Aug 31-Oct 14) | OK | Only 1 base sale in the last 30 days ($1.98) | "2017 Chrome Salah 24" |
| c82ffb2a (dup ce5c9fd2) | 2017 Topps Chrome UCL #24 Salah Refractor | $10.50 (cardladder_sales, 2026-10-29, n=5) | $2.48 (n=6, Aug 31-Oct 14) | OK | Same base as above | "2017 Chrome Salah 24" |
| 0ab07b98 | 2018 Prizm World Cup #154 Ronaldo Red/Blue Wave | $82.50 (cardladder_sales, 2026-10-29, n=2) | $11.73 (n=26, Aug 8-Oct 28) | OK | Base softening: last 30d $9.83 (n=8), earlier $12.56 (n=18), about -22% | "2018 Prizm Ronaldo 154" |
| 722561f0 | 2018-19 Donruss #158 Ronaldo Optic Purple Velocity /125 | $45.00 (cardladder_sales, 2026-10-29, n=1) | $3.90 (n=8, Aug 1-Oct 24; Optic base only, Holo excluded) | OK | Base firming: last 30d $5.28 (n=4), earlier $3.28 (n=4) | "2018 Donruss Ronaldo 158" |
| 66ef13fb | 2024-25 Merlin Match Ball Signature Relics #KM Mainoo Orange /25 | $220.50 (cardladder_sales, 2026-10-29, n=1) | $210.53 (n=2, Sep 26-Oct 13) | OK (marginal, provisional) | Only 4.7% above base, with a single own sale on Aug 30. Base data is from researcher-2.md (see the Gold row). Hand off to researcher-2: its ratio estimate is about $337. | (doc) |

## Not checked (Card Ladder rate limit): query to run

Base filter for each row: same year/season, set and number; no colour, serial or grade.

| card id | item | Vault value (source, date) | base query |
|---|---|---|---|
| 53bcdc51 | 2019 Sapphire UCL #100 Ronaldo Green 5/75 | $227.95 cl_value | "2019 Sapphire Ronaldo 100" returned 0 results (rate limit possibly already active); next try "2019 Chrome Ronaldo 100" |
| 5d90866d | 2020 Finest Bundesliga #31 Haaland Blue /150 | $17.25 cl_sales n=2 | "2020 Finest Haaland 31" |
| c33d9126 | 2020 Merlin UCL #73 Musiala Green /99 | $82.00 workbook_import 10-16 | "2020 Merlin Musiala 73" |
| fd52e1c0 | 2020 Merlin UCL #73 Musiala Refractor | $9.00 workbook_import 10-16 | same as above |
| f56eadb6 | 2021 Mosaic PL #136 Olise Mosaic | $45.00 cl_sales n=3 | "2021 Mosaic Olise 136" |
| b5faa56c (dup 1d2c660e) | 2021 Mosaic PL #71 Mbeumo Mosaic | $2.50 cl_sales n=2 | "2021 Mosaic Mbeumo 71" |
| a6762e62 | 2021 Obsidian #120 Mbeumo Electric Etch Purple | $7.00 workbook_import | "2021 Obsidian Mbeumo 120" |
| d6a87a6c | 2021 Prizm PL #278 Pogba Orange | $100.95 cl_value | "2021 Prizm Pogba 278" |
| 064a772e | 2021-22 Sapphire UCL #58 Bellingham Orange /50 | $109.17 cl_value | "2021 Sapphire Bellingham 58" |
| 31dbba90 | 2021-22 Topps UCL #161 Sesko Starball Foil | $8.13 cl_sales n=3 | "2021 Topps Sesko 161" (exclude Chrome/Finest/Merlin) |
| 7c1f0d52 (dup 1d2ea49f) | 2021-22 Topps UCL #100 Ronaldo Sparkle Foil | $13.00 psa_apr n=7 | "2021 Topps Ronaldo 100" (exclude Chrome/Finest/Merlin) |
| 385ff5fd | 2022 Prizm WC #90 Bellingham Blue | $58.00 workbook_import | "2022 Prizm Bellingham 90" |
| 597b9ddc | 2022 Jade UCC #20 Vinicius Yellow Jade /50 | $40.74 cl_value | "2022 Jade Vinicius 20" |
| da3269fb | 2022-23 Obsidian #174 Rodrygo Gold Flood /10 | $120.07 cl_value | "2022 Obsidian Rodrygo 174" |
| 5c8c9360 | 2022-23 Chrome UCC Golazo #G12 Ronaldinho Yellow | $39.24 cl_sales n=2 | "2022 Chrome Ronaldinho Golazo" |
| 217fa4df | 2022-23 Finest Flashbacks #104 Mainoo Black /25 | $125.53 cl_value | "2022 Finest Mainoo Flashbacks" |
| 7cdb3c57 | 2022-23 Merlin UCC #100 Ekitike Atomic | $15.00 workbook_import | "2022 Merlin Ekitike 100" |
| a1dc5237 | 2022-23 Merlin UCC #97 Mainoo Blue Refractor | $28.00 workbook_import | "2022 Merlin Mainoo 97" |
| 50cf89da | 2022-23 Stadium Club Chrome #73 Mainoo Refractor | $7.00 workbook_import | "2022 Stadium Mainoo 73" |
| 0286191c | 2023 Crystal UCL Gold Star #GS8 Vinicius Red /5 | $39.00 workbook_import | "2023 Crystal Vinicius Gold Star" |
| 0106dfc5 | 2023-24 Donruss Net Marvels #11 Haaland Gold /10 | $119.49 cl_value | "2023 Donruss Haaland Net Marvels" |
| 07eb298c | 2023-24 Immaculate #74 Forbs Sapphire /25 | $3.25 cl_sales n=1 | "2023 Immaculate Forbs 74" (base may itself be numbered) |
| 3433c665 | 2023-24 Prizm PL Mainoo Blue Mosaic RC | $8.25 cl_sales n=6 | "2023 Prizm Mainoo" (card number missing in Vault) |
| 8fb68cfe | 2023-24 Select PL #70 Mainoo Pink Ice | $3.99 cl_sales n=3 | "2023 Select Mainoo 70" |
| 8ab38f77 | 2023-24 Chrome Euro Guler Future Stars Neon Green /150 | $18.28 workbook_import | "2023 Chrome Guler Future Stars" |
| 57b7aba3 | 2024 Obsidian Leao Gold Flood | $101.79 cl_value | "2024 Obsidian Leao" |
| 029e754f | 2024 Chrome Logofractor UCC #9 Haaland Black Starball /10 | $150.00 workbook_import | "2024 Logofractor Haaland 9" |
| e04e8162 | 2024 Topps UEFA Mainoo Gold /50 | $8.50 cl_sales n=1 | "2024 Topps Mainoo Gold" first, to get the set and number |
| 1ffa23c7 | 2024-25 Chrome UCC #116 Barcola Black | $132.00 workbook_import | "2024 Chrome Barcola 116" |
| 5c10c43a | 2024-25 Chrome UCC #83 Ouedraogo Pink Lava /250 | $3.00 workbook_import | "2024 Chrome Ouedraogo 83" |
| 5f34dc59 | 2024-25 Dynasty Auto #DAV-KM1 Mainoo Black 3/5 | $1644.04 cl_value | "2024 Dynasty Mainoo" (no unnumbered base exists) |
| 15c8d5ef | 2024-25 Finest #54 Mayulu True Black 04/10 | $60.82 owner_set | "2024 Finest Mayulu 54" |
| eaca6b30 | 2024-25 Merlin #159 Castro Blue /150 | $11.00 workbook_import | "2024 Merlin Castro 159" |
| bafd1a87 | 2024-25 Merlin #40 Guler Orange | $13.00 workbook_import | "2024 Merlin Guler 40" |
| 6e4006cb | 2024-25 Merlin #70 Ouedraogo Purple /15 | $3.00 cl_sales n=1 | "2024 Merlin Ouedraogo 70" |
| 211848e7 | 2024-25 Merlin Auto #AU-SM Mayulu Gold Mojo /50 | $122.54 cl_value | "2024 Merlin Mayulu Auto" (auto base) |
| b39e270f | 2024-25 Topps UCC Japan Heroes #1 Mbappe Mojo | $51.50 cl_sales n=2 | "2024 Japan Mbappe Heroes" |
| 4e9608bf | 2024-25 Topps UCC Japan Heroes #8 Salah Mojo | $16.50 cl_sales n=1 | "2024 Japan Salah Heroes" |
| 6051a918 | 2025-26 Chrome UCC #179 Luis Diaz Orange | $25.00 cl_sales n=1 | "2025 Chrome Diaz 179" |
| 7e358e98 | 2025-26 Chrome UCC #181 Haaland White | $125.40 cl_value | "2025 Chrome Haaland 181" |
| 01674896 | 2025-26 Chrome Auto #JP Joao Pedro Gold | $112.50 cl_sales n=1 | "2025 Chrome Joao Pedro Auto" |
| 417b5ecd | 2025-26 Chrome Legends Auto #SM Mane Gold | $152.50 workbook_import | "2025 Chrome Mane Auto" |
| 19786753 | 2025-26 Chrome Road to Glory Auto #FI Inzaghi Gold | $83.00 cl_sales n=1 | "2025 Chrome Inzaghi Auto" |
| 73db66b4 | 2025-26 Topps UCC 8bit Shots #8B-19 Salah Orange Foil | $162.50 workbook_import | "2025 Topps Salah 8bit" |
| 94c5780d | 2025-26 Select FIFA #200 Rodrygo Green Mezzanine 2/5 | $41.00 cl_sales n=1 | "2025 Select Rodrygo 200" |
| 30d4509d | 2025-26 Select WC #80 Mbappe Peacock SSP | $202.50 cl_sales n=1 | "2025 Select Mbappe 80" |
| 10ac414d | 2025-26 Select LaLiga Bellingham Field Level Winter Camo /30 | $81.00 cl_sales n=1 | "2025 Select Bellingham Field Level" |
| 060cf9e8 | 2025-26 Select LaLiga Pedri Fun Club Field Level White /20 | $22.50 cl_sales n=1 | "2025 Select Pedri Fun Club" |
| 50f5acce | 2025-26 Sapphire PL #7 Kroupi Gold | $341.00 workbook_import | "2025 Sapphire Kroupi 7" |
| 9646cf62 | 2025-26 Chrome UCC Bellingham Black Lazer Auto Green /99 | $208.50 cl_sales n=5 | "2025 Chrome Bellingham Black Lazer" (auto base) |
| 8a0a821d | 2025-26 Chrome UCC Mora Red Geometric Future Stars /5 | $148.75 cl_sales n=2 | "2025 Chrome Mora Future Stars" |
| cc532d81 | 2025-26 Chrome UCL Janneh Black Geometric /10 | $14.35 cl_sales n=2 | "2025 Chrome Janneh" |
| 19672cc0 | 2025-26 Finest #69 Ibragimov Gold /50 | $10.77 cl_sales n=2 | "2025 Finest Ibragimov 69" |
| 91e67b70 | 2025-26 Finest Premier Swerve Sesko Gold /50 | $28.81 cl_sales n=3 | "2025 Finest Sesko Swerve" |
| dc03c97b | 2025-26 Finest #18 Ayari Gold /50 | $10.58 cl_sales n=2 | "2025 Finest Ayari 18" |
| aeb0ae8c | 2025-26 Pristine Wharton Auto Blue /75 | $32.00 cl_sales n=4 | "2025 Pristine Wharton Auto" |
| 00f71eed | 2026 Prizm WC Musiala Pink Wave /45 | $20.00 cl_sales n=3 | "2026 Prizm Musiala" |
| 2f203437 | 2026 Prizm WC #40 Mbappe Red Choice /85 | $113.50 cl_sales n=9 | "2026 Prizm Mbappe 40" |
| 64a42d94 | 2026 Prizm WC Scorers Club Salah Gold Celestial Lattice /10 | $150.00 cl_sales n=5 | "2026 Prizm Salah Scorers Club" |
| 870f3d30 | 2026 Prizm WC Zizo Red /50 | $5.00 cl_sales n=3 | "2026 Prizm Zizo" |
| cd846182 | 2026 Prizm WC Guler Red Choice Scope 71/85 | $13.92 cl_sales n=9 | "2026 Prizm Guler" |
| 4ef3adbd | 2026 Prizm WC Guler Pink Wave 30/45 | $32.00 cl_sales n=4 | "2026 Prizm Guler" |

Skipped as not parallels (no colour, base inserts): 2022 Prizm WC Connections #1 Messi/Di Maria, Global Reach #10 Messi (x2), Scorers Club #10 Messi (x2), 2022-23 Sapphire UCC #125 Ekitike, 2023-24 Sapphire UCC #121 Godts, 2023-24 Chrome UCC Starball Debut #SD10 Messi, 2025-26 Prizm FIFA Groovy #18 Mbappe, 2026 Prizm WC Manga #8 Raphinha.

## Observations (inference)
- 5 of the 5 checked cards have Vault values 5x to 80x their base median. None of the cards checked against live Card Ladder data is inverted.
- The one likely inversion (Mainoo MB Signature Relics Gold) comes from a base that recently jumped. This is the pattern researcher-2 is meant to handle. Re-pull its base and Gold sales before acting.
- Cards whose Vault value is a single sale (n=1) or a `workbook_import` from 2026-10-16 are the most likely remaining inversions: the low-dollar Merlin/Chrome rows at $3-$15 (Ouedraogo, Castro, Guler Orange, Ekitike, Mainoo SCC). Check these first.
