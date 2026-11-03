# Owner decisions (append-only; newest last)

The rules themselves live in CLAUDE.md and .claude/skills/card-comps; this log records what Karim decided and when.
Supersede an entry with a new one; never delete.

| Date | Decision | Where applied |
|---|---|---|
| 2026-10-16 | Snipe max bid = min(PSA 9 / 2, PSA 10 / 4) from the workbook Grade Screen, capped at the raw price; $500 biweekly budget | packages/shared value-engine.ts, snipe-score.ts (ticket A3, C3) |
| 2026-10 | Host on Vercel (off Render); free data sources over paid feeds | DEPLOY.md, vercel.json |
| 2026-10-29 | Comps = median of the exact card's sales in the last 90 days; else latest Card Ladder value; never invent; never derive raw from graded | card-comps skill |
| 2026-10-29 | Search format Year + Set + Player + Parallel; Card Ladder labels a season by its second year | card-comps skill |
| 2026-10-30 | Base-move rule for parallels with stale sales | card-comps skill, researcher-2 |
| 2026-10-30 | Mainoo Match Ball Gold /50 valued $247.66 (ratio_to_base) | CardComp id 652 |
| 2026-10-30 | Site behind a login (user karimhossien; Karim sets the password) | middleware.ts, AUTH_PASSWORD env |
| 2026-10-30 | Vault photos show only the card; seller photos only when they show the whole card | photo-auditor, CLAUDE.md |
| 2026-10-30 | Graded cards use PSA's cert-page scan of Karim's own slab (41 certs done; 4 without a scan keep their photo) | commit 6dcbae5 |
| 2026-10-30 | PSA grading cost per card = service fee + its share of insured return shipping, from the submission form (LedgerEntry ref psa_form_<submission>) | commit 7ed265b; orders 27202721, 27202794, 26913701, 26913695 |
| 2026-10-30 | No duplicate UI: Grading scan starts from each raw card's tile (dropdown removed) | grading/grade-picker.tsx |
| 2026-10-30 | Doncic 2018 Prizm Silver PSA 9 (cert 133626224) is Karim's and stays in the Vault | - |
| 2026-10-30 | Mainoo Inception renamed to PSA's label: "...Emerging Stars Auto Kobbie Mainoo Blue 19/49" | Card 94917cb5 |
| 2026-10-30 | Agents: Claude coordinates; reviewer agent added between engineer and QA; one shared card-comps skill; auditors read a same-day snapshot file, not the database | CLAUDE.md, docs/WORKFLOW.md, .claude/ |
| 2026-10-30 | Weekly snipe-target re-check (Thu) and monthly photo audit added as report-only scheduled tasks | docs/WORKFLOW.md |
| 2026-10-30 | Max bid (C5): EV after 13% eBay + grading fee, / 2, capped at 80% of raw; owner max wins. Shipped | d73a329 |
| 2026-10-30 | Karim set no Vault values: workbook_import "Value used" rows are old prices; only owner_set / ratio_to_base are owner values | vault-comp.ts, card-comps skill |
| 2026-10-30 | Rookie radar added to the Monday player-form run (report only, Karim approves picks) | scheduled task |
| 2026-10-30 | Mane Legends auto is true Gold Refractor 32/50 (pack pull); photo from Karim's listing; value = CL value $157.08 (no 90-day sale) | Card 417b5ecd |
| 2026-10-30 | Salah 8-Bit Shots is Orange Foil 08/25 (only orange parallel); value $170 (one 90-day sale, Sep 8) | Card 73db66b4 |
| 2026-10-30 | 13 fake "cert" numbers (2502..., not PSA certs) cleared from raw cards | Card |
| 2026-10-30 | Snipe targets from the eBay watch list: 6 exact cards watched more than once added (Messi Starball SD-10 Mini Diamond, Ronaldo 2026 Prizm #367 Silver, Ronaldo 2026 National Landmarks #7, Ronaldo 2015 Select #36, Messi 2015 Select #65, Messi 2018 Prizm Hyper #1); existing targets kept (all players on the list); one-off watched cards come via the watch-list sync | SnipeTarget |
| 2026-10-30 | Mane Gold 32/50 cost = $0 (pack pull, ledger source pack_pull); Karim ended his 'Gold Lava' eBay listing himself (title error) | LedgerEntry |
| 2026-10-30 | G9 shipped: phone flash for the 4 light shots (look-only findings); wrong outline -> can't judge, no ceiling. Gixen hand-off (C3b) held on its branch | e98484a |
| 2026-10-30 | C3b Gixen hand-off shipped (copy item #/max, Open Gixen, calendar reminder) | e325620 |
| 2026-10-30 | soccerdata not adopted for the Monday run: FBref, Sofascore, WhoScored and SoFIFA block the cloud runner (403); only Understat and ESPN answer | scheduled task unchanged |
| 2026-11-02 | Snipe targets added from the young-player read: Castro Merlin Auto Gold Mojo /50 (raw $46.99), Mayulu Chrome UCC RC Auto Orange /25 ($45.37, one sale), Palmer Prizm WC Penmanship Gold Auto /10 ($310); confidence Low, no max bid until Karim sets one | SnipeTarget |
| 2026-11-02 | Approved rules are applied without asking; max bid = 80% of raw when a target has no graded comps (set for Castro $37.59, Mayulu $36.30, Palmer $248, Ronaldo 2026 #367 $28, Messi Starball $8.42) | SnipeTarget, CLAUDE.md |
| 2026-11-02 | Scheduled jobs cut from 5 to 3 (Prices Sun, Players Mon, Photos monthly), run on Karim's computer, reports saved to the card-mcp project; old comps refresh, price audit, snipe re-check, player form and photo audit tasks disabled | docs/WORKFLOW.md |
| 2026-11-02 | Completion rule: no job reports done with open items; retry by another route, then a verifier agent, then list what's still open with the reason | scheduled tasks, CLAUDE.md |
| 2026-11-03 | Jobs answer their own questions: ownership/certs from PSA + Card Ladder collections (missing slabs added), identity from PSA cert/order, costs from eBay purchases + PSA fees, no record = $0 pack pull (tagged), no-sale values = tagged estimates applied without approval; results-only dashboard on Radar home approved | CLAUDE.md, card-comps skill, scheduled tasks |
| 2026-11-03 | Shipped G9c (grade screen: holder, per-edge guard, glare mask, calibration gate, evidence crops) and J1-J3 (JobRun table applied, Latest runs on Radar home replaces the /snipe redirect, Vault ?card= deep link) | main 80831db, 8d0583f |
| 2026-11-03 | thin_blend pricing formula approved for cards with fewer than 3 exact sales in 90 days (old exact sales, grade and parallel ratios, own purchase, similar-card proxy; weighted by certainty, 180-day half-life, 80% range, confidence 1-5, caps). Costs with no eBay record stay $0. Road to Qatar certs 69127224 and 69127228 not owned (rows marked sold/not owned). Repo stays public. | card-comps skill, CLAUDE.md |
