import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Derived from Karim's actual eBay watchlist (2026-04-28, 59 items)
// Players sorted by watchlist frequency, with observed price ranges and sets
const entities = [
  // === TIER 1: High-value grails (6+ watchlist items) ===
  {
    player: "Cristiano Ronaldo",
    yearMin: 2014,
    yearMax: 2024,
    setKeywords: ["Panini Prizm", "Donruss Optic", "Panini Impeccable", "Topps Chrome", "Kaboom"],
    parallelTerms: ["auto", "red velocity", "blue prizm", "gold", "/10", "/50", "/99", "/5", "kaboom", "legendary"],
    excludeTerms: ["reprint", "lot", "custom", "digital", "reproduction", "sticker album"],
    priceCeilingUSD: 5000,
    alertThreshold: 65,
    smsThreshold: 85,
  },
  {
    player: "Kobbie Mainoo",
    yearMin: 2022,
    yearMax: 2025,
    setKeywords: ["Topps Merlin", "Topps Chrome", "Stadium Club Chrome", "Topps Museum", "Topps Dynasty", "Panini Impeccable"],
    parallelTerms: ["auto", "blue", "gold", "refractor", "/5", "/25", "/50", "/75", "/150", "RC", "rookie", "match ball"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 800,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Mohamed Salah",
    yearMin: 2017,
    yearMax: 2025,
    setKeywords: ["Topps Chrome", "Topps Merlin", "Panini Select", "Stained Glass"],
    parallelTerms: ["gold refractor", "hero SSP", "renaissance", "/50", "SP", "japan edition"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 1500,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Kylian Mbappe",
    yearMin: 2018,
    yearMax: 2025,
    setKeywords: ["Topps Chrome Sapphire", "Donruss Optic", "Panini Obsidian", "Panini Prizm"],
    parallelTerms: ["gold", "red velocity", "electric etch", "/28", "/50", "/99", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 500,
    alertThreshold: 70,
    smsThreshold: 85,
  },

  // === TIER 2: Active tracking (2-4 watchlist items) ===
  {
    player: "Toby Collyer",
    yearMin: 2024,
    yearMax: 2025,
    setKeywords: ["Topps Merlin", "Topps Chrome"],
    parallelTerms: ["auto", "refractor", "magenta", "pink", "toppsfractor", "/52", "/125", "/199", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 50,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Claudio Echeverri",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Chrome Bundesliga"],
    parallelTerms: ["gold mini-diamond", "all-etch", "SSP", "/50", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Bryan Mbeumo",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Chrome Premier League"],
    parallelTerms: ["auto", "geometric", "cold & rainy night", "case hit", "/10", "black"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 300,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Vinicius Junior",
    yearMin: 2022,
    yearMax: 2026,
    setKeywords: ["Topps Jade", "Panini Prizm", "Topps Chrome"],
    parallelTerms: ["jade", "money blast", "SSP", "/5", "/50", "black"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Endrick",
    yearMin: 2024,
    yearMax: 2025,
    setKeywords: ["Topps Merlin"],
    parallelTerms: ["gold refractor", "gold speckle", "/50", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Matheus Cunha",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Chrome"],
    parallelTerms: ["triple platinum", "black wave", "case hit", "/10"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Shea Lacey",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Chrome Premier League"],
    parallelTerms: ["auto", "orange", "gold raywave", "/25", "/50", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Alejandro Garnacho",
    yearMin: 2023,
    yearMax: 2025,
    setKeywords: ["Topps Merlin", "Panini Impeccable"],
    parallelTerms: ["auto", "match ball", "/5", "1/1", "dual materials"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 800,
    alertThreshold: 65,
    smsThreshold: 80,
  },

  // === TIER 3: Watching singles (1 watchlist item each) ===
  {
    player: "Lamine Yamal",
    yearMin: 2023,
    yearMax: 2025,
    setKeywords: ["Panini Obsidian", "Topps Chrome", "Topps Merlin", "Panini Megacracks"],
    parallelTerms: ["iridescent", "SSP", "case hit", "RC", "rookie", "/50", "gold"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 1000,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Erling Haaland",
    yearMin: 2020,
    yearMax: 2025,
    setKeywords: ["Topps Merlin", "Topps Chrome"],
    parallelTerms: ["red refractor", "/5", "SSP"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 300,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Cole Palmer",
    yearMin: 2024,
    yearMax: 2025,
    setKeywords: ["Panini Select", "Topps Chrome"],
    parallelTerms: ["gold wave", "mezzanine", "/10", "prizm"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Jude Bellingham",
    yearMin: 2020,
    yearMax: 2025,
    setKeywords: ["Topps Chrome", "Topps Dynasty"],
    parallelTerms: ["auto", "/10", "dual auto"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 5000,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Jobe Bellingham",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Chrome Bundesliga"],
    parallelTerms: ["all-etch", "SSP", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Benjamin Sesko",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Manchester UTD", "Topps Chrome"],
    parallelTerms: ["rainbow flick", "SSP", "case hit"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Warren Zaire-Emery",
    yearMin: 2022,
    yearMax: 2024,
    setKeywords: ["Topps Merlin Chrome"],
    parallelTerms: ["auto", "gold refractor", "/50", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Kenan Yildiz",
    yearMin: 2023,
    yearMax: 2024,
    setKeywords: ["Panini Select"],
    parallelTerms: ["gold prizm", "mezzanine", "/10", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 5000,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Neymar Jr",
    yearMin: 2018,
    yearMax: 2024,
    setKeywords: ["Panini Eminence", "Panini Prizm"],
    parallelTerms: ["auto", "/10", "sealed"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 500,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Konstantinos Karetsas",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps UCC"],
    parallelTerms: ["epicenter", "SSP", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Chido Obi",
    yearMin: 2024,
    yearMax: 2025,
    setKeywords: ["Topps Merlin"],
    parallelTerms: ["gold auto", "/50", "RC", "Manchester United"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Archie Gray",
    yearMin: 2024,
    yearMax: 2025,
    setKeywords: ["Topps Merlin Chrome"],
    parallelTerms: ["auto", "orange refractor", "/25", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Omar Marmoush",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Chrome Premier League"],
    parallelTerms: ["retrofractor", "/92", "base"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 50,
    alertThreshold: 65,
    smsThreshold: 80,
  },
  {
    player: "Paul Scholes",
    yearMin: 2025,
    yearMax: 2026,
    setKeywords: ["Topps Premier League Autographs"],
    parallelTerms: ["auto", "black", "/10"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 65,
    smsThreshold: 80,
  },
];

async function seedRealEntities() {
  // Delete old test entities
  console.log("Removing old test entities...");
  await supabase.from("TrackedEntity").delete().neq("id", "");

  console.log(`\nSeeding ${entities.length} tracked entities from watchlist analysis...\n`);

  const { data, error } = await supabase
    .from("TrackedEntity")
    .insert(entities)
    .select("id, player");

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  for (const entity of data!) {
    console.log(`  ${entity.player} (${entity.id})`);
  }

  console.log(`\nSeeded ${data!.length} entities.`);
}

seedRealEntities();
