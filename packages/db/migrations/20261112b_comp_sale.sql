-- V3a: the sales behind each CardComp (kept and rejected by the card-comps "Sale check"), shown in the Vault drawer.
-- Applied by hand only after Karim's yes. Idempotent: safe to re-run.
-- Reason codes (fixed, never free text, so no eBay username or cost can land here):
--   card (1 other card), parallel (2 other parallel), auto (3 auto/relic), grade (4 other grade/grader), lot (4 lot),
--   own (5 Karim's own sale/buy), unclear (6 unclear title/photo), age (7 older than 90 days).
create table if not exists "CompSale" (
  "id"           bigserial primary key,
  "compId"       bigint not null references "CardComp" ("id") on delete cascade,
  "date"         date not null,
  "price"        numeric(12, 2) not null check ("price" > 0),
  "title"        text not null,
  "source"       text not null check ("source" in ('ebay', 'cardladder', 'psa_apr')),
  "url"          text,
  "kept"         boolean not null,
  "rejectReason" text,
  "createdAt"    timestamptz default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'CompSale_kept_reason_check') then
    alter table "CompSale" add constraint "CompSale_kept_reason_check" check ("kept" = ("rejectReason" is null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'CompSale_reason_check') then
    alter table "CompSale" add constraint "CompSale_reason_check"
      check ("rejectReason" in ('card', 'parallel', 'auto', 'grade', 'lot', 'own', 'unclear', 'age'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'CompSale_sale_key') then
    alter table "CompSale" add constraint "CompSale_sale_key" unique ("compId", "source", "date", "price", "title");
  end if;
end $$;

create index if not exists "CompSale_compId_idx" on "CompSale" ("compId");

alter table "CompSale" enable row level security;
revoke all on "CompSale" from anon, authenticated;
revoke all on sequence "CompSale_id_seq" from anon, authenticated;
