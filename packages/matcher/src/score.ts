import type { ExtractionResult, MatchScoreResult } from "@soccer-card-radar/shared";
import type { Database } from "@soccer-card-radar/db";

type TrackedEntity = Database["public"]["Tables"]["TrackedEntity"]["Row"];

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Check if the extracted player matches the entity's player.
 * Matches on full name or last name.
 */
function playerMatches(extracted: string | null, entityPlayer: string): boolean {
  if (!extracted) return false;

  const eName = norm(extracted);
  const tName = norm(entityPlayer);

  // Exact match
  if (eName === tName) return true;

  // Last name match (at minimum)
  const eParts = eName.split(" ");
  const tParts = tName.split(" ");
  const eLast = eParts[eParts.length - 1];
  const tLast = tParts[tParts.length - 1];

  return eLast === tLast && eLast.length >= 3;
}

/**
 * Check if the title contains any exclude term.
 */
function hasExcludeTerm(title: string, excludeTerms: string[]): boolean {
  const normalizedTitle = norm(title);
  return excludeTerms.some((term) => normalizedTitle.includes(norm(term)));
}

/**
 * Check if year falls within entity's year range.
 */
function yearInRange(
  year: number | null,
  yearMin: number | null,
  yearMax: number | null
): boolean {
  if (year === null) return false;
  if (yearMin !== null && year < yearMin) return false;
  if (yearMax !== null && year > yearMax) return false;
  return true;
}

/**
 * Check if any set keyword appears in the extracted set or title.
 */
function hasSetKeyword(
  extractedSet: string | null,
  title: string,
  setKeywords: string[]
): boolean {
  const searchIn = norm(`${extractedSet ?? ""} ${title}`);
  return setKeywords.some((kw) => searchIn.includes(norm(kw)));
}

/**
 * Check if any parallel term appears in the extracted parallel or title.
 */
function hasParallelTerm(
  extractedParallel: string | null,
  title: string,
  parallelTerms: string[]
): boolean {
  const searchIn = norm(`${extractedParallel ?? ""} ${title}`);
  return parallelTerms.some((term) => searchIn.includes(norm(term)));
}

/**
 * Score a match between an extraction and a tracked entity.
 * Returns 0-100 score with reason breakdown.
 *
 * Required filters (score = 0 if any fail):
 *   - Player matches
 *   - No exclude terms in title
 *   - Not a lot (unless entity opts in)
 *
 * Additive scoring:
 *   - Year in range: +25
 *   - Set keyword hit: +25
 *   - Parallel term hit: +20
 *   - Below price ceiling: +15
 *   - Autograph match: +15
 */
export function scoreMatch(
  extraction: ExtractionResult,
  entity: TrackedEntity,
  title: string,
  priceUSD: number
): MatchScoreResult {
  const reasons = {
    playerMatch: playerMatches(extraction.player, entity.player),
    yearInRange: yearInRange(extraction.year, entity.yearMin, entity.yearMax),
    setKeywordHit: hasSetKeyword(extraction.set, title, entity.setKeywords),
    parallelTermHit: hasParallelTerm(
      extraction.parallel,
      title,
      entity.parallelTerms
    ),
    belowPriceCeiling:
      entity.priceCeilingUSD !== null
        ? priceUSD <= entity.priceCeilingUSD
        : true,
    autographMatch: extraction.autograph,
    excludeTermHit: hasExcludeTerm(title, entity.excludeTerms),
    isLot: extraction.isLot,
  };

  // Hard filters — any of these → score 0
  if (!reasons.playerMatch) return { score: 0, reasons };
  if (reasons.excludeTermHit) return { score: 0, reasons };
  if (reasons.isLot) return { score: 0, reasons };

  // Additive scoring
  let score = 0;
  if (reasons.yearInRange) score += 25;
  if (reasons.setKeywordHit) score += 25;
  if (reasons.parallelTermHit) score += 20;
  if (reasons.belowPriceCeiling) score += 15;
  if (reasons.autographMatch) score += 15;

  return { score, reasons };
}
