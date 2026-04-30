import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function excludeLeaf() {
  // 1. Add "leaf" to excludeTerms for all entities
  const { data: entities } = await supabase.from("TrackedEntity").select("id, player, excludeTerms");
  let updated = 0;
  for (const e of entities ?? []) {
    if (!e.excludeTerms.includes("leaf")) {
      await supabase
        .from("TrackedEntity")
        .update({ excludeTerms: [...e.excludeTerms, "leaf"] })
        .eq("id", e.id);
      updated++;
    }
  }
  console.log(`Added "leaf" to excludeTerms for ${updated} entities`);

  // 2. Find and delete all Leaf listings + their scores
  const { data: leafListings } = await supabase
    .from("Listing")
    .select("id, title")
    .ilike("title", "%leaf%");

  if (leafListings && leafListings.length > 0) {
    console.log(`\nFound ${leafListings.length} Leaf listings to remove:`);
    for (const l of leafListings) {
      console.log(`  ${l.title.slice(0, 70)}`);
      await supabase.from("MatchScore").delete().eq("listingId", l.id);
      await supabase.from("Listing").delete().eq("id", l.id);
    }
    console.log(`\nDeleted ${leafListings.length} Leaf listings + match scores`);
  } else {
    console.log("No Leaf listings found");
  }
}

excludeLeaf();
