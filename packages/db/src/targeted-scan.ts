import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const EBAY_APP_ID = process.env.EBAY_APP_ID!;
const EBAY_CERT_ID = process.env.EBAY_CERT_ID!;
let appToken: string | null = null;

async function getAppToken(): Promise<string> {
  if (appToken) return appToken;
  const creds = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "https://api.ebay.com/oauth/api_scope" }),
  });
  const data = await res.json();
  appToken = data.access_token;
  return appToken!;
}

async function search(query: string, limit = 20, maxPrice?: number) {
  const token = await getAppToken();
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "212");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("fieldgroups", "MATCHING_ITEMS,EXTENDED");
  if (maxPrice) url.searchParams.set("filter", `price:[..${maxPrice}],priceCurrency:USD`);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, "X-EBAY-C-MARKETPLACE-ID": "EBAY_US" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.itemSummaries ?? [];
}

// Simple queries — no OR operators, one concept per search
const queries = [
  // URGENT BUYS
  { q: "Santiago Castro auto Topps Merlin", label: "Castro Auto", max: 100 },
  { q: "Santiago Castro refractor /50 Merlin", label: "Castro /50", max: 100 },
  { q: "Geovany Quenda auto Topps Merlin", label: "Quenda Auto", max: 100 },
  { q: "Geovany Quenda refractor rookie", label: "Quenda RC", max: 100 },
  { q: "Lennart Karl auto Topps Chrome", label: "Karl Auto Chrome", max: 1000 },
  { q: "Lennart Karl auto Topps Deco", label: "Karl Auto Deco", max: 5000 },
  { q: "Lennart Karl rookie refractor", label: "Karl RC", max: 500 },
  { q: "Lennart Karl triple auto", label: "Karl Triple", max: 5000 },

  // HIGH PRIORITY
  { q: "Nico Paz auto refractor rookie", label: "Paz Auto", max: 800 },
  { q: "Nico Paz gold /50 chrome", label: "Paz Gold /50", max: 800 },
  { q: "Ethan Nwaneri auto Topps Chrome", label: "Nwaneri Auto", max: 300 },
  { q: "Ethan Nwaneri refractor /99 rookie", label: "Nwaneri RC /99", max: 200 },
  { q: "Kobbie Mainoo auto /50 Topps", label: "Mainoo Auto /50", max: 500 },
  { q: "Kobbie Mainoo auto /25 Topps", label: "Mainoo Auto /25", max: 800 },
  { q: "Kobbie Mainoo auto /10 Topps", label: "Mainoo Auto /10", max: 1000 },
  { q: "Eli Junior Kroupi auto rookie", label: "Kroupi Auto RC", max: 100 },
  { q: "Eli Junior Kroupi refractor /50", label: "Kroupi /50", max: 100 },

  // MEDIUM PRIORITY
  { q: "Senny Mayulu Zaire-Emery dual auto", label: "Mayulu/ZE Dual", max: 300 },
  { q: "Senny Mayulu auto refractor rookie", label: "Mayulu Auto RC", max: 100 },
  { q: "Shea Lacey auto Topps Chrome /25", label: "Lacey Auto /25", max: 300 },
  { q: "Shea Lacey auto refractor rookie", label: "Lacey Auto RC", max: 200 },
  { q: "Claudio Echeverri refractor /50 rookie", label: "Echeverri RC /50", max: 50 },
  { q: "Claudio Echeverri SSP rookie", label: "Echeverri SSP", max: 50 },

  // LEGACY GRAILS
  { q: "Cristiano Ronaldo Prizm World Cup blue /199", label: "CR7 WC Blue", max: 2000 },
  { q: "Cristiano Ronaldo auto Panini /50", label: "CR7 Auto /50", max: 5000 },
  { q: "Cristiano Ronaldo auto /10 soccer", label: "CR7 Auto /10", max: 5000 },
  { q: "Cristiano Ronaldo Kaboom Donruss", label: "CR7 Kaboom", max: 2000 },
  { q: "Lionel Messi Prizm World Cup gold /50", label: "Messi WC Gold", max: 5000 },
  { q: "Lionel Messi auto /50 soccer", label: "Messi Auto /50", max: 5000 },
  { q: "Lionel Messi Select gold wave /10", label: "Messi Gold Wave", max: 5000 },
  { q: "Erling Haaland auto refractor /50 Chrome", label: "Haaland Auto /50", max: 500 },
  { q: "Erling Haaland auto /25 sapphire", label: "Haaland Auto /25", max: 500 },

  // WORLD CUP PLAYS
  { q: "Lamine Yamal auto /50 Chrome", label: "Yamal Auto /50", max: 10000 },
  { q: "Lamine Yamal SSP case hit", label: "Yamal SSP", max: 5000 },
  { q: "Jude Bellingham auto /50 Chrome", label: "Bellingham Auto /50", max: 1000 },
  { q: "Jude Bellingham auto /25 sapphire", label: "Bellingham /25", max: 2000 },
  { q: "Kylian Mbappe Prizm World Cup rookie", label: "Mbappe WC RC", max: 500 },
  { q: "Cole Palmer auto /50 Topps Select", label: "Palmer Auto /50", max: 300 },
  { q: "Mohamed Salah gold refractor /50 Chrome", label: "Salah Gold /50", max: 1500 },
  { q: "Mohamed Salah auto /50 Topps", label: "Salah Auto /50", max: 1000 },
];

async function run() {
  console.log("Clearing old data for fresh targeted scan...\n");
  await supabase.from("MatchScore").delete().neq("id", "");
  await supabase.from("PriceHistory").delete().neq("id", "");
  await supabase.from("AlertSent").delete().neq("id", "");
  await supabase.from("Listing").delete().neq("id", "");

  console.log(`Running ${queries.length} targeted searches...\n`);

  let apiCalls = 0;
  let totalImported = 0;

  for (const q of queries) {
    const items = await search(q.q, 15, q.max);
    apiCalls++;

    let imported = 0;
    for (const item of items) {
      const title = item.title ?? "";
      const tLower = title.toLowerCase();
      if (tLower.includes("leaf")) continue;
      if (tLower.includes(" lot ") || tLower.startsWith("lot ")) continue;

      const hasNumber = tLower.match(/\/(\d+)\b/);
      const isValuable = (hasNumber && parseInt(hasNumber[1]) <= 99) ||
        tLower.includes("auto") || tLower.includes("ssp") || tLower.includes("case hit") ||
        tLower.includes("psa") || tLower.includes("bgs") || tLower.includes("1/1");
      if (!isValuable) continue;

      const priceNum = parseFloat(item.price?.value ?? "0");
      const buyOpts: string[] = item.buyingOptions ?? [];

      const { error } = await supabase.from("Listing").upsert({
        platform: "ebay",
        externalId: item.itemId,
        url: item.itemWebUrl,
        title,
        priceUSD: priceNum,
        priceNative: priceNum,
        currency: item.price?.currency ?? "USD",
        imageUrl: item.image?.imageUrl ?? null,
        sellerInfo: item.seller ? { username: item.seller.username, feedbackScore: item.seller.feedbackScore } : null,
        rawData: {
          condition: item.condition, buyingOptions: buyOpts,
          isBIN: buyOpts.includes("FIXED_PRICE"), isAuction: buyOpts.includes("AUCTION"),
          acceptsOffers: buyOpts.includes("BEST_OFFER"),
          itemEndDate: item.itemEndDate ?? null,
          shippingCost: item.shippingOptions?.[0]?.shippingCost?.value ?? null,
          searchLabel: q.label,
        },
      }, { onConflict: "platform,externalId" });

      if (!error) imported++;
    }

    const tag = imported > 0 ? `${imported} cards` : "no results";
    console.log(`  [${apiCalls}] ${q.label}: ${tag}`);
    totalImported += imported;
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\n${totalImported} listings from ${apiCalls} API calls`);

  // Score
  console.log("\nScoring...");
  const { data: allListings } = await supabase.from("Listing").select("*");
  const { data: entities } = await supabase.from("TrackedEntity").select("*").eq("active", true);
  if (!allListings || !entities) return;

  function norm(s: string) { return s.toLowerCase().replace(/\s+/g, " ").trim(); }
  let matches = 0;

  for (const listing of allListings) {
    for (const entity of entities) {
      const t = norm(listing.title);
      const p = norm(entity.player);
      const last = p.split(" ").pop() ?? "";
      if (!(t.includes(p) || (last.length >= 4 && t.includes(last)))) continue;
      if (entity.excludeTerms.some((et: string) => t.includes(norm(et)))) continue;

      let score = 0;
      const ym = listing.title.match(/\b(20\d{2})(?:-\d{2})?\b/);
      const yn = ym ? parseInt(ym[1]) : null;
      if (yn && entity.yearMin && entity.yearMax && yn >= entity.yearMin && yn <= entity.yearMax) score += 25;
      if (entity.setKeywords.some((kw: string) => t.includes(norm(kw)))) score += 25;
      if (entity.parallelTerms.some((pt: string) => t.includes(norm(pt)))) score += 20;
      if (entity.priceCeilingUSD === null || listing.priceUSD <= entity.priceCeilingUSD) score += 15;
      if (t.includes("auto")) score += 15;

      if (score > 0) {
        await supabase.from("MatchScore").upsert({
          listingId: listing.id, entityId: entity.id, score,
          reasons: { playerMatch: true, yearInRange: !!yn, setKeywordHit: entity.setKeywords.some((kw: string) => t.includes(norm(kw))), parallelTermHit: entity.parallelTerms.some((pt: string) => t.includes(norm(pt))), belowPriceCeiling: entity.priceCeilingUSD === null || listing.priceUSD <= entity.priceCeilingUSD, autographMatch: t.includes("auto"), excludeTermHit: false, isLot: false },
        }, { onConflict: "listingId,entityId" });
        matches++;
      }
    }
  }

  console.log(`\nDone: ${totalImported} targeted listings, ${matches} matches`);
}

run();
