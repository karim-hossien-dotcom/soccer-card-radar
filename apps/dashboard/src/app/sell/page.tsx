import { getResearchActions, signalStyles } from "../research-engine";
import { PlayerAvatar } from "../player-avatar";
import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const actions = getResearchActions();
  const sellActions = actions.filter((a) => a.signal === "SELL");
  const sellActionIds = sellActions.map((a) => a.id);

  // Fetch listings for SELL-signal players
  const { data: sellListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, rawData, actionId, avgSoldPrice, pctBelowMarket")
    .in("actionId", sellActionIds)
    .is("soldAt", null)
    .order("priceUSD", { ascending: false })
    .limit(200);

  // Fetch overpriced listings: pctBelowMarket < -25 (i.e., 25%+ ABOVE market)
  const { data: overpricedListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, rawData, actionId, avgSoldPrice, pctBelowMarket")
    .lt("pctBelowMarket", -25)
    .is("soldAt", null)
    .order("pctBelowMarket", { ascending: true })
    .limit(50);

  // Group sell listings by actionId
  const listingsByAction: Record<string, typeof sellListings> = {};
  for (const listing of sellListings ?? []) {
    if (!listing.actionId) continue;
    if (!listingsByAction[listing.actionId]) listingsByAction[listing.actionId] = [];
    listingsByAction[listing.actionId]!.push(listing);
  }

  const sStyle = signalStyles["SELL"];

  // Filter overpriced to exclude ones already shown in sell section
  const overpricedFiltered = (overpricedListings ?? []).filter(
    (l) => !l.actionId || !sellActionIds.includes(l.actionId)
  );

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 3rem", position: "relative", zIndex: 1 }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>
          Sell / Avoid
        </h2>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          Cards to avoid buying or sell if you own them
        </p>
      </div>

      {/* SELL-signal players */}
      {sellActions.map((action) => {
        const playerListings = listingsByAction[action.id] ?? [];
        return (
          <div
            key={action.id}
            style={{
              background: "var(--bg-card)",
              border: "1px solid #dc262620",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1.25rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Player header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <PlayerAvatar name={action.player} size={48} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{action.player}</span>
                  <span style={{
                    fontSize: "0.55rem", fontWeight: 700, padding: "2px 8px",
                    borderRadius: "4px", background: sStyle.bg, color: sStyle.color,
                  }}>
                    SELL
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "0.25rem" }}>
                  {action.reasoning}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                  <span style={{ fontWeight: 600 }}>{action.catalyst}</span>
                  {" · "}
                  <span style={{ fontStyle: "italic" }}>{action.timeframe}</span>
                </p>
              </div>
            </div>

            {/* Player's listings */}
            {playerListings.length > 0 && (
              <div style={{ marginTop: "0.75rem" }}>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: "0.4rem",
                }}>
                  Active listings ({playerListings.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {playerListings.map((listing) => {
                    const raw = (listing.rawData ?? {}) as { isBIN?: boolean; acceptsOffers?: boolean; isAuction?: boolean };
                    const isBIN = raw.isBIN === true;
                    const acceptsOffers = raw.acceptsOffers === true;
                    const isAuction = raw.isAuction === true;

                    const typeLabel = isAuction ? "AUCTION" : acceptsOffers ? "OFFER OK" : isBIN ? "BIN" : "LISTING";
                    const typeBg = isAuction ? "#dc262612" : acceptsOffers ? "#c77d1512" : "#9b9bab12";
                    const typeColor = isAuction ? "#dc2626" : acceptsOffers ? "#c77d15" : "#9b9bab";

                    return (
                      <a
                        key={listing.id}
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "0.75rem",
                          alignItems: "center",
                          padding: "0.5rem 0.75rem",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color: "inherit",
                          fontSize: "0.75rem",
                        }}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {listing.title}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                          <span className="mono" style={{ fontWeight: 700 }}>${listing.priceUSD.toFixed(2)}</span>
                          <span style={{
                            fontSize: "0.5rem", fontWeight: 700, padding: "2px 5px",
                            borderRadius: "3px", background: typeBg, color: typeColor,
                          }}>
                            {typeLabel}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {playerListings.length === 0 && (
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                No active listings found. Run a scan to check current prices.
              </div>
            )}
          </div>
        );
      })}

      {/* Overpriced section */}
      {overpricedFiltered.length > 0 && (
        <div style={{
          background: "var(--bg-card)",
          border: "1px solid #dc262620",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1.25rem",
          boxShadow: "var(--shadow-sm)",
        }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem", color: "#dc2626" }}>
            Overpriced Listings
          </h3>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            These cards are listed 25%+ above recent market prices — avoid paying full ask.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {overpricedFiltered.map((listing) => {
              const pct = listing.pctBelowMarket ?? 0;
              const pctAbove = Math.abs(pct);
              return (
                <a
                  key={listing.id}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0.75rem",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    textDecoration: "none",
                    color: "inherit",
                    fontSize: "0.75rem",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {listing.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    <span className="mono" style={{ fontWeight: 700 }}>${listing.priceUSD.toFixed(2)}</span>
                    {listing.avgSoldPrice && (
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                        avg ${listing.avgSoldPrice.toFixed(0)}
                      </span>
                    )}
                    <span style={{
                      fontSize: "0.5rem", fontWeight: 700, padding: "2px 5px",
                      borderRadius: "3px", background: "#dc262615", color: "#dc2626",
                    }}>
                      +{pctAbove}% ABOVE
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {sellActions.length === 0 && overpricedFiltered.length === 0 && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "2rem", textAlign: "center",
          boxShadow: "var(--shadow-sm)", color: "var(--text-muted)", fontSize: "0.85rem",
        }}>
          No sell signals or overpriced cards detected right now.
        </div>
      )}
    </main>
  );
}
