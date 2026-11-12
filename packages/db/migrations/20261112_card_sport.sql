-- Vault holds basketball cards too (Karim, Nov 12 2026). Default soccer; basketball rows set by hand.
alter table "Card" add column if not exists sport text not null default 'soccer' check (sport in ('soccer','basketball'));
