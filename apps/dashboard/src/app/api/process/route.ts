import { NextRequest, NextResponse } from "next/server";
import { searchListings as searchEbay } from "@soccer-card-radar/ebay";
import { processListings } from "@soccer-card-radar/matcher";
import { supabase } from "@soccer-card-radar/db";

/**
 * Process endpoint: searches eBay for each active entity's keywords,
 * then runs extraction + matching on results.
 *
 * GET /api/process — processes all active entities
 * GET /api/process?q=custom+query — processes a specific query
 */
export async function GET(req: NextRequest) {
  const customQuery = req.nextUrl.searchParams.get("q");

  try {
    if (customQuery) {
      // Process a single custom query
      const listings = await searchEbay({ query: customQuery, limit: 30 });
      const result = await processListings(listings);

      return NextResponse.json({
        query: customQuery,
        ...result,
      });
    }

    // Process all active entities
    const { data: entities } = await supabase
      .from("TrackedEntity")
      .select("*")
      .eq("active", true);

    if (!entities || entities.length === 0) {
      return NextResponse.json({ message: "No active entities to process" });
    }

    const results = [];

    for (const entity of entities) {
      const query = `${entity.player} ${entity.setKeywords[0] ?? "card"}`;

      try {
        const listings = await searchEbay({
          query,
          limit: 20,
          maxPrice: entity.priceCeilingUSD ?? undefined,
        });

        const result = await processListings(listings);
        results.push({
          entity: entity.player,
          query,
          ...result,
        });
      } catch (error) {
        results.push({
          entity: entity.player,
          query,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
