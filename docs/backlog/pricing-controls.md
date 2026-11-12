# Pricing controls (Karim, Nov 12 2026: "yes do them all" on the root-cause audit docs/audits/2026-11-12-pricing-root-cause.md)

Status: approved. Order: PC1 + PC2 (packages/shared) and V3a (comp-evidence.md) in parallel, then PC3, then V3b.

## PC1 comp-guard: the rules become code (F2)
Status: ready for prod (reviewed + QA green Nov 12 2026, see Review below; migration still NOT applied) (branch feat/PC1-PC2). Change note: `packages/shared/src/comp-guard.ts` + `bin/comp-guard.ts`
(script `comp-guard`, exit 0 ok / 1 errors / 2 usage); all 12 codes plus `reject_reason_missing`, `reject_reason_on_kept`
and `input`; warnings `no_url`, `own_check_empty`, `no_market_12m`. Migration `20261112c_comp_grade_check.sql` written,
NOT applied. Engineer choices for review: `no_evidence`/`n_mismatch` exempt estimate, owner_set, ratio_to_base;
own-sale date match is ±1 day (time zones) against ledger purchase and sale rows; a graded comp's kept sale must show
its grade in the title; two-digit "24/25" counts as a serial (ambiguous -> reject), "2024/25" does not; card item/set/
parallel words are allowed in titles; "Red Bull/Star/Devils" are not colour words. Tests: `src/comp-guard.test.ts`.
- New `packages/shared/src/comp-guard.ts` + CLI `pnpm -s --filter @soccer-card-radar/shared comp-guard <input.json>`.
  Input: `{ now, card: {item, year, set, number, parallel, printRun, isAuto, grader, grade, status}, proposed: {grade, price, low, high, sampleSize, source, method, confidence}, sales: [{date, price, title, source, url, seller?, kept, rejectReason?}], ledger: [{date, amount, kind}], ownSellerIds: [string] }`.
  Output `{ ok: boolean, errors: [{code, sale?, message}], warnings: [] }`, exit code 1 when not ok.
- Errors (each its own code + unit test with a fixture sale):
  - `grade_label`: proposed.grade not `raw` or `(PSA|BGS|SGC|CGC) <number>` (CGC AUTH, Authentic, Altered rejected).
  - `source_forbidden`: source workbook_import.
  - `no_evidence`: source not estimate/owner_set/ratio_to_base and zero kept sales.
  - `n_mismatch`: sampleSize != number of kept sales (non-estimates).
  - `not_median`: price != median of kept prices (±0.01) for method median.
  - `sale_age`: a kept sale older than 90 days for a non-estimate; any kept sale older than 24 months for an estimate.
  - `parallel_word`: kept sale title contains a parallel/colour word or a serial (/xx) not in the card's own parallel (word list in the module; base card = no parallel words allowed).
  - `auto_mismatch`: card not auto and title has auto/autograph/signed/signature/AU/patch/relic; card auto and title lacks an auto word.
  - `grade_mismatch`: kept sale title shows another grader or grade than proposed.grade (raw: any grader name or "PSA <n>" etc.).
  - `lot`: title has lot/bundle/x2/set of.
  - `own_sale`: seller in ownSellerIds, or same date and price (±1%) as a ledger purchase.
  - `thin`: sampleSize 1 with no low/high and confidence > 2.
- Rejected sales must carry a rejectReason; kept sales must not.
- DB: migration `20261112c_comp_grade_check.sql`: CHECK on CardComp.grade matching the same pattern (NOT VALID, so old rows are kept until F6 removes them). Migration file only; coordinator applies.
- Never prints or commits real data; fixtures are made up.

## PC2 thin_blend fixes (F4, Karim decision Nov 12: his purchases do not go into values)
Status: ready for prod (reviewed + QA green Nov 12 2026, see Review below) (branch feat/PC1-PC2). Change note: `purchase` kind removed; a purchase signal makes the whole
result empty with excluded "error: purchase is not a value signal" and the CLI exits 2 with that error. Sales older than
730 days are excluded with reason "age" (PURCHASE_MAX_DAYS replaced by MAX_SALE_DAYS). A sale older than 14 days with no
indexFactor doubles its signal's variance (halves weight), sets `signals[i].indexHalved`, adds `flags: ["no_index"]` and
sets confidence 1. Output shape kept; `flags` and `indexHalved` are additive. Test fixtures re-dated / given
indexFactor 1, expected numbers recomputed independently.
- Remove the `purchase` signal kind from thin_blend (input with it -> error "purchase is not a value signal"; cost is shown separately in the Vault).
- Drop any sale older than 24 months (listed in `excluded` with reason age).
- No indexFactor on a sale older than 2 weeks -> that signal's weight is halved and confidence capped at 1 (output flag `no_index`).
- Update thin-blend tests and the CLI test; keep the output shape.

### Review PC1 + PC2 (reviewer, Nov 12 2026; base e603b78, engineer e722f37)
Fixes: 82eba78 review(PC1), 0ef21c6 review(PC2). Each new review(PC1) test fails on e722f37 (9 of 10; the insert-name test is a regression guard).
- Important, fixed (false rejects): BGS "Black Label", SGC "Gold Label", "Black Stars", "Black Cats", "Yellow Submarine",
  "Blue Samurai" were rejected as colour words; "2024/2025" was read as serial /2025; "24/25" in the card's own season
  was read as /25 (reverses the engineer choice only for the card's own season; "#24/25" and another season's "24/25"
  still reject). comp-guard.ts `NOT_PARALLEL_PHRASES`, `serialHits`, `cardSeasons`.
- Important, fixed (false accepts): a "Gold" title passed for a Rose Gold card (card words were allowed one by one;
  now phrases are matched longest first, `parallelPhrases`); "Refractors", "Multicolor", "Multi Colour", "TieDye",
  "Prizms", Vinyl, Copper, Lime, Sepia, Negative, Ice, Laser, Logofractor, Rainbow, Foil passed on a base card; "1 of 1"
  and "numbered to 25" were not serials; "RPA" passed for an on-card auto; a patch-auto card accepted titles with no
  patch word; "PSA 9 OC" (qualifiers OC/ST/PD/OF/MK/MC) passed as PSA 9; a ledger buy dated the day before an evening
  UTC sale timestamp was missed (±1.5 days in ms, now ±1 UTC calendar day); method `single` skipped the median check.
- Added warning `parallel_unconfirmed` (parallel card, title shows neither its parallel nor its print run). Warning, not
  error: the skill allows a colourless title once the photo shows the serial, and the guard cannot see photos.
- PC2: no code findings. Numbers re-derived by hand (case A ln V 4.2253, case B' 74.45 / 37.12-149.32). The design
  write-up research/2026-11-02-thin-market-pricing.md is a card-mcp project doc, not in the repo (it holds purchase
  prices); reviewer has no project-write tool, so the coordinator must add the Nov 12 note there. The shipped
  thin-blend.md ticket now says the purchase signal is superseded.
- Left for Karim / PM (rules, not bugs): see "Strictness trade-offs" below.
- Card-comps: no raw value from graded prices or the reverse; no invented numbers; owner_set / ratio_to_base exempt. No
  secrets, real cards, costs or seller ids in the diff (fixtures are made up). No bids, scans, env or DB changes;
  migration 20261112c not applied.
- Build/test: `pnpm install --frozen-lockfile` ok; `pnpm build` 5/5 ok; shared 113/113; dashboard 103/103;
  grade-screen test_borders ok, test_api 17 ok + 1 old skip.

Strictness trade-offs (open, need a rule):
1. Parallel sale titled with no colour and no serial: kept with warning `parallel_unconfirmed`. Making it an error means
   no false accepts from base sales, but rejects real sales whose photo shows the serial.
2. Estimates: kept sales get the full sale check against the target card, so grade_ratio / parallel_ratio / proxy
   inputs (other grade, other parallel) fail it. Jobs must pass only exact-card sales as kept for an estimate; ratio and
   proxy inputs need their own field or a separate guard run.
3. Raw titles that say "PSA 10 ready" / "PSA candidate" are rejected as graded. "Facsimile signature", "no auto" are
   rejected as autos. Safe direction, may cost thin cards their few sales.
4. A player name with a colour word (e.g. a player surnamed White) allows that colour for his cards; a White parallel
   then passes unless the title shows a serial.
5. No card-identity check (year / set / number): "#103" passes for "#4". Rule 1 of the sale check is not in code.
6. BGS 10 and BGS 10 Black Label are one label "BGS 10"; both count as the same grade.
7. Method `mean` is not checked against anything; only median/single are. The skill says value = median.
8. Verifier rule "value moved >50% from the last comp without a reason" is not in comp-guard (not in PC1 scope).
9. 90-day edge uses fractional days (same as thin_blend): a date-only sale exactly 90 calendar days old fails if `now`
   has a time after midnight.

## PC3 Open items tracked to closure (F8)
- Table `OpenItem` (id, job, cardId nullable, title, reason, firstSeen, lastSeen, closedAt, closedHow). Migration file only.
- Radar home "Latest runs" panel gains "Open items (N)" with age in days, oldest first; closed items drop off. Extend the existing panel, no new page.
- Jobs upsert by (job, cardId, title): new -> insert, still open -> lastSeen, resolved -> closedAt + closedHow.
- Test: age rendering and close behaviour; fixture data only.

## PC1b comp-guard identity + estimate inputs (follow-up from PC1 review, coordinator defaults Nov 12 2026)
Status: ready for review (branch feat/PC1-PC2, Nov 12 2026). Change note: `packages/shared/src/comp-guard.ts`.
- Per-sale identity error is code `card` (not `identity`: coordinator, Nov 12, so it fits V3a's CompSale.rejectReason
  CHECK). Number: digit groups match with or without hyphen / space / # and leading zeros ("R-1", "R1", "#R1", "#07");
  grades ("PSA 10"), serials ("07/10", "#/10", "1 of 1") and seasons are blanked first so "PSA 10" is not card #10.
  Any "#nnn" with a digit that is not the card number rejects. Season: card "2024-25" accepts 2024-25, 2024/25,
  2024/2025, 24-25 (hyphen; "24/25" stays with the serial rule), 2024, 2025; card "2019" accepts 2019, 2018-19,
  2019-20; years in the card's own item/set name are allowed; no card year = no season check.
- `signals: [{kind, ratio?, grade?, sales}]` (only for estimate / owner_set / ratio_to_base, else `input`): signal
  sales get reject bookkeeping, auto_mismatch, grade_label (signal.grade pattern; Authentic/Altered/qualifier title),
  lot, own_sale and a 24-month sale_age; not parallel, number or season. Issues carry `signal` + `sale` indexes.
  `kind: "purchase"` -> input error "purchase is not a value signal"; ratio must be > 0.
- `value_jump`: input `previous: {grade, price}` (same grade only) and `reason`; |move| > 50% with a blank reason errors.
- `method_forbidden`: mean / average / avg anywhere; market sources must be median or single (estimates name their
  rule, owner_set any).
- Engineer choices for review: season match on a single-year card accepts the adjacent season pairs (Topps soccer
  "2019" is often titled "2018-19"), a bare other year rejects; fixtures in 3 review(PC1) tests got their card number
  set (they changed the item to #BG7 / #A7 / #AP7 but kept number 7, which `card` now catches).
- Tests: `src/comp-guard.test.ts` "PC1b ..." (9 tests). shared 122/122, dashboard 103/103, `pnpm build` 5/5.
- `identity`: when Card.cardNumber is set, a kept sale title must contain that number (with or without hyphen/#, e.g. "R-1", "R1", "#4"); a different "#nnn" rejects. When the card's season is known, a title showing another season/year rejects.
- Estimates: comp-guard input gets `signals: [{kind, ratio, sales}]` separate from `sales`; only exact-card sales go in `sales`; ratio/proxy sales are checked for auto status, grade label, lots and own-sale, not for the target's parallel/number.
- `value_jump`: a value more than 50% away from the previous comp for the same card and grade needs `reason` in the input, else error.
- Coordinator defaults on the other review trade-offs: a parallel sale with neither the parallel word nor serial in the title stays a warning (verifier checks the photo); "PSA 10 ready" / "facsimile" rejects stay; BGS Black Label shares "BGS 10"; method `mean` is not allowed (median, single, estimate, owner only).
