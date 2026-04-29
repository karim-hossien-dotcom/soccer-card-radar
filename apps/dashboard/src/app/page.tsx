import { supabase } from "@soccer-card-radar/db";
import ListingCard from "./listing-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type MatchWithDetails = {
  id: string;
  score: number;
  reasons: Record<string, boolean>;
  listingId: string;
  entityId: string;
  listing: {
    title: string;
    priceUSD: number;
    platform: string;
    url: string;
    imageUrl: string | null;
  };
  entity: {
    player: string;
    yearMin: number | null;
    yearMax: number | null;
    priceCeilingUSD: number | null;
  };
  recommendation: string;
  marketPrice: number | null;
  discount: number | null;
};

// Price-aware recommendation using market comps
function getRecommendation(
  score: number,
  priceUSD: number,
  marketPrice: number | null,
): { type: string; marketPrice: number | null; discount: number | null } {
  if (marketPrice && marketPrice > 0) {
    const discount = ((marketPrice - priceUSD) / marketPrice) * 100;
    if (discount >= 30) return { type: "buy", marketPrice, discount: Math.round(discount) };
    if (discount >= 10) return { type: "bid", marketPrice, discount: Math.round(discount) };
    if (discount >= -10) return { type: "watch", marketPrice, discount: Math.round(discount) };
    return { type: "skip", marketPrice, discount: Math.round(discount) };
  }
  // Fallback to score-based
  if (score >= 90) return { type: "buy", marketPrice: null, discount: null };
  if (score >= 80) return { type: "bid", marketPrice: null, discount: null };
  if (score >= 65) return { type: "watch", marketPrice: null, discount: null };
  return { type: "skip", marketPrice: null, discount: null };
}

// Find best matching price ref by keyword overlap
function findMarketPrice(
  entityId: string,
  title: string,
  priceRefs: { entityId: string; cardDescription: string; marketPriceUSD: number; gradedPSA10: number | null; gradedPSA9: number | null; rawPrice: number | null }[]
): number | null {
  const titleLower = title.toLowerCase();
  const entityRefs = priceRefs.filter((r) => r.entityId === entityId);
  if (entityRefs.length === 0) return null;

  let bestRef: typeof entityRefs[0] | null = null;
  let bestScore = 0;

  for (const ref of entityRefs) {
    const descWords = ref.cardDescription.toLowerCase().split(/\s+/);
    const matches = descWords.filter((w) => w.length >= 3 && titleLower.includes(w));
    const score = matches.length / descWords.length;
    if (score > bestScore) {
      bestScore = score;
      bestRef = ref;
    }
  }

  if (!bestRef || bestScore < 0.4) return null;

  // Grade-aware pricing
  if (titleLower.includes("psa 10") && bestRef.gradedPSA10) return bestRef.gradedPSA10;
  if (titleLower.includes("psa 9") && bestRef.gradedPSA9) return bestRef.gradedPSA9;
  if (bestRef.rawPrice && !titleLower.includes("psa")) return bestRef.rawPrice;
  return bestRef.marketPriceUSD;
}

export default async function Dashboard() {
  const { data: matchRows } = await supabase
    .from("MatchScore")
    .select("*")
    .gte("score", 1)
    .order("score", { ascending: false })
    .limit(60);

  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("*")
    .eq("active", true);

  const entityMap = new Map(
    (entities ?? []).map((e) => [e.id, e])
  );

  const listingIds = [...new Set((matchRows ?? []).map((m) => m.listingId))];

  const { data: listings } = listingIds.length > 0
    ? await supabase.from("Listing").select("*").in("id", listingIds)
    : { data: [] };

  const listingMap = new Map(
    (listings ?? []).map((l) => [l.id, l])
  );

  // Fetch price references
  const { data: priceRefs } = await supabase
    .from("PriceReference")
    .select("entityId, cardDescription, marketPriceUSD, gradedPSA10, gradedPSA9, rawPrice");

  const refs = priceRefs ?? [];

  const rows: MatchWithDetails[] = (matchRows ?? [])
    .map((match) => {
      const listing = listingMap.get(match.listingId);
      const entity = entityMap.get(match.entityId);
      if (!listing || !entity) return null;

      const marketPrice = findMarketPrice(match.entityId, listing.title, refs);
      const rec = getRecommendation(match.score, listing.priceUSD, marketPrice);

      return {
        id: match.id,
        score: match.score,
        reasons: match.reasons as Record<string, boolean>,
        listingId: match.listingId,
        entityId: match.entityId,
        listing: {
          title: listing.title,
          priceUSD: listing.priceUSD,
          platform: listing.platform,
          url: listing.url,
          imageUrl: listing.imageUrl,
        },
        entity: {
          player: entity.player,
          yearMin: entity.yearMin,
          yearMax: entity.yearMax,
          priceCeilingUSD: entity.priceCeilingUSD,
        },
        recommendation: rec.type,
        marketPrice: rec.marketPrice,
        discount: rec.discount,
      };
    })
    .filter(Boolean) as MatchWithDetails[];

  // Sort: BUY NOW first (biggest discounts), then by score
  rows.sort((a, b) => {
    const typeOrder: Record<string, number> = { buy: 0, bid: 1, watch: 2, skip: 3 };
    const orderDiff = (typeOrder[a.recommendation] ?? 3) - (typeOrder[b.recommendation] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    return (b.discount ?? 0) - (a.discount ?? 0) || b.score - a.score;
  });

  const buyCount = rows.filter((r) => r.recommendation === "buy").length;
  const bidCount = rows.filter((r) => r.recommendation === "bid").length;
  const watchCount = rows.filter((r) => r.recommendation === "watch").length;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "2rem 1.5rem",
        position: "relative",
        zIndex: 1,
      }}
    >
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
        {entities?.length ?? 0} players tracked — {rows.length} matches scored
      </p>

      {/* Stats Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard label="BUY NOW" count={buyCount} color="var(--buy-now)" bg="var(--buy-now-bg)" />
        <StatCard label="BID / OFFER" count={bidCount} color="var(--bid)" bg="var(--bid-bg)" />
        <StatCard label="WATCH" count={watchCount} color="var(--watch)" bg="var(--watch-bg)" />
        <StatCard label="TOTAL" count={rows.length} color="var(--text-secondary)" bg="var(--bg-card)" />
      </div>

      {/* Filter Labels */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <FilterBadge label="ALL" active />
        <FilterBadge label="BUY NOW" color="var(--buy-now)" />
        <FilterBadge label="BID" color="var(--bid)" />
        <FilterBadge label="WATCH" color="var(--watch)" />
      </div>

      {/* Listing Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {rows.map((match, i) => (
          <ListingCard
            key={match.id}
            id={match.id}
            score={match.score}
            reasons={match.reasons}
            title={match.listing.title}
            priceUSD={match.listing.priceUSD}
            platform={match.listing.platform}
            url={match.listing.url}
            player={match.entity.player}
            yearMin={match.entity.yearMin}
            yearMax={match.entity.yearMax}
            recommendation={match.recommendation}
            marketPrice={match.marketPrice}
            discount={match.discount}
            index={i}
          />
        ))}
      </div>

      {rows.length === 0 && (
        <div
          style={{
            padding: "4rem 2rem",
            textAlign: "center",
            border: "1px dashed var(--border)",
            borderRadius: "8px",
          }}
        >
          <p className="mono" style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            NO MATCHES YET
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
            Waiting for eBay API keys to scan live listings
          </p>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  count,
  color,
  bg,
}: {
  label: string;
  count: number;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}22`,
        borderRadius: "8px",
        padding: "1rem",
        animation: "fadeInUp 0.4s ease-out",
      }}
    >
      <div
        className="mono"
        style={{ fontSize: "1.75rem", fontWeight: 700, color, lineHeight: 1 }}
      >
        {count}
      </div>
      <div
        className="mono"
        style={{
          fontSize: "0.65rem",
          color,
          opacity: 0.7,
          marginTop: "0.35rem",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FilterBadge({
  label,
  color,
  active,
}: {
  label: string;
  color?: string;
  active?: boolean;
}) {
  return (
    <span
      className="mono"
      style={{
        fontSize: "0.65rem",
        padding: "4px 10px",
        borderRadius: "4px",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "var(--accent)18" : "transparent",
        color: color ?? "var(--text-secondary)",
        cursor: "pointer",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </span>
  );
}
