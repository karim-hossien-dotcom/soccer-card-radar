-- PC1 comp-guard: CardComp.grade must be 'raw' or PSA/BGS/SGC/CGC + number (no 'CGC AUTH', 'Authentic', 'Altered').
-- Same pattern as GRADE_LABEL_RE in packages/shared/src/comp-guard.ts.
-- NOT VALID: existing rows are not checked (kept until F6 removes them); every new insert/update is.
-- Applied by hand by the coordinator, only with Karim's yes. Idempotent.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'CardComp_grade_check') then
    alter table "CardComp" add constraint "CardComp_grade_check"
      check ("grade" ~ '^(raw|(PSA|BGS|SGC|CGC) [0-9]{1,2}(\.[0-9])?)$') not valid;
  end if;
end $$;
