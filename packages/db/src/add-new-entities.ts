import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const newEntities = [
  // New players spotted in updated watchlist
  {
    player: "Nico Paz",
    yearMin: 2023, yearMax: 2025,
    setKeywords: ["Topps Chrome Sapphire", "Panini Megacracks"],
    parallelTerms: ["gold refractor", "/50", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 800, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Ethan Nwaneri",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Topps Chrome", "Topps Finest"],
    parallelTerms: ["auto", "black lazer", "green", "/99", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Viktor Gyokeres",
    yearMin: 2025, yearMax: 2026,
    setKeywords: ["Topps Chrome Premier League"],
    parallelTerms: ["auto", "red wave", "/5", "/25"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 1000, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Michael Olise",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Panini Obsidian", "Topps Chrome"],
    parallelTerms: ["electric etch", "gold flood", "dual patch", "/10"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Jamal Musiala",
    yearMin: 2022, yearMax: 2025,
    setKeywords: ["Topps Chrome Bundesliga"],
    parallelTerms: ["auto", "gold lava", "/50"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Ryan Giggs",
    yearMin: 2010, yearMax: 2026,
    setKeywords: ["Topps Premier", "Topps Chrome Premier League"],
    parallelTerms: ["auto", "hundred club", "/50", "/105"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Lionel Messi",
    yearMin: 2004, yearMax: 2024,
    setKeywords: ["Panini Select", "Topps Chrome", "Panini Prizm"],
    parallelTerms: ["gold wave", "terrace", "/10", "PSA 10"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 5000, alertThreshold: 70, smsThreshold: 85,
  },
  {
    player: "Joao Felix",
    yearMin: 2018, yearMax: 2024,
    setKeywords: ["Topps Chrome"],
    parallelTerms: ["gold refractor", "/50", "RC", "rookie"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Marcus Rashford",
    yearMin: 2025, yearMax: 2026,
    setKeywords: ["Panini Select La Liga"],
    parallelTerms: ["gold prizm", "/10", "/5"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Wayne Rooney",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Topps Definitive"],
    parallelTerms: ["auto", "gold", "/50", "marks of excellence"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Kevin De Bruyne",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Topps Chrome UCC"],
    parallelTerms: ["auto", "gold refractor", "/50"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Eduardo Camavinga",
    yearMin: 2020, yearMax: 2021,
    setKeywords: ["Topps Chrome"],
    parallelTerms: ["auto", "gold refractor", "/50", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Gavi",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Panini Noir"],
    parallelTerms: ["auto", "gold ink", "/15"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Eli Junior Kroupi",
    yearMin: 2025, yearMax: 2026,
    setKeywords: ["Topps Chrome Sapphire", "Topps Chrome Premier League", "Topps Finest"],
    parallelTerms: ["gold refractor", "/50", "RC", "rookie", "raywave"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Lennart Karl",
    yearMin: 2025, yearMax: 2026,
    setKeywords: ["Topps Chrome Bundesliga", "Topps Deco"],
    parallelTerms: ["auto", "triple auto", "/10", "/25", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 5000, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Senny Mayulu",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Topps Merlin", "Topps Finest"],
    parallelTerms: ["auto", "dual auto", "gold", "/50", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Santiago Castro",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Topps Merlin Chrome"],
    parallelTerms: ["auto", "gold mojo", "pink", "/50", "/199", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Geovany Quenda",
    yearMin: 2024, yearMax: 2025,
    setKeywords: ["Topps Merlin Chrome"],
    parallelTerms: ["auto", "aqua mojo", "/75", "RC"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 100, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Robin Van Persie",
    yearMin: 2018, yearMax: 2025,
    setKeywords: ["Panini Eminence", "Topps Chrome"],
    parallelTerms: ["auto", "gold", "/5", "/50"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200, alertThreshold: 65, smsThreshold: 80,
  },
  {
    player: "Pedri",
    yearMin: 2023, yearMax: 2024,
    setKeywords: ["Topps Chrome Sapphire"],
    parallelTerms: ["auto", "black refractor", "/10"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 500, alertThreshold: 65, smsThreshold: 80,
  },
];

async function addNewEntities() {
  // Check which players already exist
  const { data: existing } = await supabase.from("TrackedEntity").select("player");
  const existingPlayers = new Set((existing ?? []).map(e => e.player));

  const toInsert = newEntities.filter(e => !existingPlayers.has(e.player));

  if (toInsert.length === 0) {
    console.log("All players already tracked.");
    return;
  }

  console.log(`Adding ${toInsert.length} new tracked entities...\n`);

  const { data, error } = await supabase
    .from("TrackedEntity")
    .insert(toInsert)
    .select("id, player");

  if (error) {
    console.error("Insert failed:", error.message);
    return;
  }

  for (const e of data!) {
    console.log(`  ${e.player} (${e.id})`);
  }

  console.log(`\nAdded ${data!.length} new entities. Total: ${existingPlayers.size + data!.length}`);
}

addNewEntities();
