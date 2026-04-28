import { supabase } from "@soccer-card-radar/db";
import type { Database } from "@soccer-card-radar/db";

type PriceRef = Database["public"]["Tables"]["PriceReference"]["Row"];

export type Recommendation = "BUY_NOW" | "BID_OFFER" | "WATCH" | "SKIP";

export interface DealAnalysis {
  recommendation: Recommendation;
  label: string;
  suggestedOfferUSD: number | null;
  discountPercent: number | null;
  marketPriceUSD: number | null;
  reasoning: string;
}

/**
 * Find the best matching price reference for a listing title.
 * Matches by entity + keyword overlap with card descriptions.
 */
async function findBestPriceRef(
  entityId: string,
  title: string
): Promise<PriceRef | null> {
  const { data: refs } = await supabase
    .from("PriceReference")
    .select("*")
    .eq("entityId", entityId);

  if (!refs || refs.length === 0) return null;

  const titleNorm = title.toLowerCase();

  // Score each ref by keyword overlap with the listing title
  let bestRef: PriceRef | null = null;
  let bestScore = 0;

  for (const ref of refs) {
    const descWords = ref.cardDescription.toLowerCase().split(/\s+/);
    const matchingWords = descWords.filter((w) =>
      w.length >= 3 && titleNorm.includes(w)
    );
    const score = matchingWords.length / descWords.length;

    if (score > bestScore) {
      bestScore = score;
      bestRef = ref;
    }
  }

  // Require at least 40% word overlap to consider it a match
  return bestScore >= 0.4 ? bestRef : null;
}

/**
 * Determine if a listing is graded based on title.
 */
function detectGrade(title: string): "psa10" | "psa9" | "raw" {
  const t = title.toLowerCase();
  if (t.includes("psa 10") || t.includes("psa10") || t.includes("bgs 10") || t.includes("sgc 10")) return "psa10";
  if (t.includes("psa 9") || t.includes("psa9") || t.includes("bgs 9.5") || t.includes("sgc 9")) return "psa9";
  return "raw";
}

/**
 * Get the appropriate market price based on condition.
 */
function getMarketPrice(ref: PriceRef, grade: "psa10" | "psa9" | "raw"): number {
  if (grade === "psa10" && ref.gradedPSA10) return ref.gradedPSA10;
  if (grade === "psa9" && ref.gradedPSA9) return ref.gradedPSA9;
  if (grade === "raw" && ref.rawPrice) return ref.rawPrice;
  return ref.marketPriceUSD;
}

/**
 * Analyze a listing and produce a deal recommendation.
 *
 * - BUY NOW: ≥30% below market → grab it
 * - BID/OFFER $X: 10-30% below market → worth pursuing at a target price
 * - WATCH: within 10% of market → fair price, monitor
 * - SKIP: above market or no comp data
 */
export async function analyzeDeal(
  entityId: string,
  title: string,
  priceUSD: number,
  matchScore: number
): Promise<DealAnalysis> {
  const ref = await findBestPriceRef(entityId, title);

  // No price reference — use match score to decide
  if (!ref) {
    if (matchScore >= 85) {
      return {
        recommendation: "WATCH",
        label: "WATCH",
        suggestedOfferUSD: null,
        discountPercent: null,
        marketPriceUSD: null,
        reasoning: "High match score but no market comp data yet. Monitor this one.",
      };
    }
    return {
      recommendation: "SKIP",
      label: "SKIP",
      suggestedOfferUSD: null,
      discountPercent: null,
      marketPriceUSD: null,
      reasoning: "No market comp data available to evaluate price.",
    };
  }

  const grade = detectGrade(title);
  const marketPrice = getMarketPrice(ref, grade);
  const discount = ((marketPrice - priceUSD) / marketPrice) * 100;

  // BUY NOW: ≥30% below market
  if (discount >= 30) {
    return {
      recommendation: "BUY_NOW",
      label: `🔥 BUY NOW — ${Math.round(discount)}% below market`,
      suggestedOfferUSD: null,
      discountPercent: Math.round(discount),
      marketPriceUSD: marketPrice,
      reasoning: `Listed at $${priceUSD.toFixed(2)} vs market ~$${marketPrice.toFixed(2)} (${grade}). ${Math.round(discount)}% discount.`,
    };
  }

  // BID/OFFER: 10-30% below market
  if (discount >= 10) {
    const offerTarget = Math.round(marketPrice * 0.7);
    return {
      recommendation: "BID_OFFER",
      label: `BID/OFFER $${offerTarget}`,
      suggestedOfferUSD: offerTarget,
      discountPercent: Math.round(discount),
      marketPriceUSD: marketPrice,
      reasoning: `Listed at $${priceUSD.toFixed(2)} vs market ~$${marketPrice.toFixed(2)} (${grade}). Try offering ~$${offerTarget}.`,
    };
  }

  // WATCH: within 10% of market
  if (discount >= -10) {
    return {
      recommendation: "WATCH",
      label: "WATCH — fair price",
      suggestedOfferUSD: Math.round(marketPrice * 0.8),
      discountPercent: Math.round(discount),
      marketPriceUSD: marketPrice,
      reasoning: `At market price ($${marketPrice.toFixed(2)} ${grade}). Wait for a dip or offer $${Math.round(marketPrice * 0.8)}.`,
    };
  }

  // SKIP: >10% above market
  return {
    recommendation: "SKIP",
    label: `SKIP — ${Math.abs(Math.round(discount))}% above market`,
    suggestedOfferUSD: Math.round(marketPrice * 0.85),
    discountPercent: Math.round(discount),
    marketPriceUSD: marketPrice,
    reasoning: `Overpriced at $${priceUSD.toFixed(2)} vs market ~$${marketPrice.toFixed(2)} (${grade}).`,
  };
}
