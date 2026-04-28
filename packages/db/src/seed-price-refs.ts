import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getEntityId(player: string): Promise<string | null> {
  const { data } = await supabase
    .from("TrackedEntity")
    .select("id")
    .eq("player", player)
    .single();
  return data?.id ?? null;
}

// Price references derived from:
// - Current eBay listing prices in watchlist
// - Web search comparisons
// - Market knowledge from the card titles/parallels
//
// KEY: each ref must match EXACT parallel + condition
// "marketPriceUSD" = fair market value (what it typically sells for)
// Once eBay API is live, these get replaced with real sold comps

const refs = [
  // === CRISTIANO RONALDO ===
  { player: "Cristiano Ronaldo", cardDescription: "2018 Donruss Optic #9 Red Velocity /50 PSA 10", marketPriceUSD: 350, gradedPSA10: 350, gradedPSA9: 200, rawPrice: 80, source: "ebay_estimate" },
  { player: "Cristiano Ronaldo", cardDescription: "2018 Donruss Optic #158 Red Velocity /50 PSA 10", marketPriceUSD: 600, gradedPSA10: 600, gradedPSA9: 350, rawPrice: 120, source: "ebay_estimate", notes: "Portugal card, higher value than Juve #9" },
  { player: "Cristiano Ronaldo", cardDescription: "2014 Prizm World Cup Blue /199 PSA 9", marketPriceUSD: 1200, gradedPSA10: 3500, gradedPSA9: 1200, rawPrice: 400, source: "ebay_estimate" },
  { player: "Cristiano Ronaldo", cardDescription: "2024-25 Donruss Kaboom", marketPriceUSD: 600, gradedPSA10: null, gradedPSA9: null, rawPrice: 600, source: "ebay_estimate" },
  { player: "Cristiano Ronaldo", cardDescription: "2023 Topps Chrome UEFA Legendary SP", marketPriceUSD: 80, gradedPSA10: 200, gradedPSA9: 120, rawPrice: 80, source: "ebay_estimate" },
  { player: "Cristiano Ronaldo", cardDescription: "2021-22 Prizm Premier Auto Purple /10 PSA 10", marketPriceUSD: 3000, gradedPSA10: 3000, gradedPSA9: null, rawPrice: null, source: "ebay_estimate" },
  { player: "Cristiano Ronaldo", cardDescription: "Panini Impeccable Auto /99 PSA 8", marketPriceUSD: 5000, gradedPSA10: null, gradedPSA9: null, rawPrice: null, source: "ebay_estimate", notes: "PSA 8 specific" },

  // === KOBBIE MAINOO ===
  { player: "Kobbie Mainoo", cardDescription: "2022-23 Stadium Club Chrome UEFA Auto /25", marketPriceUSD: 800, gradedPSA10: 1500, gradedPSA9: null, rawPrice: 800, source: "ebay_estimate" },
  { player: "Kobbie Mainoo", cardDescription: "2022-23 Merlin Chrome UCC Blue /75 RC", marketPriceUSD: 80, gradedPSA10: 200, gradedPSA9: 120, rawPrice: 80, source: "ebay_estimate" },
  { player: "Kobbie Mainoo", cardDescription: "2024-25 Topps Chrome Auto Green Refractor /99", marketPriceUSD: 60, gradedPSA10: null, gradedPSA9: null, rawPrice: 60, source: "ebay_listing" },
  { player: "Kobbie Mainoo", cardDescription: "2024-25 Merlin Chrome Match Ball Auto /5", marketPriceUSD: 800, gradedPSA10: null, gradedPSA9: null, rawPrice: 800, source: "ebay_listing", notes: "Dual with Garnacho" },
  { player: "Kobbie Mainoo", cardDescription: "2024-25 Dynasty Dual Auto /10 Bellingham", marketPriceUSD: 3500, gradedPSA10: null, gradedPSA9: null, rawPrice: 3500, source: "ebay_listing" },
  { player: "Kobbie Mainoo", cardDescription: "Topps Museum Auto Relic /150", marketPriceUSD: 15, gradedPSA10: null, gradedPSA9: null, rawPrice: 15, source: "ebay_estimate" },

  // === MOHAMED SALAH ===
  { player: "Mohamed Salah", cardDescription: "2017 Topps Chrome UCL Gold Refractor /50", marketPriceUSD: 1500, gradedPSA10: 4000, gradedPSA9: 2000, rawPrice: 1500, source: "ebay_estimate" },
  { player: "Mohamed Salah", cardDescription: "2024-25 Topps Chrome UCC Japan Edition Hero SSP", marketPriceUSD: 25, gradedPSA10: null, gradedPSA9: null, rawPrice: 25, source: "ebay_estimate" },
  { player: "Mohamed Salah", cardDescription: "2024-25 Panini Select Stained Glass SP", marketPriceUSD: 150, gradedPSA10: 350, gradedPSA9: 200, rawPrice: 150, source: "ebay_estimate" },
  { player: "Mohamed Salah", cardDescription: "2024-25 Merlin Chrome Renaissance", marketPriceUSD: 150, gradedPSA10: null, gradedPSA9: null, rawPrice: 150, source: "ebay_estimate" },

  // === KYLIAN MBAPPE ===
  { player: "Kylian Mbappe", cardDescription: "2021-22 Chrome Sapphire Gold /99", marketPriceUSD: 50, gradedPSA10: 150, gradedPSA9: 80, rawPrice: 50, source: "ebay_estimate" },
  { player: "Kylian Mbappe", cardDescription: "2018 Donruss Optic Red Velocity /50 RC PSA 10", marketPriceUSD: 300, gradedPSA10: 300, gradedPSA9: 180, rawPrice: 60, source: "ebay_estimate" },
  { player: "Kylian Mbappe", cardDescription: "2020-21 Obsidian Electric Etch Red Flood /28 PSA 10", marketPriceUSD: 150, gradedPSA10: 150, gradedPSA9: 80, rawPrice: 40, source: "ebay_estimate" },

  // === LAMINE YAMAL ===
  { player: "Lamine Yamal", cardDescription: "2024-25 Obsidian Iridescent SSP Case Hit", marketPriceUSD: 500, gradedPSA10: 1200, gradedPSA9: null, rawPrice: 500, source: "ebay_estimate" },

  // === TOBY COLLYER ===
  { player: "Toby Collyer", cardDescription: "2024-25 Merlin UCC Magenta Refractor Auto /125", marketPriceUSD: 15, gradedPSA10: null, gradedPSA9: null, rawPrice: 15, source: "ebay_estimate" },
  { player: "Toby Collyer", cardDescription: "2024-25 Merlin UCC Pink Refractor Auto /199", marketPriceUSD: 8, gradedPSA10: null, gradedPSA9: null, rawPrice: 8, source: "ebay_estimate" },
  { player: "Toby Collyer", cardDescription: "2024-25 Chrome UEFA Toppsfractor RC /52", marketPriceUSD: 10, gradedPSA10: null, gradedPSA9: null, rawPrice: 10, source: "ebay_estimate" },

  // === OTHERS ===
  { player: "Bryan Mbeumo", cardDescription: "2026 Chrome PL Auto Black Geometric /10", marketPriceUSD: 350, gradedPSA10: null, gradedPSA9: null, rawPrice: 350, source: "ebay_estimate" },
  { player: "Bryan Mbeumo", cardDescription: "2025-26 Chrome Cold & Rainy Night Case Hit PSA 10", marketPriceUSD: 50, gradedPSA10: 50, gradedPSA9: 30, rawPrice: 15, source: "ebay_estimate" },
  { player: "Vinicius Junior", cardDescription: "2022-23 Topps Jade Yellow /50", marketPriceUSD: 5, gradedPSA10: null, gradedPSA9: null, rawPrice: 5, source: "ebay_estimate" },
  { player: "Erling Haaland", cardDescription: "2025 Merlin UCC Red Refractor /5", marketPriceUSD: 150, gradedPSA10: null, gradedPSA9: null, rawPrice: 150, source: "ebay_estimate" },
  { player: "Cole Palmer", cardDescription: "2024-25 Select Mezzanine Gold Wave /10", marketPriceUSD: 40, gradedPSA10: null, gradedPSA9: null, rawPrice: 40, source: "ebay_estimate" },
  { player: "Warren Zaire-Emery", cardDescription: "2022-23 Merlin Chrome Auto Gold Refractor /50 RC", marketPriceUSD: 70, gradedPSA10: null, gradedPSA9: null, rawPrice: 70, source: "ebay_estimate" },
  { player: "Kenan Yildiz", cardDescription: "2023 Select Serie A Gold Prizm Mezzanine /10 RC PSA 10", marketPriceUSD: 4000, gradedPSA10: 4000, gradedPSA9: 2500, rawPrice: 1500, source: "ebay_estimate" },
  { player: "Neymar Jr", cardDescription: "2018 Eminence Auto /10 Sealed", marketPriceUSD: 120, gradedPSA10: null, gradedPSA9: null, rawPrice: 120, source: "ebay_estimate" },
  { player: "Shea Lacey", cardDescription: "2025-26 Chrome PL Orange Auto RC /25", marketPriceUSD: 60, gradedPSA10: null, gradedPSA9: null, rawPrice: 60, source: "ebay_estimate" },
  { player: "Shea Lacey", cardDescription: "2025-26 Chrome PL Gold RayWave RC /50", marketPriceUSD: 100, gradedPSA10: null, gradedPSA9: null, rawPrice: 100, source: "ebay_estimate" },
  { player: "Endrick", cardDescription: "2024-25 Merlin Gold Refractor /50 RC", marketPriceUSD: 130, gradedPSA10: null, gradedPSA9: null, rawPrice: 130, source: "ebay_estimate" },
  { player: "Endrick", cardDescription: "2024-25 Merlin Gold Speckle Refractor /50 RC", marketPriceUSD: 130, gradedPSA10: null, gradedPSA9: null, rawPrice: 130, source: "ebay_estimate" },
  { player: "Archie Gray", cardDescription: "2024-25 Merlin Chrome Auto Orange Refractor /25 RC", marketPriceUSD: 50, gradedPSA10: null, gradedPSA9: null, rawPrice: 50, source: "ebay_estimate" },
  { player: "Claudio Echeverri", cardDescription: "2025-26 Chrome Bundesliga Gold Mini-Diamond /50 RC", marketPriceUSD: 10, gradedPSA10: null, gradedPSA9: null, rawPrice: 10, source: "ebay_estimate" },
  { player: "Claudio Echeverri", cardDescription: "2025-26 Chrome Bundesliga All-Etch Rookies SSP RC", marketPriceUSD: 15, gradedPSA10: null, gradedPSA9: null, rawPrice: 15, source: "ebay_estimate" },
  { player: "Matheus Cunha", cardDescription: "2025-26 Chrome Triple Platinum Case Hit PSA 9", marketPriceUSD: 60, gradedPSA10: 120, gradedPSA9: 60, rawPrice: 20, source: "ebay_estimate" },
  { player: "Matheus Cunha", cardDescription: "2025-26 Chrome Man Utd Black Wave /10 PSA 9", marketPriceUSD: 70, gradedPSA10: 150, gradedPSA9: 70, rawPrice: 25, source: "ebay_estimate" },
  { player: "Paul Scholes", cardDescription: "2025-26 PL Autographs Black /10 PSA 9", marketPriceUSD: 80, gradedPSA10: 180, gradedPSA9: 80, rawPrice: 40, source: "ebay_estimate" },
  { player: "Konstantinos Karetsas", cardDescription: "2025-26 UCC Epicenter SSP RC", marketPriceUSD: 40, gradedPSA10: null, gradedPSA9: null, rawPrice: 40, source: "ebay_estimate" },
  { player: "Chido Obi", cardDescription: "2024-25 Merlin UCC Gold Auto /50 RC", marketPriceUSD: 130, gradedPSA10: null, gradedPSA9: null, rawPrice: 130, source: "ebay_estimate" },
  { player: "Jobe Bellingham", cardDescription: "2025-26 Chrome Bundesliga All-Etch Rookies SSP RC", marketPriceUSD: 20, gradedPSA10: null, gradedPSA9: null, rawPrice: 20, source: "ebay_estimate" },
  { player: "Benjamin Sesko", cardDescription: "2025-26 Man UTD Rainbow Flick SSP Case Hit", marketPriceUSD: 35, gradedPSA10: null, gradedPSA9: null, rawPrice: 35, source: "ebay_estimate" },
  { player: "Omar Marmoush", cardDescription: "2025-26 Chrome PL RetroFractor /92", marketPriceUSD: 5, gradedPSA10: null, gradedPSA9: null, rawPrice: 5, source: "ebay_estimate" },
];

async function seedPriceRefs() {
  console.log("Seeding price references...\n");

  let count = 0;
  for (const ref of refs) {
    const entityId = await getEntityId(ref.player);
    if (!entityId) {
      console.log(`  SKIP: entity not found for ${ref.player}`);
      continue;
    }

    const { error } = await supabase.from("PriceReference").insert({
      entityId,
      cardDescription: ref.cardDescription,
      marketPriceUSD: ref.marketPriceUSD,
      source: ref.source,
      gradedPSA10: ref.gradedPSA10 ?? null,
      gradedPSA9: ref.gradedPSA9 ?? null,
      rawPrice: ref.rawPrice ?? null,
      notes: ref.notes ?? null,
    });

    if (error) {
      console.log(`  FAIL: ${ref.cardDescription} — ${error.message}`);
    } else {
      console.log(`  OK: ${ref.player} — ${ref.cardDescription} ($${ref.marketPriceUSD})`);
      count++;
    }
  }

  console.log(`\nSeeded ${count} price references.`);
}

seedPriceRefs();
