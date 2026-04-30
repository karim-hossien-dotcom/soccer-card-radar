import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function purgeBase() {
  const { data: listings } = await supabase.from("Listing").select("id, title");
  if (!listings) return;

  let purged = 0;
  for (const l of listings) {
    const t = l.title.toLowerCase();

    // Keep if: has /number ≤99, auto, SSP, case hit, PSA/BGS, 1/1
    const numMatch = t.match(/\/(\d+)\b/);
    const isNumbered = numMatch && parseInt(numMatch[1]) <= 99;
    const isAuto = t.includes("auto") || t.includes("autograph") || t.includes("signature");
    const isSSP = t.includes("ssp") || t.includes("case hit") || t.includes("1/1");
    const isGraded = t.includes("psa") || t.includes("bgs") || t.includes("sgc") || t.includes("cgc");

    if (isNumbered || isAuto || isSSP || isGraded) continue;

    // This is a base/common card — delete it
    await supabase.from("MatchScore").delete().eq("listingId", l.id);
    await supabase.from("Listing").delete().eq("id", l.id);
    purged++;
  }

  const { count } = await supabase.from("Listing").select("id", { count: "exact", head: true });
  console.log(`Purged ${purged} base/common cards. ${count} quality listings remaining.`);
}

purgeBase();
