# Pricing controls (Karim, Nov 12 2026: "yes do them all" on the root-cause audit docs/audits/2026-11-12-pricing-root-cause.md)

Status: approved. Order: PC1 + PC2 (packages/shared) and V3a (comp-evidence.md) in parallel, then PC3, then V3b.

## PC1 comp-guard: the rules become code (F2)
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
- Remove the `purchase` signal kind from thin_blend (input with it -> error "purchase is not a value signal"; cost is shown separately in the Vault).
- Drop any sale older than 24 months (listed in `excluded` with reason age).
- No indexFactor on a sale older than 2 weeks -> that signal's weight is halved and confidence capped at 1 (output flag `no_index`).
- Update thin-blend tests and the CLI test; keep the output shape.

## PC3 Open items tracked to closure (F8)
- Table `OpenItem` (id, job, cardId nullable, title, reason, firstSeen, lastSeen, closedAt, closedHow). Migration file only.
- Radar home "Latest runs" panel gains "Open items (N)" with age in days, oldest first; closed items drop off. Extend the existing panel, no new page.
- Jobs upsert by (job, cardId, title): new -> insert, still open -> lastSeen, resolved -> closedAt + closedHow.
- Test: age rendering and close behaviour; fixture data only.
