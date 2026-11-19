-- Applied by hand 2026-11-19 (Karim: "okay go").
alter table public."Card" add column if not exists protected boolean not null default false;
comment on column public."Card".protected is 'Karim: never trade, list or bundle unless the deal is for a bigger card and he approves that deal.';
update public."Card" set protected = true where id in ('b738fdc4-0080-5b81-a7a7-8d79b9bb41db','19a84c62-fad1-54ea-9091-a64780c80441');
