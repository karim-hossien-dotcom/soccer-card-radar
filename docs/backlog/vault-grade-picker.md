# Backlog: Vault per-card grade picker

Source: Karim's request, 2026-11-11: "if I have the At PSA filter but want to see some of the cards as PSA 10, I need a
tiny selector". Rework, Karim 2026-11-11 (rejected the per-card grade chip): "just create like a tiny box on the corner
where we can select and check multiple as they add up".
Success metric: Karim can filter (e.g. At PSA), tick cards, switch "Price as" to PSA 10 and read what those cards add
up to. No database write, no new page and no second "Price as" control.
Status: shipped 2026-11-11 (select-and-sum checkboxes; Karim "ship").

**V1 rework change note (engineer, 2026-11-11, branch feat/V1-grade-picker):**
- Removed the per-card grade chip (tile and drawer), the override logic, "no comp", the hero "overridden · reset" label
  and the localStorage key `vault.gradeOverrides.v1`. The drawer is back to main's code.
- `apps/dashboard/src/lib/vault-scenario.ts` now holds only `Scenario`, `scenarioValue` (main's code, moved here),
  `cardGain`, `vaultTotals`, plus the new pure `selectionTotals(cards, selectedIds, scenario)`, `toggleSelection`,
  `parseSelection`, `readStoredSelection`/`writeStoredSelection` (storage passed in, never throw; empty removes the key).
  10 tests in `vault-scenario.test.ts`, written first; one compares `scenarioValue`/`vaultTotals` against main's code
  copied into the test at Now/10/9/8.
- Tile split kept (needed for the checkbox sibling): `div.tile[data-tile]` > `button.open` + `label.pick > input[type=checkbox]`.
  The checkbox sits in the top-left corner of the navy label (label text padded 38px). Tap area 36x46px, box 16px.
  Checked tiles get an accent border. UAT selectors `> [data-tile] > button` in tb2, c5 and j3 unchanged from V1.
- Summary inside the existing hero (`section[aria-label="Collection totals"]`), shown only when ≥1 card is checked:
  "N selected · Value $X · Cost $Y · Gain $Z · clear". Totals are over all checked cards, including ones hidden by the
  current filter; ids no longer in the Vault are ignored. Vault totals and sort are unchanged.
- Selection lives in React state keyed by card id, saved to sessionStorage `vault.selection.v1` (read after mount, all
  access in try/catch). No "select all shown" (skipped).
- Screenshots (synthetic only, checked by eye): `docs/backlog/uat/V1/vault-none-{1280,390}.png`,
  `vault-selected-psa10-{1280,390}.png` (Echo, Alpha, Delta checked, Price as PSA 10). Old chip screenshots removed.
- Results: dashboard tests 95/95, shared 78/78, grade-screen test_borders.py and test_api.py exit 0, `pnpm build` green.
  UAT: V1 72 ok / 0 FAIL at 1280 and 390, TB2 34 ok / 0 FAIL (screenshots to a temp dir), C5 47 ok / 0 FAIL (copy of
  the real collection, every Playwright screenshot stubbed, nothing written, copy deleted).

**Review (reviewer, 2026-11-11, rework ef755e1, diff c8a47f3..ef755e1):** no Critical or Important findings, no fix commit.
- AC1: `vault-scenario.test.ts` covers hand totals at Now/10/9/8, fallback, graded/sealed, no-cost/no-value, unknown and
  duplicate ids, select-all = Vault totals, `parseSelection` and throwing storage; `scenarioValue`/`vaultTotals` checked
  against main's code verbatim. AC2-7 covered by `v1.uat.js` (72 ok / 0 FAIL at 1280 and 390, rerun by reviewer).
- Accessibility, checked separately: the checkbox is a sibling of the open button (`collection-view.tsx:189`), labelled
  "Select <player>, <item>"; Tab goes from the open button to the checkbox, which shows a 2px accent focus ring; Space
  toggles it and Enter does not open the drawer; at 390 the tap area is 36x46 and a click in its corner toggles it.
- sessionStorage: only accessed through `storage()` / `read|writeStoredSelection`, all in try/catch; read after mount
  (no hydration warning with valid or corrupt storage, or with storage throwing).
- No selection: `vaultTotals` equals main's totals code, and the summary is not rendered. No chip/override code left
  (grep for `gradeOverride`/override/chip in the Vault: none; the "no comp yet" drawer text is main's).
- Card values: no valuation change; the UAT fixture is fully synthetic. No secrets in the diff or screenshots (all four
  V1 PNGs checked by eye: SYNTHETIC cards only). No DB, API, `load.ts` or packages/shared change; no duplicate control.
- Minor, left as is (design or harmless, not in AC):
  1. The first tick adds the summary line to the hero, which pushes the grid down about 25px (layout shift under the
     pointer). A reserved line would avoid it; that's a design choice for Karim/PM.
  2. `aria-live` sits on the conditionally rendered `<p>` (`collection-view.tsx:123`), so screen readers may skip the
     first appearance. Later updates are announced.
  3. Ids of cards that leave the Vault stay in sessionStorage until "clear" (ignored in totals; tab-scoped).
- Build/tests: `pnpm install --frozen-lockfile` ok; `pnpm build --force` 5/5; dashboard 95/95; shared 78/78;
  grade-screen test_borders.py and test_api.py exit 0.

**QA (2026-11-11):** UAT run locally on port 3100 with Chromium 1194. V1 72 ok / 0 FAIL (synthetic fixture, screenshots
to a temp dir, identical in content to the committed ones). TB2 34 ok / 0 FAIL (synthetic fixture, screenshots to a temp
dir). C5 47 ok / 0 FAIL on a temp copy of the collection fixture with every Playwright screenshot stubbed (no files
written, copy deleted). Working tree clean after the runs. Ready for prod; merging stays with Karim's "ship".

## V1 (rework): select cards and add them up

**Why:** "Price as" applies one grade to every card in view. Karim wants to pick a few cards (e.g. some At PSA cards he
expects to come back 10s) and see what just those cards add up to at a chosen grade.

**Scope:**
- `apps/dashboard/src/lib/vault-scenario.ts` (pure): `scenarioValue`, `vaultTotals` and `selectionTotals`. A selected
  card is valued exactly as its tile is at the current "Price as" (graded and sealed use value now; a raw or at-PSA card
  with no value at that grade falls back to value now). Cost counts every selected card with a cost; gain only cards
  with both value and cost (same as the Vault totals).
- `collection-view.tsx`: a checkbox in the top corner of every tile (all statuses), sibling of the open button; the
  selection summary line in the existing hero; "clear" empties the selection. Selection persists across filter, player,
  search and sort changes, and in sessionStorage for the tab session.
- Out of scope: no DB, API, migration, `load.ts` or packages/shared change; drawer, CompsPanel, Tracker unchanged.

**Acceptance criteria:**
1. Unit tests (synthetic cards): selection totals at Now/10/9/8 by hand; tile fallback for missing grade values,
   graded and sealed cards; no-cost / no-value cards; unknown and duplicate ids ignored; selecting every card equals
   the Vault totals; `parseSelection` and the storage helpers never throw. `scenarioValue`/`vaultTotals` equal main.
2. Every tile has one checkbox in its top corner; no interactive element is nested in the tile button; clicking or
   pressing Space on the checkbox never opens the drawer; the tile button still opens it.
3. At 390px the checkbox tap area is ≥32px, the box is visually small and does not cover the item text; no horizontal
   scroll at 390 or 1280.
4. With ≥1 card checked the hero shows "N selected · Value $X · Cost $Y · Gain $Z · clear"; nothing shows with none.
   Switching "Price as" updates it using the tiles' values.
5. Selection survives filter and sort changes (hidden cards still count) and a reload; "clear" empties it and the
   storage key, and it stays empty after a reload.
6. With sessionStorage throwing, the page loads without errors and selection works until reload. No hydration
   warning with a stored (valid or corrupt) selection.
7. Vault totals, sort order and tile values are identical to main at every "Price as" setting.
8. Dashboard tests green, `pnpm build` green; V1, TB2 and C5 UATs green.

**Test plan (qa):**
- `pnpm --filter @soccer-card-radar/dashboard test`, `pnpm build`.
- UAT on the synthetic fixture only: `node test/uat/make-v1-fixture.js $F`, `COLLECTION_FIXTURE=$F next dev --port 3100`,
  run `test/uat/v1.uat.js` from the repo root (SHOTS defaults to `docs/backlog/uat/V1`). Hand totals for Echo + Alpha +
  Delta: Now $165 / $160 / +$5; PSA 10 $1,225 / $160 / +$1,065 (Delta has no PSA 10 value and falls back to $25).
- Re-run TB2 and C5 UATs (C5 with screenshots off: its fixture is a copy of the real collection).

**Risk:** Low. The tile split from the first V1 pass stays (tilt, hover zoom and the TB2 sticky scroll-margin re-tested).
Selection is per browser tab (sessionStorage), by design.

**Size:** S.

## Superseded: V1 first pass (per-card grade chip), rejected by Karim 2026-11-11
Built, reviewed and QA'd on this branch (commits 33a958b, 5cffe44, 96fd6eb): a per-card "Price as" chip on raw and
at-PSA tiles and in the drawer, stored in localStorage, with "no comp" for overrides to a grade without a value. Karim
preferred checkboxes that add up; the chip, override logic and its screenshots were removed in the rework. PM flag 1
(global "Price as" falls back to value now instead of showing "no comp") still stands as an open question for Karim.
