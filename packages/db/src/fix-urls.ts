import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixUrls() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, url")
    .like("url", "%watchlist_%");

  if (!listings || listings.length === 0) {
    console.log("No placeholder URLs to fix");
    return;
  }

  console.log(`Fixing ${listings.length} listing URLs...\n`);

  for (const listing of listings) {
    // Build an eBay search URL from the title
    // Grab the most distinctive 6-8 words from the title
    const searchTerms = listing.title
      .replace(/[#\-\/()]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 8)
      .join("+");

    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerms)}&_sacat=212`;

    await supabase
      .from("Listing")
      .update({ url: searchUrl })
      .eq("id", listing.id);

    console.log(`  ${listing.title.slice(0, 60)}`);
    console.log(`  → ${searchUrl}\n`);
  }

  console.log("Done.");
}

fixUrls();
