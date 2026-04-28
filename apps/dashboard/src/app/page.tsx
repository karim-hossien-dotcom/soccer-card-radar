import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReviewQueue() {
  // Fetch matches
  const { data: matchRows, error: matchError } = await supabase
    .from("MatchScore")
    .select("*")
    .gte("score", 1)
    .order("score", { ascending: false })
    .limit(50);

  // Fetch all entities
  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("*")
    .eq("active", true);

  // Build entity lookup
  const entityMap = new Map(
    (entities ?? []).map((e) => [e.id, e])
  );

  // Fetch listing details for matched listings
  const listingIds = [
    ...new Set((matchRows ?? []).map((m) => m.listingId)),
  ];

  const { data: listings } = listingIds.length > 0
    ? await supabase
        .from("Listing")
        .select("*")
        .in("id", listingIds)
    : { data: [] };

  const listingMap = new Map(
    (listings ?? []).map((l) => [l.id, l])
  );

  // Combine into display rows
  const rows = (matchRows ?? []).map((match) => ({
    ...match,
    listing: listingMap.get(match.listingId),
    entity: entityMap.get(match.entityId),
  })).filter((r) => r.listing && r.entity);

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "900px" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Soccer Card Radar</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Tracking {entities?.length ?? 0} entities | {rows.length} scored matches
      </p>

      {matchError && <p style={{ color: "red" }}>Error: {matchError.message}</p>}

      {rows.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
          <p>No scored listings yet.</p>
          <p style={{ fontSize: "0.9rem" }}>
            Run a search + process via <code>/api/process?q=messi+panini</code> to populate.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {rows.map((match) => {
          const listing = match.listing!;
          const entity = match.entity!;
          const reasons = match.reasons as Record<string, boolean>;

          const scoreColor =
            match.score >= 85
              ? "#16a34a"
              : match.score >= 70
                ? "#ca8a04"
                : "#6b7280";

          return (
            <div
              key={match.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "1rem",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}
            >
              {listing.imageUrl && (
                <img
                  src={listing.imageUrl}
                  alt=""
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "1.25rem",
                      color: scoreColor,
                    }}
                  >
                    {match.score}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      background: "#f3f4f6",
                      padding: "2px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {listing.platform}
                  </span>
                </div>
                <a
                  href={listing.url}
                  target="_blank"
                  rel="noopener"
                  style={{
                    color: "#111",
                    textDecoration: "none",
                    fontWeight: 500,
                    lineHeight: 1.3,
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  {listing.title}
                </a>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    fontSize: "0.85rem",
                    color: "#666",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#111" }}>
                    ${listing.priceUSD.toFixed(2)}
                  </span>
                  <span>
                    {entity.player} ({entity.yearMin}–{entity.yearMax})
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                    flexWrap: "wrap",
                  }}
                >
                  {Object.entries(reasons).map(([key, value]) => {
                    if (key === "excludeTermHit" || key === "isLot") return null;
                    if (!value) return null;
                    return (
                      <span
                        key={key}
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          background: "#dcfce7",
                          color: "#166534",
                        }}
                      >
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
