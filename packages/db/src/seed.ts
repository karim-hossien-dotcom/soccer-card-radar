import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

const entities = [
  {
    player: "Lionel Messi",
    yearMin: 2004,
    yearMax: 2006,
    setKeywords: ["Panini Mega Cracks", "Mega Cracks", "Mini-Cards", "Barca"],
    parallelTerms: ["refractor", "auto", "/99", "gold"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 500,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Diego Maradona",
    yearMin: 1986,
    yearMax: 1987,
    setKeywords: ["Panini", "World Cup", "Mexico 86", "Sticker"],
    parallelTerms: ["auto", "signed"],
    excludeTerms: ["reprint", "lot", "custom", "digital", "reproduction"],
    priceCeilingUSD: 300,
    alertThreshold: 70,
    smsThreshold: 85,
  },
  {
    player: "Ronaldinho",
    yearMin: 2002,
    yearMax: 2004,
    setKeywords: ["Panini", "Pany Stickers", "Mega Cracks", "Sports"],
    parallelTerms: ["refractor", "auto", "gold"],
    excludeTerms: ["reprint", "lot", "custom", "digital"],
    priceCeilingUSD: 200,
    alertThreshold: 70,
    smsThreshold: 85,
  },
];

async function seed() {
  console.log("Seeding tracked entities...");

  const { data, error } = await supabase
    .from("TrackedEntity")
    .insert(entities)
    .select();

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  for (const entity of data) {
    console.log(`  Created: ${entity.player} (${entity.id})`);
  }

  console.log("Seed complete.");
}

seed();
