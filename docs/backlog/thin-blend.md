# Backlog: thin_blend value engine

Source: Karim approved the thin-market formula `thin_blend` on 2026-11-03 (card-comps skill, lines 15-19). The full
write-up is in the card-mcp project doc research/2026-11-02-thin-market-pricing.md. It is not in the repo because it
holds purchase prices. Ticket numbers below are synthetic. Do not put Karim's real costs or purchases in code, tests,
fixtures or screenshots (the repo is public).
Success metric: the Vault shows every thin card's value as one number with an 80% range, a confidence from 1 to 5 and
the method tag. Each number comes from packages/shared code, not from hand arithmetic.
Status: TB1 **ready for review** (branch feat/TB1-thin-blend), TB2 **approved**. Owner: engineer. Order: TB1 -> TB2.

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

**Change note (engineer, 2026-11-03): ready for review.**
- `packages/shared/src/thin-blend.ts`: `thinBlend(input)`, `thinBlendFromJson(json)`, `confidenceFromSd`, exported from
  index.ts. Pure, never throws (bad input returns `value: null` with reasons in `excluded`). value/low/high are rounded
  to cents; sd, m, var and weightShare are unrounded. Signals also report `n`, `r` and `sigmaM`.
- Coordinator scope (a), approved by Karim: 1-2 exact sales within 90 days enter the blend (tests for 1 and 2 sales).
- Coordinator scope (b): CLI `pnpm -s --filter @soccer-card-radar/shared thin-blend <input.json>` (or
  `node packages/shared/bin/thin-blend.ts <input.json>`). Input is ThinBlendInput as JSON with ISO dates; `now` defaults
  to the current time, so the job should pass it. It prints the full result as JSON. It exits 2 with `{error}` on
  usage, read or parse errors. Relative paths resolve against the caller's cwd. Use `-s` so pnpm's banner stays out of stdout.
- Choices the ticket left open: "recent" for the scarcer-parallel cap = 180 days (same window as higher-grade). A cap is
  listed in `capsApplied` only when it lowers high. Sales dated more than 1 day in the future, bad dates, and zero or
  negative `indexFactor` are excluded. The gate counts only exact sales in the target's grade state.
- Case A' recomputed independently in Python: every term matches the ticket within tolerance (V 76.743, sd 0.37624,
  uncapped range 47.383-124.294, exact share 0.2486).
- Tests: shared 60/60 (20 thin-blend + 2 CLI new), dashboard 74/74, `pnpm build` green. All figures are synthetic.

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
