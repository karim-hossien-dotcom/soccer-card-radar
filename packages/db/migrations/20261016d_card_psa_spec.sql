-- A4: cache PSA spec id per graded cert so weekly pop refreshes cost 1 call instead of 2.
-- Additive, nullable. Applied to Supabase project SOS via MCP.
alter table "Card" add column if not exists "psaSpecId" integer;
