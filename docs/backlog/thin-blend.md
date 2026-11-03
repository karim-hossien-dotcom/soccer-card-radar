# Backlog: thin_blend value engine

Source: Karim approved the thin-market formula `thin_blend` on 2026-11-03 (card-comps skill, lines 15-19). The full
write-up is in the card-mcp project doc research/2026-11-02-thin-market-pricing.md. It is not in the repo because it
holds purchase prices. Ticket numbers below are synthetic. Do not put Karim's real costs or purchases in code, tests,
fixtures or screenshots (the repo is public).
Success metric: the Vault shows every thin card's value as one number with an 80% range, a confidence from 1 to 5 and
the method tag. Each number comes from packages/shared code, not from hand arithmetic.
Status: TB1 **approved**; TB2 **ready for review** (2026-11-03 fixes: 390px tile offset, Snipe hydration; branch feat/TB2-vault-range; apply migration 20261103b before merging). Owner: engineer. Order: TB1 -> TB2.

**Until TB1 ships, the weekly Prices job (Sun 7:43pm) applies thin_blend by hand** and shows every term in
audits/<date>-prices.md. It writes CardComp rows with source `estimate` and method `thin_blend`. Range and confidence
stay in the report until TB2's migration is applied.

## TB1: thin_blend engine in packages/shared

**Why:** right now one stale sale sets a thin card's value. The approved formula combines every dated signal by
precision and gives a range and a confidence. It has to be code so the weekly job stops doing log arithmetic by hand.

**Scope:**
- New `packages/shared/src/thin-blend.ts` and `thin-blend.test.ts`. Export it from `packages/shared/src/index.ts`.
  Pure functions, no I/O.
- Takes `now` as a parameter, so tests are deterministic.
- Does not touch value-engine.ts, snipe-score.ts or the DB. No caller is wired up in this ticket.

**Inputs:**
- `target`: `{ gradeState: "raw" | "graded", grade }`.
- `sales`: a list of `{ price, date, indexFactor? }` grouped into signals. Each signal is
  `{ kind: "exact" | "grade_ratio" | "parallel_ratio" | "base_move" | "purchase" | "proxy", gradeState, sales, ratios? }`.
  - For grade_ratio, parallel_ratio and base_move, `ratios` is the list of pair ratios.
- Optional caps:
  - `higherGradeSales`: same card, higher grade, with dates.
  - `scarcerParallelSales`.
  - `lowestBin`.

**Math (from the research, section 4):**
- Per-sale value: v = price × indexFactor × r. indexFactor defaults to 1, and `indexAssumed: true` is set when it is
  missing.
- Per-sale variance: var_j = 0.0625 × (1 + age_days / 180), with σ0 = 0.25 and H = 180.
- Per-signal mean: m_s = Σ(ln v / var) / Σ(1/var).
- Per-signal variance: var_s = 1/Σ(1/var) + σ_m².
- Method noise σ_m:
  - exact: 0
  - grade_ratio, parallel_ratio, base_move: 1.4826 × MAD of ln(ratios) around their median
  - purchase: 0.20
  - proxy: 0.50
- Ratio r: the median of `ratios`, or 1 for exact, purchase and proxy.
- Combined: ln V = Σ P_s m_s / Σ P_s, with P_s = 1/var_s and sd = 1/√ΣP_s.
- 80% range: V × exp(±1.2816 × sd).
- Confidence from sd:
  - sd ≤ 0.15: 5
  - sd ≤ 0.25: 4
  - sd ≤ 0.40: 3
  - sd ≤ 0.60: 2
  - otherwise: 1

**Rules:**
- **Gate:** if the exact signal has 3 or more sales within 90 days, return `{ applies: false }`. The existing 90-day
  median rule stands.
- **Never convert between raw and graded:** any signal whose `gradeState` differs from the target's is dropped and
  listed in `excluded` with the reason "grade state".
- A ratio signal with fewer than 3 ratios is dropped with a reason. Purchase sales older than 730 days are dropped.
- A proxy is used only when there is no exact, grade_ratio, parallel_ratio or base_move signal.
  - **Proxy approval flag: out of scope.** The caller decides whether to pass a proxy.
- **Confidence caps:**
  - Confidence is at most 2 when no exact sale is within 365 days.
  - Confidence is at most 2 when the only inputs are purchase and/or proxy.
- **Hard caps, applied after combining:**
  - V and high ≤ the lowest higher-grade sale within 180 days.
  - V and high ≤ the lowest recent sale of the next-scarcer parallel.
  - V and high ≤ `lowestBin` when it is given.
  - low is then set to min(low, V).
- **Conflict flag:** set it when any two signals differ by more than 2 × √(var_a + var_b) in log terms.

**Output:**
`{ applies: true, value, low, high, sd, confidence, confidenceUncapped, capsApplied[], conflict, indexAssumed, signals[] (kind, m, var, weightShare), excluded[], method: "thin_blend" }`

**Acceptance criteria.** The figures are hand-computed, so tests use tolerance: ±0.002 on logs and variances, ±$0.10
on dollars.

1. **Case A' (structure of research case A, synthetic numbers).**
   - Setup:
     - Target PSA 8.
     - Exact: one PSA 8 sale of $40, 1460 days old.
     - grade_ratio: PSA 9 sales of $150 (30 days old), $120 (90 days) and $180 (150 days). Ratios are
       [0.40, 0.55, 0.65, 0.85, 1.10].
     - higherGradeSales are the same three PSA 9 sales.
   - Exact signal: m1 = 3.6889 (ln 40), var1 = 0.5694.
   - PSA 9 level:
     - Per-sale precisions are 13.714, 10.667 and 8.727. Their sum is 33.108, so the level variance is 0.0302.
     - The weighted ln is 4.9868 ($146.47).
   - Ratio: median 0.65 (ln -0.4308), MAD 0.2683, σ_m = 0.3977, σ_m² = 0.1582.
   - Signal 2: m2 = 4.5560 ($95.20), var2 = 0.1884.
   - Combined: ΣP = 7.0642, ln V = 4.3405, **V = $76.74**, sd = 0.3762.
   - Range:
     - Uncapped range is $47.38 to $124.29.
     - The higher-grade cap ($120) binds, giving **$47.38 to $120.00**. `capsApplied` includes "higher_grade".
   - Confidence: confidenceUncapped = 3, confidence = **2** (365-day rule).
   - Conflict: none (0.867 against 1.741). The exact signal's weightShare is 0.249.
2. **Case B' (structure of research case B, synthetic).**
   - Setup:
     - Target raw.
     - purchase: $100, 200 days old.
     - proxy: $70 (60 days old) and $80 (100 days).
   - Purchase signal: var = 0.1719 (0.1319 + 0.04), P = 5.816, m = 4.6052.
   - Proxy signal:
     - Precisions are 12.000 and 10.286, and m = 4.3101.
     - var = 0.0449 + 0.25 = 0.2949, P = 3.391.
   - Combined: ln V = 4.4965, **V = $89.70**, sd = 0.3296.
   - Range: **$58.80 to $136.85**.
   - Confidence: confidenceUncapped = 3, confidence = **2**.
3. **Case B' with lowestBin = 85:** value = 85.00, high = 85.00, low = 58.80, and `capsApplied` includes "bin".
4. **Conflict:**
   - Target raw, exact $40 at 0 days, purchase $200 at 0 days.
   - The difference is 1.609, against 2 × √(0.0625 + 0.1025) = 0.812, so `conflict` is true.
5. **Gate:** 3 exact sales within 90 days gives `{ applies: false }`. 2 exact sales within 90 days enter the blend.
6. **Raw and graded stay separate:** a raw purchase passed for a PSA 8 target is in `excluded` with "grade state".
   It does not change V.
7. **Parallel cap:** a scarcer-parallel sale below V caps V and high. `capsApplied` includes "scarcer_parallel".
8. **Confidence thresholds:** a boundary test for each sd threshold (0.15, 0.25, 0.40, 0.60).
9. **Bad input:** no usable signals returns `{ applies: true, value: null, ... }` with reasons. Zero or negative prices
   are excluded. The engine never throws.
10. **Build and tests:** `pnpm --filter @soccer-card-radar/shared test` is green, including the existing tests.
    `pnpm build` is green.

**Test plan (qa):**
- Run the shared tests.
- Recompute case A' independently, in a spreadsheet or a Python one-off in the scratchpad, and compare every term.
- Grep the diff for dollar figures and confirm none matches a ledger cost in today's `.snapshots/` export, if one exists.

**Risk: Medium.**
- σ0, H and σ_m are uncalibrated benchmarks (research gap 6). Confidence 4-5 is unproven.
- Hand-computed expected values may be off in the 4th decimal. If code and ticket disagree beyond tolerance, the
  engineer shows the term-by-term recomputation and does not loosen the tolerance.

**Size:** M.

## TB2: range, confidence and method in the Vault's existing value cell

**Why:** an estimate shown as one bare number looks like a sale. Karim needs to see that a value is an estimate and how
wide it is, without a new column or page.

**Scope:**
- **Migration:** new file `packages/db/migrations/20261103b_card_comp_range.sql`. It is applied by hand after ship, and
  only with Karim's yes.
  - `alter table "CardComp" add column if not exists "low" numeric(12,2)`
  - Same for `"high" numeric(12,2)` and `"confidence" smallint`.
  - Check: `confidence between 1 and 5`.
  - Check: `low <= price and price <= high` when both are not null.
  - All three columns are nullable, so existing rows stay valid.
  - No new table. `method` already holds `thin_blend`.
- `packages/db/src/database.types.ts`: add the three columns.
- `apps/dashboard/src/app/collection/load.ts`:
  - The CardComp select adds `low, high, confidence`.
  - `CompRow` gains optional `low`, `high` and `confidence`.
  - `CollectionCard` gains `valueEst: { low, high, confidence, method } | null`. It is set when `nowComp.source` is
    `estimate`.
  - Fixture rows without the fields read as null.
- `apps/dashboard/src/app/collection/collection-view.tsx`:
  - Grid tile: in the existing `s.val` span, with scenario "now", estimate rows show the value followed by
    `<small> est. 2/5</small>`. This reuses the existing `est.` small tag.
  - Drawer: the existing "Value now" row reads `$76.74 · $47–$120 · thin_blend · 2/5`.
  - Estimate rows without range or confidence (older rows the job applied by hand) show `est. · <method>` only.
- No new column, CSS module, page or control.

**Acceptance criteria:**
- The migration is idempotent and the checks reject `confidence = 6` and `low > price`. Existing rows stay valid, and
  nothing is applied to Supabase by the engineer.
- Unit test in `apps/dashboard/src/lib`, or an extension of the load test:
  - an estimate comp with range gives `valueEst` filled in
  - a sale comp gives `valueEst = null`
  - an estimate comp without range gives a method only
- On the tile:
  - non-estimate cards render exactly as before
  - for scenario PSA 9/10, the existing band-multiple `est.` is unchanged
- 390px has no horizontal scroll and the value cell does not wrap past 2 lines.
- `pnpm build` is green and the dashboard tests are green.

**Test plan (qa):**
- UAT on a **fully synthetic fixture**, generated by a script such as `test/uat/make-tb2-fixture.js`. Do not use
  `test/fixtures/collection.json`, which holds live costs.
- The fixture has one thin_blend card with a range (case A' numbers), one hand-applied estimate without a range, and one
  normal sale-comp card.
- Screenshots of the tile and drawer at 1280 and 390 go to `docs/backlog/uat/TB2/`.
- Run the migration on a throwaway Postgres, not zsubyufjenapkgkwpqzv. Check the two bad inserts fail and the existing
  row shape passes.

**Risk: Medium.**
- **Order matters:** apply the migration (Karim's yes) **before** merging. Otherwise the select of missing columns
  fails and the whole Vault shows a load error.
- Drawer screenshots must contain only synthetic numbers.

**Size:** M.

**Change note (engineer, 2026-11-03): ready for review.**
- Migration `packages/db/migrations/20261103b_card_comp_range.sql` written, **not applied** to Supabase. Checked on a
  throwaway local Postgres 16: applies twice cleanly; `confidence = 6`, `low > price` and `price > high` are rejected;
  an existing row and a legacy-shape insert pass. Constraint names: `CardComp_confidence_check`, `CardComp_range_check`.
- Tolerant read: `load.ts` selects the new columns and, on a Postgres 42703 (missing column), re-selects without them,
  so the Vault keeps loading if the branch merges before the migration. Applying the migration first is still the plan.
- Logic in new `apps/dashboard/src/lib/value-est.ts` (`valueEst`, `toCompRow`, `estTileTag`, `estDrawerText`,
  `isMissingColumn`) with `value-est.test.ts`. `VaultComp` gains optional `low/high/confidence`; `CollectionCard` gains
  `valueEst`. `database.types.ts` updated.
- View: tile `s.val` adds `<small> est. 2/5</small>` (or ` est.`) on scenario Now only; PSA 9/10/8 band `est.` unchanged.
  Drawer "Value now" reads `$76.74 · $47–$120 · thin_blend · 2/5`, or `$55.00 · est. · thin_blend` without range.
  A partial row (range without confidence or the reverse) shows only the parts that exist. No new column/CSS/page/control.
- UAT: `test/uat/make-tb2-fixture.js` (fully synthetic, does not read collection.json) + `test/uat/tb2.uat.js`;
  32/32 checks pass at 1280 and 390 (no horizontal scroll, value cell 1 line). Screenshots in `docs/backlog/uat/TB2/`.
- `pnpm build` green; dashboard tests 82/82, shared 38/38, grade-screen python tests green.
- Not checked: the exact error shape the live PostgREST returns for a missing column (handled by code 42703 or the
  "column ... does not exist" message).

### TB2 Review (2026-11-03, reviewer) -> ready for QA
Diff reviewed: 106901e..70882b5 (engineer commit 70882b5). No fix commit: nothing Critical or Important found.
- Acceptance: all met.
  - Migration: I applied it to a throwaway local Postgres 16 (on the 20261016 schema, with an existing legacy row).
    It applies twice cleanly (the second run only logs "already exists, skipping"). `confidence = 6` and `0` are
    rejected by `CardComp_confidence_check`. `low > price` and `price > high` are rejected by `CardComp_range_check`.
    The existing row and a full thin_blend insert (76.74 / 47.38 / 120 / 2) pass. Nothing was applied to Supabase.
  - RLS: CardComp has RLS on with no policies and a revoke from anon/authenticated (20261016_collection_schema.sql:92,
    20261016b_revoke_public_graphql.sql:4). There are no column grants, so the new columns inherit that. Consistent.
  - Unit tests: value-est.test.ts covers an estimate with a range, a sale comp giving null, and an estimate without a
    range giving the method only. It also covers missing fields read as null and the missing-column detector. These
    tests fail without value-est.ts.
  - Non-estimate cards render unchanged:
    - Tile: `valueEst` is null unless `nowComp.source === "estimate"` (value-est.ts:26-27). The tile then renders
      `null` where it used to render `false` (collection-view.tsx:166).
    - Drawer: `estDrawerText(v, null)` gives the same `usd(v, 2)` string as before (value-est.ts:35-37).
    - Runtime check against test/fixtures/collection.json (it has no estimate comps; no screenshots taken, no values
      printed): 169 tiles, 0 `<small>` tags in the "Now" scenario, 0 page errors.
  - PSA 9/10 band `est.` is unchanged: `est` is still evaluated first (collection-view.tsx:146, 166).
  - Value cell at 390px: 1 line, no horizontal scroll (UAT).
- Tolerant fallback (load.ts:90-94) is safe and narrow:
  - It retries once, with the legacy columns, only on 42703 or "column ... does not exist" (value-est.ts:11-12).
  - Every other error is returned unchanged and thrown at load.ts:80. The test covers a 42501 not being matched.
  - If the legacy select also fails, that error is thrown too. Nothing is swallowed.
- Card values: display only. Range and confidence are read from stored CardComp rows, never computed or filled in.
  A missing part is omitted rather than invented (value-est.ts:35-41). No raw/graded conversion was added. Owner
  overrides (vault-comp.ts OWNER_SOURCES) are untouched.
- No secrets in the diff (grep). The fixture and the 8 screenshots are fully synthetic ("SYNTHETIC ... TEST ..."
  items, made-up costs). make-tb2-fixture.js does not read collection.json.
- No duplicate UI: the diff extends the existing `s.val` `<small>` and the drawer "Value now" row. There is no new
  CSS, page or control.
- No comments inserted mid-line or mid-type. The comment in vault-comp.ts sits on its own line in the type body. There
  is no pixel or fuzzy-matching logic. There are no bids, scans, env or DB writes.
- Minor (left): the migration's `pg_constraint` lookup filters on `conname` only, not `conrelid`
  (20261103b_card_comp_range.sql:11, 14). This is harmless because the names are table-prefixed.
- Minor (left): the range check tests each bound on its own (`low <= price` when low is set, `price <= high` when high
  is set). The ticket asks for "when both are not null". The check is slightly stricter and matches the intent.
- Minor (left): no test asserts the `valueEst` wiring in buildCollection (load.ts:169). The UAT covers it end to end.
- Minor (left): tiles-390.png crops the top tiles' labels under the sticky filter bar. This comes from the
  element-screenshot method; the layout is unchanged.
- Minor (left, out of scope): the live PostgREST error shape for a missing column is unverified. This is moot if the
  migration is applied first, which is the plan.
- Build/tests:
  - `pnpm install --frozen-lockfile`: up to date.
  - `pnpm build --force`: 5/5.
  - Dashboard tests: 82/82. Shared tests: 38/38.
  - grade-screen `test_borders.py` and `test_api.py`: pass, with the known skip of the stale clutter test.
  - TB2 UAT (`test/uat/tb2.uat.js`, synthetic fixture, Chromium 1194): 32/32.

### TB2 QA (2026-11-03, qa) -> ready for prod
Branch feat/TB2-vault-range at 5beb481 plus this QA commit. Not merged: waiting for Karim's "ship".
- UAT: ran `make-tb2-fixture.js` and `tb2.uat.js` on local dev (port 3100), 1280 and 390px: 32/32, no page errors.
  - The thin_blend tile reads "$77 est. 2/5". The hand-applied estimate reads "$55 est.". The sale-comp tiles ($150,
    $40) are unchanged.
  - In the PSA 9 scenario, the raw band estimate is "$60 est." and there is no confidence tag.
  - Drawer "Value now" rows:
    - thin_blend: "$76.74 · $47–$120 · thin_blend · 2/5"
    - hand-applied: "$55.00 · est. · thin_blend"
    - sale comp: "$150.00"
- Screenshots: docs/backlog/uat/TB2/ (tiles, drawer-range, drawer-no-range and drawer-sale, each at 1280 and 390).
  - I regenerated all 8 from the synthetic fixture and each one is byte-identical to the committed file.
  - I inspected them by eye: they show only synthetic cards, costs and values.
- Migration: checked on a throwaway Postgres (see Review). The two bad inserts fail and the legacy row shape passes.
- Regression: the Vault on test/fixtures/collection.json has no estimate tags and no page errors (no screenshots).
- **For prod: apply packages/db/migrations/20261103b_card_comp_range.sql to Supabase (Karim's yes) BEFORE merging.**
  The fallback keeps the Vault loading if the order slips, but the range and confidence only show once the columns
  exist.

### TB2 fixes (2026-11-03, engineer) -> ready for review
Karim approved both fixes on 2026-11-03 ("fix it all and ship"). There is one commit for each.
- a2d5aca: at 390px the first row of Vault tiles sat under the sticky filter bar, which wraps to about 196px on a phone.
  The grid's `scroll-margin-top` now follows the bar's stuck height (`--sticky-h`, measured with a ResizeObserver).
  - The TB2 UAT has a new check: after scrolling to the grid, the first tile is 12px below the bar at both 1280 and
    390. It failed at 390 (-208px) before the fix.
  - The UAT now takes the tiles screenshot from the top of the page. Only tiles-1280/390 changed; the drawer shots are
    byte-identical. All were regenerated from the synthetic fixture.
- 1be2132: Snipe hydration error. `endsIn`/`agoShort` moved to `src/lib/countdown.ts` and now take an explicit `now`.
  - The page passes the server's `renderedAt`. SnipeView uses it for the first render, then switches to the browser
    clock after mount and refreshes every 30s.
  - New unit tests for the helpers.
  - c5 UAT changes:
    - It now loads /snipe with the browser clock 90s ahead and fails on any hydration warning. This failed before the
      fix.
    - It also opens a row and checks the auction countdown in the detail panel, which the old UAT never rendered.
- Results: dashboard 85/85, shared 38/38, grade-screen tests green (1 existing skip), `pnpm build` green, TB2 UAT 34/34,
  c5 UAT 47/47 (1280 and 390).
- The migration note above still applies: apply 20261103b before merging.

## Out of scope (now)
- Accepted Best Offer ingestion. It needs eBay Marketplace Insights approval, and 130point scraping is not allowed.
- Scraping dated CL index points. Card Ladder's terms for automation are unchecked.
- A proxy approval flag.
- Calibrating σ0, H and σ_m (research gap 6).
- Wiring the weekly job to call the engine. See the PM flag below.

## PM flags
- TB1 is a library with no caller. The weekly job keeps doing the math by hand until something runs the engine. One
  option is a small CLI that reads a JSON of signals and prints the result, so the job can call it. That would be a
  third ticket (S) and needs Karim's call.
- The gate lets 1-2 exact sales within 90 days enter the blend instead of taking the plain median. That is a rule
  change listed separately in research section 8. These tickets assume it is part of the 2026-11-03 approval. Confirm
  this.
