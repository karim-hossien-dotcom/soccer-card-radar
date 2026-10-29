-- Owner-set all-in max bid per snipe target. When set it overrides the PSA9/2, PSA10/4 formula
-- (graded slabs and numbered cards bought to hold, where grading upside does not apply).
alter table "SnipeTarget" add column if not exists "maxBid" numeric(10,2);
