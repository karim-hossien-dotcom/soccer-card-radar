import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TrackedEntity = Database["public"]["Tables"]["TrackedEntity"]["Row"];
type ListingRow = Database["public"]["Tables"]["Listing"]["Row"];

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function playerMatches(title: string, entityPlayer: string): boolean {
  const t = norm(title);
  const p = norm(entityPlayer);

  // Full name match
  if (t.includes(p)) return true;

  // Last name match (min 3 chars)
  const parts = p.split(" ");
  const lastName = parts[parts.length - 1];
  if (lastName.length >= 3 && t.includes(lastName)) return true;

  // Handle "Vini Jr" / "Vinicius Junior"
  if (p.includes("vinicius") && (t.includes("vini jr") || t.includes("vinicius"))) return true;
  if (p.includes("chido obi") && t.includes("chido obi")) return true;

  return false;
}

function hasExcludeTerm(title: string, excludeTerms: string[]): boolean {
  const t = norm(title);
  return excludeTerms.some((term) => t.includes(norm(term)));
}

function hasSetKeyword(title: string, setKeywords: string[]): boolean {
  const t = norm(title);
  return setKeywords.some((kw) => t.includes(norm(kw)));
}

function hasParallelTerm(title: string, parallelTerms: string[]): boolean {
  const t = norm(title);
  return parallelTerms.some((term) => t.includes(norm(term)));
}

function extractYear(title: string): number | null {
  // Match patterns like "2024-25", "2023-24", "2018"
  const match = title.match(/\b(20\d{2})(?:-\d{2})?\b/);
  return match ? parseInt(match[1]) : null;
}

function yearInRange(year: number | null, min: number | null, max: number | null): boolean {
  if (year === null) return false;
  if (min !== null && year < min) return false;
  if (max !== null && year > max) return false;
  return true;
}

function isLot(title: string): boolean {
  const t = norm(title);
  return t.includes(" lot ") || t.includes("lot of") || t.startsWith("lot ");
}

function scoreMatch(listing: ListingRow, entity: TrackedEntity) {
  const title = listing.title;
  const reasons = {
    playerMatch: playerMatches(title, entity.player),
    yearInRange: yearInRange(extractYear(title), entity.yearMin, entity.yearMax),
    setKeywordHit: hasSetKeyword(title, entity.setKeywords),
    parallelTermHit: hasParallelTerm(title, entity.parallelTerms),
    belowPriceCeiling: entity.priceCeilingUSD !== null ? listing.priceUSD <= entity.priceCeilingUSD : true,
    autographMatch: norm(title).includes("auto"),
    excludeTermHit: hasExcludeTerm(title, entity.excludeTerms),
    isLot: isLot(title),
  };

  if (!reasons.playerMatch) return { score: 0, reasons };
  if (reasons.excludeTermHit) return { score: 0, reasons };
  if (reasons.isLot) return { score: 0, reasons };

  let score = 0;
  if (reasons.yearInRange) score += 25;
  if (reasons.setKeywordHit) score += 25;
  if (reasons.parallelTermHit) score += 20;
  if (reasons.belowPriceCeiling) score += 15;
  if (reasons.autographMatch) score += 15;

  return { score, reasons };
}

async function matchWatchlist() {
  const { data: entities } = await supabase.from("TrackedEntity").select("*").eq("active", true);
  const { data: listings } = await supabase.from("Listing").select("*");

  if (!entities || !listings) {
    console.error("Failed to fetch data");
    return;
  }

  console.log(`Matching ${listings.length} listings against ${entities.length} entities...\n`);

  let matchCount = 0;
  let highScoreCount = 0;

  for (const listing of listings) {
    for (const entity of entities) {
      const { score, reasons } = scoreMatch(listing, entity);

      if (score > 0) {
        await supabase.from("MatchScore").upsert(
          {
            listingId: listing.id,
            entityId: entity.id,
            score,
            reasons: reasons as unknown as Record<string, unknown>,
          },
          { onConflict: "listingId,entityId" }
        );

        matchCount++;
        const flag = score >= 70 ? " *** HIGH ***" : "";
        console.log(`  [${score}]${flag} ${entity.player} ← ${listing.title.slice(0, 65)}`);

        if (score >= 70) highScoreCount++;
      }
    }
  }

  console.log(`\nDone: ${matchCount} matches, ${highScoreCount} high-score (≥70)`);
}

matchWatchlist();
