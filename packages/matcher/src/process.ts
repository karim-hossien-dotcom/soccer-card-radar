import { supabase } from "@soccer-card-radar/db";
import type { NormalizedListing } from "@soccer-card-radar/shared";
import { extractListingMeta } from "@soccer-card-radar/extractor";
import { scoreMatch } from "./score";

/**
 * Process a batch of listings:
 * 1. Upsert each listing into the DB (idempotent by platform+externalId)
 * 2. Extract metadata via LLM (cached)
 * 3. Score against all active tracked entities
 * 4. Persist MatchScore rows
 *
 * Returns the number of new high-scoring matches found.
 */
export async function processListings(
  listings: NormalizedListing[]
): Promise<{ processed: number; highScoreMatches: number }> {
  // Fetch all active entities
  const { data: entities, error: entitiesError } = await supabase
    .from("TrackedEntity")
    .select("*")
    .eq("active", true);

  if (entitiesError || !entities) {
    throw new Error(`Failed to fetch entities: ${entitiesError?.message}`);
  }

  let highScoreMatches = 0;

  for (const listing of listings) {
    // 1. Upsert listing
    const { data: existingListing } = await supabase
      .from("Listing")
      .select("id, priceUSD")
      .eq("platform", listing.platform)
      .eq("externalId", listing.externalId)
      .single();

    let listingId: string;

    if (existingListing) {
      listingId = existingListing.id;

      // Update lastSeenAt, and record price change if any
      await supabase
        .from("Listing")
        .update({
          lastSeenAt: new Date().toISOString(),
          priceUSD: listing.priceUSD,
          priceNative: listing.priceNative,
        })
        .eq("id", listingId);

      if (existingListing.priceUSD !== listing.priceUSD) {
        await supabase.from("PriceHistory").insert({
          listingId,
          priceUSD: listing.priceUSD,
          priceNative: listing.priceNative,
          currency: listing.currency,
        });
      }
    } else {
      const { data: newListing, error: insertError } = await supabase
        .from("Listing")
        .insert({
          platform: listing.platform,
          externalId: listing.externalId,
          url: listing.url,
          title: listing.title,
          priceUSD: listing.priceUSD,
          priceNative: listing.priceNative,
          currency: listing.currency,
          imageUrl: listing.imageUrl,
          sellerInfo: listing.sellerInfo,
          rawData: listing.rawData,
        })
        .select("id")
        .single();

      if (insertError || !newListing) {
        console.error(
          `Failed to insert listing ${listing.externalId}:`,
          insertError?.message
        );
        continue;
      }

      listingId = newListing.id;

      // Initial price history entry
      await supabase.from("PriceHistory").insert({
        listingId,
        priceUSD: listing.priceUSD,
        priceNative: listing.priceNative,
        currency: listing.currency,
      });
    }

    // 2. Extract metadata
    const extraction = await extractListingMeta(listing.title);

    // 3. Score against each entity
    for (const entity of entities) {
      const { score, reasons } = scoreMatch(
        extraction,
        entity,
        listing.title,
        listing.priceUSD
      );

      // Only persist matches with score > 0
      if (score > 0) {
        await supabase.from("MatchScore").upsert(
          {
            listingId,
            entityId: entity.id,
            score,
            reasons: reasons as unknown as Record<string, unknown>,
          },
          { onConflict: "listingId,entityId" }
        );

        if (score >= entity.alertThreshold) {
          highScoreMatches++;
        }
      }
    }
  }

  return { processed: listings.length, highScoreMatches };
}
