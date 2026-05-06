import { getResearchActions, signalStyles } from "../research-engine";
import { PlayerAvatar } from "../player-avatar";
import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const actions = getResearchActions();
  const sellActions = actions.filter((a) => a.signal === "SELL");
  const sellActionIds = sellActions.map((a) => a.id);

  const { data: sellListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, rawData, actionId, avgSoldPrice, pctBelowMarket")
    .in("actionId", sellActionIds)
    .is("soldAt", null)
    .order("priceUSD", { ascending: false })
    .limit(200);

  const { data: overpricedListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, rawData, actionId, avgSoldPrice, pctBelowMarket")
    .lt("pctBelowMarket", -25)
    .is("soldAt", null)
    .order("pctBelowMarket", { ascending: true })
    .limit(50);

  const listingsByAction: Record<string, typeof sellListings> = {};
  for (const listing of sellListings ?? []) {
    if (!listing.actionId) continue;
    if (!listingsByAction[listing.actionId]) listingsByAction[listing.actionId] = [];
    listingsByAction[listing.actionId]!.push(listing);
  }

  const sStyle = signalStyles["SELL"];

  const overpricedFiltered = (overpricedListings ?? []).filter(
    (l) => !l.actionId || !sellActionIds.includes(l.actionId)
  );

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 1.5rem 3rem",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.3rem" }}>
          <h2
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Sell
          </h2>
          <span
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#ef4444",
            }}
          >
            / Avoid
          </span>
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          Cards to avoid buying or sell if you own them
        </p>
      </div>

      {/* SELL-signal player cards */}
      {sellActions.map((action) => {
        const playerListings = listingsByAction[action.id] ?? [];
        return (
          <div
            key={action.id}
            className="card-hover"
            style={{
              background: "var(--bg-card)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1rem",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.15s ease",
            }}
          >
            {/* Player header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                marginBottom: playerListings.length > 0 ? "0.85rem" : "0",
              }}
            >
              <PlayerAvatar name={action.player} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.3rem",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.92rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    {action.player}
                  </span>
                  <span
                    style={{
                      fontSize: "0.5rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "20px",
                      background: "#ef4444",
                      color: "#fff",
                      letterSpacing: "0.06em",
                    }}
                  >
                    SELL
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.55,
                    marginBottom: "0.25rem",
                  }}
                >
                  {action.reasoning}
                </p>
                <p style={{ fontSize: "0.63rem", color: "var(--text-muted)" }}>
                  <span style={{ fontWeight: 600 }}>{action.catalyst}</span>
                  {" · "}
                  <span style={{ fontStyle: "italic" }}>{action.timeframe}</span>
                </p>
              </div>
            </div>

            {/* Listings */}
            {playerListings.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                    marginBottom: "0.45rem",
                    fontFamily: "'Sora', sans-serif",
                  }}
                >
                  Active listings ({playerListings.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  {playerListings.map((listing) => {
                    const raw = (listing.rawData ?? {}) as {
                      isBIN?: boolean;
                      acceptsOffers?: boolean;
                      isAuction?: boolean;
                    };
                    const isBIN = raw.isBIN === true;
                    const acceptsOffers = raw.acceptsOffers === true;
                    const isAuction = raw.isAuction === true;

                    const typeLabel = isAuction
                      ? "AUCTION"
                      : acceptsOffers
                      ? "OFFER OK"
                      : isBIN
                      ? "BIN"
                      : "LISTING";
                    const typeBg = isAuction
                      ? "rgba(239,68,68,0.1)"
                      : acceptsOffers
                      ? "rgba(245,158,11,0.1)"
                      : "rgba(72,79,88,0.15)";
                    const typeColor = isAuction ? "#ef4444" : acceptsOffers ? "#f59e0b" : "#8b949e";

                    return (
                      <a
                        key={listing.id}
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-hover"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: "0.75rem",
                          alignItems: "center",
                          padding: "0.5rem 0.7rem",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          textDecoration: "none",
                          color: "inherit",
                          fontSize: "0.73rem",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {listing.title}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
                          <span className="mono" style={{ fontWeight: 700, fontSize: "0.78rem" }}>
                            ${listing.priceUSD.toFixed(2)}
                          </span>
                          <span
                            style={{
                              fontSize: "0.5rem",
                              fontWeight: 700,
                              padding: "2px 5px",
                              borderRadius: "4px",
                              background: typeBg,
                              color: typeColor,
                              letterSpacing: "0.04em",
                            }}
                          >
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
              <div style={{ fontSize: "0.63rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                No active listings found. Run a scan to check current prices.
              </div>
            )}
          </div>
        );
      })}

      {/* Overpriced section */}
      {overpricedFiltered.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(239,68,68,0.15)",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#ef4444",
              marginBottom: "0.25rem",
            }}
          >
            Overpriced Listings
          </h3>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "0.85rem" }}>
            These cards are listed 25%+ above recent market prices — avoid paying full ask.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {overpricedFiltered.map((listing) => {
              const pct = listing.pctBelowMarket ?? 0;
              const pctAbove = Math.abs(pct);
              return (
                <a
                  key={listing.id}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-hover"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "0.75rem",
                    alignItems: "center",
                    padding: "0.5rem 0.7rem",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    textDecoration: "none",
                    color: "inherit",
                    fontSize: "0.73rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {listing.title}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: "0.78rem" }}>
                      ${listing.priceUSD.toFixed(2)}
                    </span>
                    {listing.avgSoldPrice && (
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
                        avg ${listing.avgSoldPrice.toFixed(0)}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "0.5rem",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "rgba(239,68,68,0.12)",
                        color: "#ef4444",
                        letterSpacing: "0.04em",
                      }}
                    >
                      +{pctAbove}% ABOVE
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sellActions.length === 0 && overpricedFiltered.length === 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "2.5rem",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
          }}
        >
          No sell signals or overpriced cards detected right now.
        </div>
      )}
    </main>
  );
}
