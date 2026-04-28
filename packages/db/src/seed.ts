import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  for (const entity of entities) {
    const created = await prisma.trackedEntity.create({ data: entity });
    console.log(`  Created: ${created.player} (${created.id})`);
  }

  console.log("Seed complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
