import type { Database } from "@soccer-card-radar/db";

type TrackedEntity = Database["public"]["Tables"]["TrackedEntity"]["Row"];

export interface SearchQuery {
  query: string;
  purpose: string;
  maxPrice?: number;
}

/**
 * Generate search queries for a player's most valuable cards.
 * Each entity gets a set of targeted searches designed to find:
 * - Rookie cards
 * - Autographs
 * - Low-numbered parallels
 * - Case hits / SSPs
 * - Graded gems (PSA 10 / BGS 10)
 */
export function generateSearchQueries(entity: TrackedEntity): SearchQuery[] {
  const queries: SearchQuery[] = [];
  const player = entity.player;
  const ceiling = entity.priceCeilingUSD ?? undefined;

  // 1. Core search — player + best set keywords
  for (const setKw of entity.setKeywords.slice(0, 2)) {
    queries.push({
      query: `${player} ${setKw}`,
      purpose: `Core: ${setKw}`,
      maxPrice: ceiling,
    });
  }

  // 2. Autograph hunt
  queries.push({
    query: `${player} auto autograph card`,
    purpose: "Autograph hunt",
    maxPrice: ceiling,
  });

  // 3. Rookie cards (if year range suggests RC era)
  if (entity.yearMin) {
    queries.push({
      query: `${player} ${entity.yearMin} rookie RC`,
      purpose: `Rookie year ${entity.yearMin}`,
      maxPrice: ceiling,
    });
  }

  // 4. Low-numbered parallels — the steal territory
  for (const term of entity.parallelTerms.filter((t) => t.includes("/"))) {
    queries.push({
      query: `${player} ${term}`,
      purpose: `Numbered parallel ${term}`,
      maxPrice: ceiling,
    });
  }

  // 5. SSP / Case hits
  queries.push({
    query: `${player} SSP case hit card`,
    purpose: "SSP / Case hits",
    maxPrice: ceiling,
  });

  // 6. Graded gems — PSA 10 at discount
  queries.push({
    query: `${player} PSA 10 card`,
    purpose: "Graded PSA 10",
    maxPrice: ceiling,
  });

  return queries;
}

/**
 * Prioritize which entities to search first.
 * Tier 1 (lower threshold = more aggressive) gets searched first.
 */
export function prioritizeEntities(entities: TrackedEntity[]): TrackedEntity[] {
  return [...entities].sort((a, b) => {
    // Lower alert threshold = higher priority
    const priorityA = a.alertThreshold;
    const priorityB = b.alertThreshold;
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Higher price ceiling = bigger budget = more interesting
    const ceilA = a.priceCeilingUSD ?? 0;
    const ceilB = b.priceCeilingUSD ?? 0;
    return ceilB - ceilA;
  });
}
