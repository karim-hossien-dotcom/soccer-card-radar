import { getResearchActions, signalStyles } from "../research-engine";
import { PlayerAvatar } from "../player-avatar";
import { isQualityCard } from "../card-filter";
import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

type RawData = {
  isBIN?: boolean;
  acceptsOffers?: boolean;
  isAuction?: boolean;
  itemEndDate?: string;
};

function getTimeRemaining(endDate: string): { label: string; hours: number } {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return { label: "Ended", hours: -1 };
  const hours = diffMs / (1000 * 60 * 60);
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  if (h >= 24) {
    const days = Math.floor(h / 24);
    return { label: `${days}d ${h % 24}h`, hours };
  }
  return { label: `${h}h ${m}m`, hours };
}

type SortGroup = 0 | 1 | 2 | 3 | 4;

function getSortGroup(raw: RawData, endDate: string | null): SortGroup {
  if (raw.isAuction && endDate) {
    const { hours } = getTimeRemaining(endDate);
    if (hours < 0) return 4; // ended — hide
    if (hours <= 6) return 0;
    if (hours <= 24) return 1;
    if (hours >= 48) return 4; // too far out — hide
    return 1;
  }
  if (raw.isBIN && raw.acceptsOffers) return 2;
  if (raw.isBIN) return 3;
  return 3;
}

export default async function BuyPage() {
  const actions = getResearchActions();

  // Build a map of BUY and HOLD signal actions by id
  const buyableActions = new Map(
    actions
      .filter((a) => (a.signal === "BUY" || a.signal === "HOLD") && a.lane !== undefined)
      .map((a) => [a.id, a])
  );

  // Fetch all listings — filter by actionId client-side since some may be null
  const buyableIds = Array.from(buyableActions.keys());
  const { data: rawListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, rawData, actionId, avgSoldPrice, pctBelowMarket, lane")
    .order("priceUSD", { ascending: true })
    .limit(500);

  // Filter by quality and exclude SELL-signal players' listings
  const sellActionIds = new Set(
    actions.filter((a) => a.signal === "SELL").map((a) => a.id)
  );

  const filtered = (rawListings ?? []).filter((listing) => {
    if (!isQualityCard(listing.title)) return false;
    if (listing.actionId && sellActionIds.has(listing.actionId)) return false;
    // Must be associated with a buyable action
    if (!listing.actionId || !buyableIds.includes(listing.actionId)) return false;
    return true;
  });

  // Annotate each listing with sort group
  const annotated = filtered.map((listing) => {
    const raw = (listing.rawData ?? {}) as RawData;
    const endDate = (raw.itemEndDate as string | undefined) ?? null;
    const group = getSortGroup(raw, endDate);
    const action = listing.actionId ? buyableActions.get(listing.actionId) : undefined;
    return { ...listing, raw, endDate, group, action };
  });

  // Remove hidden (group 4)
  const visible = annotated.filter((l) => l.group !== 4);

  // Sort: by group asc, then by price asc within group (auctions by time remaining)
  const sorted = [...visible].sort((a, b) => {
    if (a.group !== b.group) return a.group - b.group;
    // Auctions in groups 0 and 1: sort by time remaining (soonest first)
    if ((a.group === 0 || a.group === 1) && a.endDate && b.endDate) {
      return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
    }
    return a.priceUSD - b.priceUSD;
  });

  // Group section labels
  const groupLabels: Record<number, string> = {
    0: "Auctions ending within 6 hours",
    1: "Auctions ending within 24 hours",
    2: "Buy It Now — send offer",
    3: "Buy It Now — fixed price",
  };

  const groupOrder: SortGroup[] = [0, 1, 2, 3];
  const byGroup = groupOrder.map((g) => ({
    group: g,
    label: groupLabels[g],
    items: sorted.filter((l) => l.group === g),
  })).filter((g) => g.items.length > 0);

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 3rem", position: "relative", zIndex: 1 }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Buy Deals</h2>
        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
          {sorted.length} card{sorted.length !== 1 ? "s" : ""} below market — sorted by urgency
        </p>
      </div>

      {sorted.length === 0 && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "2rem", textAlign: "center",
          boxShadow: "var(--shadow-sm)", color: "var(--text-muted)", fontSize: "0.85rem",
        }}>
          No deals found right now. Run a scan to find new listings.
        </div>
      )}

      {byGroup.map(({ group, label, items }) => (
        <div key={group} style={{ marginBottom: "1.5rem" }}>
          <h3 style={{
            fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "var(--text-muted)",
            marginBottom: "0.6rem",
          }}>
            {label} <span style={{ fontWeight: 500 }}>({items.length})</span>
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {items.map((listing) => {
              const { raw, endDate, action } = listing;
              const isAuction = raw.isAuction === true;
              const isBIN = raw.isBIN === true;
              const acceptsOffers = raw.acceptsOffers === true;
              const signal = action?.signal ?? "BUY";
              const sStyle = signalStyles[signal];

              // Action badge
              let actionLabel = "BUY NOW";
              let actionBg = "var(--buy-now)";
              let actionColor = "#fff";
              if (isAuction && endDate) {
                const { label: timeLabel } = getTimeRemaining(endDate);
                actionLabel = `AUCTION ${timeLabel}`;
                actionBg = "#dc2626";
                actionColor = "#fff";
              } else if (isBIN && acceptsOffers) {
                actionLabel = "SEND OFFER";
                actionBg = "#c77d15";
                actionColor = "#fff";
              } else if (isBIN) {
                actionLabel = "BUY NOW";
                actionBg = "var(--buy-now)";
                actionColor = "#fff";
              }

              // Below market calculation
              const hasMarket = typeof listing.avgSoldPrice === "number" && listing.avgSoldPrice > 0;
              const pctBelow = hasMarket
                ? Math.round(((listing.avgSoldPrice! - listing.priceUSD) / listing.avgSoldPrice!) * 100)
                : null;

              return (
                <a
                  key={listing.id}
                  href={listing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "0.75rem",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    textDecoration: "none",
                    color: "inherit",
                    boxShadow: "var(--shadow-sm)",
                    transition: "box-shadow 0.15s ease, transform 0.15s ease",
                  }}
                >
                  {/* Left: signal badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", minWidth: "48px" }}>
                    <span style={{
                      fontSize: "0.5rem", fontWeight: 700, padding: "2px 6px",
                      borderRadius: "4px", background: sStyle.bg, color: sStyle.color,
                      whiteSpace: "nowrap",
                    }}>
                      {signal}
                    </span>
                    {listing.imageUrl && (
                      <img
                        src={listing.imageUrl}
                        alt=""
                        style={{ width: "40px", height: "50px", objectFit: "contain", borderRadius: "4px" }}
                      />
                    )}
                  </div>

                  {/* Middle: player + title + why */}
                  <div style={{ minWidth: 0 }}>
                    {action && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.25rem" }}>
                        <PlayerAvatar name={action.player} size={22} />
                        <span style={{ fontWeight: 700, fontSize: "0.8rem" }}>{action.player}</span>
                      </div>
                    )}
                    <div style={{ fontSize: "0.72rem", fontWeight: 500, marginBottom: "0.2rem", lineHeight: 1.35, color: "var(--text-primary)" }}>
                      {listing.title}
                    </div>
                    {action && (
                      <div style={{ fontSize: "0.62rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        <span style={{ fontStyle: "italic" }}>{action.reasoning}</span>
                        <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                          {action.catalyst} &middot; {action.timeframe}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: price + action */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.25rem" }}>
                      ${listing.priceUSD.toFixed(2)}
                    </div>
                    {hasMarket && pctBelow !== null && pctBelow > 0 && (
                      <div style={{ fontSize: "0.6rem", color: "var(--buy-now)", fontWeight: 600, marginBottom: "0.25rem" }}>
                        vs avg ${listing.avgSoldPrice!.toFixed(0)} &middot; {pctBelow}% below
                      </div>
                    )}
                    <span style={{
                      fontSize: "0.55rem", fontWeight: 700, padding: "3px 8px",
                      borderRadius: "4px", background: actionBg, color: actionColor,
                      whiteSpace: "nowrap",
                    }}>
                      {actionLabel}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </main>
  );
}
