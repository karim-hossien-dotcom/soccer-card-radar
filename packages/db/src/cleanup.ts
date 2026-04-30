import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function cleanup() {
  // 1. Delete all watchlist-imported listings (fake IDs)
  const { data: watchlist } = await supabase
    .from("Listing")
    .select("id")
    .or("externalId.like.watchlist_%,externalId.like.wl2_%");

  if (watchlist && watchlist.length > 0) {
    for (const l of watchlist) {
      await supabase.from("MatchScore").delete().eq("listingId", l.id);
      await supabase.from("PriceHistory").delete().eq("listingId", l.id);
      await supabase.from("AlertSent").delete().eq("listingId", l.id);
    }
    const ids = watchlist.map((l) => l.id);
    await supabase.from("Listing").delete().in("id", ids);
    console.log(`Deleted ${watchlist.length} watchlist imports`);
  }

  // 2. Delete any remaining Leaf listings
  const { data: leaf } = await supabase
    .from("Listing")
    .select("id")
    .ilike("title", "%leaf%");

  if (leaf && leaf.length > 0) {
    for (const l of leaf) {
      await supabase.from("MatchScore").delete().eq("listingId", l.id);
    }
    const ids = leaf.map((l) => l.id);
    await supabase.from("Listing").delete().in("id", ids);
    console.log(`Deleted ${leaf.length} remaining Leaf listings`);
  }

  // 3. Count what's left
  const { count: listingCount } = await supabase
    .from("Listing")
    .select("id", { count: "exact", head: true });

  const { count: matchCount } = await supabase
    .from("MatchScore")
    .select("id", { count: "exact", head: true });

  console.log(`\nClean state: ${listingCount} real eBay listings, ${matchCount} match scores`);
}

cleanup();
