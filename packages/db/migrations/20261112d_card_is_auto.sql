-- Card identity: auto flag for the comp guard (F3, Karim Nov 12 2026). Null = not yet filled.
alter table "Card" add column if not exists "isAuto" boolean;
