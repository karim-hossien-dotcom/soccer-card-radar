-- TB2: thin_blend estimate range (80%) and confidence (1-5) on CardComp. Applied by hand, only with Karim's yes,
-- BEFORE the TB2 branch merges (the dashboard also reads without these columns until then).
-- Idempotent: columns use "if not exists"; checks are added only when missing. All nullable: existing rows stay valid.
-- No new table: "method" already holds 'thin_blend'.
alter table "CardComp" add column if not exists "low" numeric(12, 2);
alter table "CardComp" add column if not exists "high" numeric(12, 2);
alter table "CardComp" add column if not exists "confidence" smallint;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'CardComp_confidence_check') then
    alter table "CardComp" add constraint "CardComp_confidence_check" check ("confidence" between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'CardComp_range_check') then
    alter table "CardComp" add constraint "CardComp_range_check"
      check (("low" is null or "low" <= "price") and ("high" is null or "price" <= "high"));
  end if;
end $$;
