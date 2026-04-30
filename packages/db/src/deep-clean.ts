import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deepClean() {
  const { data } = await supabase.from("Listing").select("id, title");
  if (!data) return;

  const toDelete: { id: string; reason: string; title: string }[] = [];

  for (const l of data) {
    const t = l.title.toLowerCase();

    // 1. Check for /number — must be ≤99
    const numMatch = t.match(/\/(\d+)\b/);
    const hasSmallNum = numMatch && parseInt(numMatch[1]) <= 99;

    const isAuto = t.includes("auto") || t.includes("autograph") || t.includes("signature");
    const isGraded = t.includes("psa") || t.includes("bgs") || t.includes("sgc") || t.includes("cgc");
    const isSSP = t.includes("ssp") || t.includes("case hit") || t.includes("1/1");
    const isRelic = t.includes("relic") || t.includes("patch") || t.includes("game used") || t.includes("match worn");

    // 2. "base" in title without other value markers
    if (t.includes("base") && !isAuto && !isSSP && !isRelic) {
      toDelete.push({ id: l.id, reason: "BASE", title: l.title });
      continue;
    }

    // 3. Hobby boxes, sealed product
    if (t.includes("hobby box") || t.includes("sealed") || t.includes("blaster") || t.includes("mega box") || t.includes("fat pack") || t.includes("hanger")) {
      toDelete.push({ id: l.id, reason: "BOX", title: l.title });
      continue;
    }

    // 4. Lots
    if (t.includes(" lot ") || t.startsWith("lot ") || t.includes("lot of") || t.includes("count lot")) {
      toDelete.push({ id: l.id, reason: "LOT", title: l.title });
      continue;
    }

    // 5. Non-card items
    if (t.includes("jersey") || t.includes("shirt") || t.includes("kit ") || t.includes("figurine") || t.includes("funko") || t.includes("poster") || t.includes("magazine") || t.includes("album") || t.includes("sticker")) {
      toDelete.push({ id: l.id, reason: "NON-CARD", title: l.title });
      continue;
    }

    // 6. Leaf products
    if (t.includes("leaf")) {
      toDelete.push({ id: l.id, reason: "LEAF", title: l.title });
      continue;
    }

    // 7. No value markers at all = base/common card
    if (!hasSmallNum && !isAuto && !isGraded && !isSSP && !isRelic) {
      toDelete.push({ id: l.id, reason: "NO_VALUE", title: l.title });
      continue;
    }

    // 8. High numbered parallels (/100+) that aren't auto or graded
    if (numMatch && parseInt(numMatch[1]) > 99 && !isAuto && !isGraded && !isSSP) {
      toDelete.push({ id: l.id, reason: "HIGH_NUM", title: l.title });
      continue;
    }

    // 9. Common refractors without numbering (just "refractor" in title, no /XX)
    if (!numMatch && !isAuto && !isGraded && !isSSP && (t.includes("refractor") || t.includes("prizm"))) {
      // Check if it's a named parallel that matters
      const hasNamedParallel = t.includes("gold") || t.includes("red") || t.includes("black") || t.includes("green") || t.includes("orange") || t.includes("pink") || t.includes("aqua") || t.includes("sapphire");
      if (!hasNamedParallel) {
        toDelete.push({ id: l.id, reason: "COMMON_REFRACTOR", title: l.title });
        continue;
      }
    }
  }

  console.log(`Found ${toDelete.length} junk listings out of ${data.length}:\n`);

  const reasons: Record<string, number> = {};
  for (const d of toDelete) {
    reasons[d.reason] = (reasons[d.reason] ?? 0) + 1;
    console.log(`  [${d.reason}] ${d.title.slice(0, 75)}`);
  }

  console.log("\nBreakdown:");
  for (const [reason, count] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }

  // Delete
  for (const d of toDelete) {
    await supabase.from("MatchScore").delete().eq("listingId", d.id);
    await supabase.from("Listing").delete().eq("id", d.id);
  }

  const { count } = await supabase.from("Listing").select("id", { count: "exact", head: true });
  console.log(`\nDeleted ${toDelete.length}. Clean listings remaining: ${count}`);
}

deepClean();
