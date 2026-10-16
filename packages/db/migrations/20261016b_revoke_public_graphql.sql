-- Hide soccer-card-radar tables from the public (anon) and signed-in (authenticated) roles.
-- The app only uses the service-role key server-side. Other apps' tables in this project are untouched.
-- Applied to Supabase project SOS via MCP on 2026-10-16.
revoke all on table "TrackedEntity","Listing","PriceHistory","MatchScore","ExtractionCache","AlertSent","PriceReference","PlayerSoldStats","SoldStatsHistory","Submission","Card","CardComp","CardPop","LedgerEntry","Assumption" from anon, authenticated;
