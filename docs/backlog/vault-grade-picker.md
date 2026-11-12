# Backlog: Vault per-card grade picker

Source: Karim's request, 2026-11-11: "if I have the At PSA filter but want to see some of the cards as PSA 10, I need a
tiny selector".
Success metric: with "Price as" on one grade, Karim can price chosen cards at another grade, and the totals and sort
use those choices. No database write, no new page and no second global control.
Status: V1 **approved** (requested by Karim 2026-11-11). Owner: engineer.

## V1: per-card grade override on Vault tiles and the drawer

**Why:** "Price as" applies one grade to every card. A mixed submission (some cards likely 10s, some 9s) can't be
priced realistically without overriding single cards.

**Scope:**
- New `apps/dashboard/src/lib/vault-scenario.ts` + `vault-scenario.test.ts` (pure, no React, no I/O):
  - Move `Scenario` and `scenarioValue` out of `collection-view.tsx` into this file. Do not leave a copy behind (DRY).
  - `effectiveScenario(global, overrides, card)`: returns the override if one is set and the card can be overridden,
    otherwise the global value.
  - `cardValue(card, scenario)`: returns `{ value: number | null, noComp: boolean }`. For an **override** to 10/9/8 when
    that grade's value is null, return `value: null, noComp: true`. Do not fall back to `valueNow`. The global path
    keeps today's fallback to `valueNow` unchanged (see PM flag 1).
  - `vaultTotals(cards, global, overrides)`: returns `{ value, cost, gain, overridden, noComp }`. `noComp` cards add
    nothing to value or gain. Their cost still counts in Cost, as it does today for cards with no value.
  - `parseOverrides(raw: string | null)` / `serializeOverrides(map)`: corrupt JSON, unknown grades or non-string keys
    give an empty or cleaned map. The parser never throws.
- `apps/dashboard/src/app/collection/collection-view.tsx`:
  - State `overrides: Record<cardId, Scenario>`. Load it from localStorage key `vault.gradeOverrides.v1` in a
    `useEffect` after mount, not during render, to avoid a repeat of the TB2 Snipe hydration bug. Writes are wrapped
    in try/catch. If localStorage is missing or throws (private mode, quota), overrides still work for the session.
  - The sort keys (value, gain, upside), `totals`, the tile value/gain and the tile `est.` tag all use each card's
    effective scenario.
  - Tile: a compact native `<select>` styled as a chip. Options are "Follow (<global>)", "Now", "10", "9" and "8". The
    chip shows the effective grade. An overridden chip is visually marked (gold, per the UI-1 tokens) so it stands
    out from cards that follow the global setting.
  - The chip shows only on `raw` and `at_grader` cards. `scenarioValue` already ignores the scenario for graded and
    sealed cards, so a chip there would do nothing.
  - **The tile is currently a `<button>`. A select inside a button is invalid HTML and taps would open the drawer.**
    Restructure the tile so the open action and the chip are siblings, for example a wrapper element with the
    existing button plus the chip. Keep the tilt, hover zoom and aria-label behaviour. A tap on the chip must never
    open the drawer.
  - Hero: when there are overrides, the value label reads e.g. "Value if PSA 9 · 3 overridden · reset". "reset"
    is a text link that clears all overrides and the storage key. When cards have no comp at their chosen grade, add
    "· N no comp". All of this goes in the existing heroKpis label. No new section.
  - Tile with no comp: the value cell reads "no comp" and the gain cell reads "—".
- Drawer (`Drawer` in the same file): the same chip next to the existing "If graded" table heading. It reads and
  writes the same `overrides` state through props. It shows only when `showScen` is true. No second picker anywhere.
- Out of scope: no DB, API, migration, `load.ts` or packages/shared change. Overrides don't change CompsPanel, the
  Tracker or the A5 snapshots.

**Acceptance criteria:**
1. Unit tests in `vault-scenario.test.ts`, all on synthetic cards:
   - No override: the card follows the global grade (Now/10/9/8).
   - Override 10 while global is 9: the card uses psa10.
   - Override on a graded or sealed card is ignored and returns valueNow.
   - Override 10 with psa10 null: `noComp: true`, and the card is excluded from value and gain but its cost counts.
   - Global 10 with psa10 null and no override: falls back to valueNow, the same as today.
   - `vaultTotals` counts `overridden` only for cards in the list passed in.
   - `parseOverrides`: null, "garbage", `{"x":"11"}` and an array each return a safe map; a valid map round-trips.
   - The tests fail if the helper is reverted.
2. With no overrides set, Vault totals, sort order and tile values are identical to main at every global setting
   (regression check against the fixture).
3. Changing one tile's chip updates that tile, the hero value, gain or loss, and the sort position without opening
   the drawer. Reloading the page keeps the override. "reset" clears all overrides, and they stay cleared after a
   reload.
4. The drawer chip and the tile chip stay in sync both ways.
5. With localStorage throwing (stubbed in UAT), the page loads without errors and overrides work until reload.
6. No hydration warning on /collection when overrides exist in storage.
7. At 390px there is no horizontal scroll, the chip's tap target is at least 32px high, and the tile's value line
   stays at 2 lines or fewer. At 1280px the chip does not cover the photo or the grade label.
8. Valid HTML: no interactive element inside the tile button (axe or a DOM check in UAT).
9. Dashboard tests green, `pnpm build` green.

**Test plan (qa):**
- Run `pnpm --filter @soccer-card-radar/dashboard test` and `pnpm build`.
- UAT on a **fully synthetic fixture** made by a script such as `test/uat/make-v1-fixture.js`. Never use
  `test/fixtures/collection.json` (it holds real costs). The fixture has:
  - 3 raw cards with full psa10/9/8 values
  - 1 raw card with psa10 null
  - 1 at_grader card
  - 1 graded card
  - 1 sealed card
- `test/uat/v1.uat.js` with Playwright on local dev (port 3100) at 1280 and 390:
  1. Set global to PSA 9.
  2. Override card A to 10 and the psa10-null card to 10. Assert the hero sum by hand, the "no comp" text and
     "1 no comp".
  3. Reload. Assert the overrides persist.
  4. Reset. Assert the totals equal the plain PSA 9 totals.
  5. Run the localStorage-throws stub.
  6. Run the hydration-warning listener.
  7. Check that no interactive element is nested inside the tile button.
- Screenshots go to `docs/backlog/uat/V1/`: tiles with overrides, the hero with the "overridden · reset · no comp"
  line, and the drawer chip, each at 1280 and 390. Check every screenshot by eye: synthetic data only.

**Risk:** Low to Medium.
- Restructuring the tile is the main regression risk. It can break tilt, hover zoom, the TB2 `--sticky-h`
  scroll-margin and the c5/TB2 UAT selectors that target `button` tiles. Re-run the TB2 UAT.
- Overrides live per browser. A phone and a laptop each keep their own overrides (accepted: viewer convenience).
- Overrides for cards later sold or removed stay in storage. They are ignored and not counted. "reset" clears them.

**Size:** M (fits in 1 day).

## PM flags (for Karim)
1. **Rule inconsistency.** Today the global "Price as" silently falls back to Value now when a card has no PSA 10/9/8
   value. V1 shows "no comp" only for per-card overrides, as asked. Should the global setting also show "no comp"
   instead of falling back? That would change the Vault's headline totals, so it is not in V1 unless you say so.
2. Graded and sealed cards get no chip, because their value is their slab or box comp. Say so if you want "what if
   this BGS 9 were a PSA 10".
3. Nothing here is blocked externally, and nothing serves "sell later" only.
