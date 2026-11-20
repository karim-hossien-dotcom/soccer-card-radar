# R3: rare cards, autograph grade, outlier sales, pricing queue (builder ticket)

Approved by Karim Nov 19 2026 17:10 ET ("yes run everything"); queue approved Nov 20. Rules: card-mcp doc
rules/card-comps-rules-2026-11-19.md, sections "Autograph grade", "Rare cards", "Fake and freak sales". Base: main.
Gates: checker review -> Karim "ship". No costs, values or screenshots with values in git (public repo).

## Why
- A dual-graded auto (PSA 10 / auto 10) was valued from plain-grade and old sales; nothing knows the auto grade.
- A numbered /50 PSA 10 was valued on one old own sale; nothing flags scarcity.
- A fake low sale (e.g. $5 on a ~$250 card) would pass the sale check and drag the 90-day median down.

## 1. Card.autoGrade (DB + types)
- Migration `packages/db/migrations/<date>_card_auto_grade.sql`: `alter table "Card" add column "autoGrade" numeric(3,1) null`
  with check `"autoGrade" is null or ("autoGrade" >= 1 and "autoGrade" <= 10)`.
- Backfill in the same migration only from notes matching `auto (\d{1,2})` on cards with isAuto = true. Print what it set.
- database.types.ts: add autoGrade.

## 2. comp-guard
- GuardCard: `autoGrade?: number | null`.
- New codes: `auto_grade_mismatch`, `outlier`.
- auto grade: when card.autoGrade is set, a kept sale must show the same auto grade in the title
  ("auto 10", "AUTO 10", "10/10", "10 / 10", "dual 10") or be rejected `auto_grade_mismatch`. When card.autoGrade is null on
  an auto slab, a kept sale whose title shows an auto grade is rejected the same way (it is a different card).
- `source = cardladder_value` with card.autoGrade set -> error `auto_grade_mismatch` (CL cert value ignores auto grade).
- outlier, on kept sales after all other checks: for each kept sale s with at least 3 other kept sales,
  m = median(others); error `outlier` (sale index) if s < m/3 or s > 3m; also if s < 10 and m >= 50.
  Exported consts OUTLIER_LOW = 1/3, OUTLIER_HIGH = 3, OUTLIER_FLOOR = 10, OUTLIER_FLOOR_MEDIAN = 50.
  Override: sale field `outlierChecked: true` with a non-empty `outlierNote` (photo proves it) -> warning instead of error.
- Title words that reject any sale: reprint, rp, custom, digital, "read description" -> reason `card`.
- Title-wording exception (Karim, Nov 20): a sale flagged only on title wording (missing or glued card number, a parallel or
  grade word) is kept when `photoChecked: true` with a note; comp-guard returns a warning instead of an error.
  Fix the parsing bugs seen: "#154Cristiano" (number glued to the name) and "#59-1" not read as card numbers.
- Tests in comp-guard.test.ts: $5 among [236.5, 250, 305] -> outlier; $240 among same -> ok; 3 sales only (2 others) -> no
  outlier check; dual-10 card with "PSA 10" title -> auto_grade_mismatch; with "PSA 10 Auto 10" -> ok; cardladder_value
  on dual-10 -> error; override with note -> warning.

## 3. comp-guard must accept cardladder_value
- Today comp-guard rejects source cardladder_value (needs kept sales, method median/single), so rule 2 of the Nov 19
  rules ("else the Card Ladder value") cannot pass the gate.
- Add cardladder_value to the no-sales sources with its own checks: method "cl_value"; evidence (CL URL + read date)
  required in method or a new evidence field; grade label valid; error when card.autoGrade is set; value_jump reason still
  required over 50%. Tests for each.

## 4. Rare flag (shared)
- `packages/shared/src/rare.ts`: `isRare({ printRun, autoGrade, grade, pop }): { rare: boolean; why: string[] }`.
  Rare when printRun <= 10, or (grade 10 and autoGrade 10), or pop at grade <= 3 (pop optional, from the job).
- Tests for each reason and for none.

## 5. A "no market" marker
- Today a card-grade whose newest valid value is withdrawn falls back to older comps (estimates, sales of another card,
  values built on Karim's own buy). Deleting them destroys history, so some cards still show an old number.
- Add CardComp source `no_market` (price null allowed for this source only; method = reason; comp-guard accepts it with a
  reason). vault-comp.ts: newest comp no_market -> value null, label "No market". Jobs write it instead of leaving old rows.
- Dashboard vault_kpis counts no_market as "No value".

## 6. App
- Vault card row: small "Rare" chip when isRare; "Your value" label when the newest comp of the card's grade is owner_set;
  "No market" when it is no_market.
- Vault value (vault-comp.ts): newest comp wins; owner_set wins same-date ties and is never superseded by a newer
  cardladder_value or estimate (market median shown beside it as "market"). Test it.
- "Set value" flow (if none, a small form on the card page) writes CardComp source owner_set, sampleSize 0,
  method "Karim set <date>: <note>". Server route requires the existing owner auth.

## 7. Pricing queue (database part already live, Nov 20)
- Tables "PriceTask" and "ProposedComp", functions claim_price_tasks(run, worker, n, lease) and apply_proposed_comps(run),
  view price_queue_status: packages/db/migrations/20261120_price_queue.sql (applied Nov 20). Update database.types.ts.
- comp-guard CLI: add `--proposal <json>` that prints {guardOk, guardErrors} in the ProposedComp shape, so helpers paste the
  result straight into the row.
- The weekly prices job prompt already uses the queue (updated Nov 20).

## 8. Docs
- .claude/skills/card-comps/SKILL.md: add the rare, autograph-grade and outlier sections (copy from the rules doc), sale
  check items 8 (auto grade) and 9 (outlier), the title-wording exception, and "Writing a value" via the queue.
- docs/decisions.md: one entry for Nov 19-20 2026.

## Done when
- `pnpm -r test` and dashboard build pass; checker (fresh context) re-runs the comp-guard tests above and reviews the
  migrations; Karim says "ship".
