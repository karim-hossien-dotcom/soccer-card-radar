import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createTable() {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS "PriceReference" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "entityId" TEXT NOT NULL,
        "cardDescription" TEXT NOT NULL,
        "marketPriceUSD" DOUBLE PRECISION NOT NULL,
        "lastSoldUSD" DOUBLE PRECISION,
        "lastSoldDate" TEXT,
        "source" TEXT NOT NULL,
        "gradedPSA10" DOUBLE PRECISION,
        "gradedPSA9" DOUBLE PRECISION,
        "rawPrice" DOUBLE PRECISION,
        "notes" TEXT,
        "updatedAt" TIMESTAMP(3) DEFAULT now()
      );
    `,
  });

  if (error) {
    console.log("RPC not available, run this SQL in Supabase dashboard:");
    console.log(`
CREATE TABLE IF NOT EXISTS "PriceReference" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "entityId" TEXT NOT NULL,
  "cardDescription" TEXT NOT NULL,
  "marketPriceUSD" DOUBLE PRECISION NOT NULL,
  "lastSoldUSD" DOUBLE PRECISION,
  "lastSoldDate" TEXT,
  "source" TEXT NOT NULL,
  "gradedPSA10" DOUBLE PRECISION,
  "gradedPSA9" DOUBLE PRECISION,
  "rawPrice" DOUBLE PRECISION,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) DEFAULT now()
);
    `);
  } else {
    console.log("PriceReference table created.");
  }
}

createTable();
