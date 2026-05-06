import { getResearchActions, signalStyles } from "./research-engine";
import { PlayerAvatar } from "./player-avatar";
import ScanButton from "./scan-button";
import {
  WorldCupCycleChart,
  MarketCycleChart,
  AgeValueCurve,
  RookieRadar,
  PlayerDirectionChart,
} from "./research/charts";
import { supabase } from "@soccer-card-radar/db";
import { isQualityCard } from "./card-filter";

export const dynamic = "force-dynamic";

// ─── Price caps by lane ───────────────────────────────────────────────────────
const PRICE_CAPS: Record<string, number> = {
  rookie: 1000,
  steal: 2000,
  legacy: 5000,
};

// ─── Prediction multiplier (inline from buy/card-list.tsx) ───────────────────
interface CardForPrediction {
  lane: string;
  catalyst: string;
  timeframe: string;
}

function getPrediction(card: CardForPrediction): { multiplier: number; label: string; color: string } {
  const t = card.timeframe.toLowerCase();
  const c = card.catalyst.toLowerCase();
  const lane = card.lane;

  const hasWCCatalyst = c.includes("world cup") || c.includes("wc 2026") || c.includes("june");
  const hasTransferCatalyst = c.includes("transfer") || c.includes("buy-back") || c.includes("move");
  const hasRetirementCatalyst = c.includes("last") || c.includes("retirement") || c.includes("final");
  const hasBreakoutCatalyst =
    c.includes("breakout") || c.includes("pre-breakout") || c.includes("broke") || c.includes("record");

  if (lane === "legacy" && hasRetirementCatalyst) {
    return { multiplier: 2.0, label: "2x retirement premium", color: "#7c3aed" };
  }
  if (lane === "rookie" && hasBreakoutCatalyst && hasWCCatalyst) {
    return { multiplier: 3.0, label: "3x breakout + WC", color: "#0d9f4f" };
  }
  if (lane === "rookie" && hasWCCatalyst) {
    return { multiplier: 2.5, label: "2.5x WC hype", color: "#0d9f4f" };
  }
  if (lane === "rookie" && hasTransferCatalyst) {
    return { multiplier: 3.0, label: "3x transfer spike", color: "#0d9f4f" };
  }
  if (lane === "rookie" && hasBreakoutCatalyst) {
    return { multiplier: 2.0, label: "2x pre-breakout", color: "#0d9f4f" };
  }
  if (lane === "steal" && hasWCCatalyst) {
    return { multiplier: 1.5, label: "1.5x WC bounce", color: "#c77d15" };
  }
  if (lane === "steal") {
    return { multiplier: 1.3, label: "1.3x dip recovery", color: "#c77d15" };
  }
  if (lane === "legacy") {
    return { multiplier: 1.5, label: "1.5x legacy appreciation", color: "#7c3aed" };
  }
  if (t.includes("long-term") || t.includes("12+")) {
    return { multiplier: 2.0, label: "2x long-term", color: "#2563eb" };
  }
  return { multiplier: 1.2, label: "1.2x hold", color: "var(--text-muted)" };
}

function getTimeRemaining(endDate: string): { label: string; hours: number } {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { label: "Ended", hours: -1 };
  const hours = diff / (1000 * 60 * 60);
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, hours };
}

// ─── Deal card row ────────────────────────────────────────────────────────────
interface DealCard {
  id: string;
  title: string;
  priceUSD: number;
  url: string;
  isBIN: boolean;
  acceptsOffers: boolean;
  isAuction: boolean;
  itemEndDate: string | null;
  avgSoldPrice: number | null;
  pctBelowMarket: number | null;
  playerName: string;
  lane: string;
  catalyst: string;
  timeframe: string;
}

function DealRow({ card }: { card: DealCard }) {
  let actionLabel = "BUY NOW";
  let actionBg = "#0d9f4f";
  let borderColor = "#0d9f4f";
  let timeLabel: string | null = null;

  if (card.isAuction && card.itemEndDate) {
    const { label, hours } = getTimeRemaining(card.itemEndDate);
    if (hours < 0) return null;
    actionLabel = `AUCTION`;
    timeLabel = label;
    actionBg = "#dc2626";
    borderColor = "#dc2626";
  } else if (card.isBIN && card.acceptsOffers) {
    actionLabel = "SEND OFFER";
    actionBg = "#c77d15";
    borderColor = "#c77d15";
  }

  let suggestedOffer: number | null = null;
  if (card.isBIN && card.acceptsOffers) {
    if (card.avgSoldPrice && card.avgSoldPrice > 0) {
      suggestedOffer = Math.round(card.avgSoldPrice * 0.85);
    } else if (card.priceUSD < 50) {
      suggestedOffer = Math.round(card.priceUSD * 0.70);
    } else if (card.priceUSD < 200) {
      suggestedOffer = Math.round(card.priceUSD * 0.75);
    } else {
      suggestedOffer = Math.round(card.priceUSD * 0.80);
    }
  }

  const prediction = getPrediction(card);
  const projectedValue = Math.round(card.priceUSD * prediction.multiplier);
  const potentialROI = Math.round(((projectedValue - card.priceUSD) / card.priceUSD) * 100);

  const compsSearch = encodeURIComponent(
    card.playerName + " " + (card.title.match(/\/\d+/)?.[0] ?? "auto")
  );

  const priceFormatted =
    card.priceUSD < 1000
      ? `$${card.priceUSD.toFixed(2)}`
      : `$${card.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

  return (
    <div
      className="row-hover"
      style={{
        display: "grid",
        gridTemplateColumns: "28px 1fr auto",
        gap: "0.75rem",
        alignItems: "center",
        padding: "0.65rem 0.85rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "8px",
        boxShadow: "var(--shadow-sm)",
        transition: "background 0.15s ease",
      }}
    >
      {/* Avatar */}
      <PlayerAvatar name={card.playerName} size={24} />

      {/* Middle: player + title + prediction */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.15rem", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "0.78rem",
              color: "var(--text-primary)",
              flexShrink: 0,
            }}
          >
            {card.playerName}
          </span>
          <a
            href={card.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.72rem",
              color: "var(--text-secondary)",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textDecoration: "none",
              lineHeight: 1.3,
            }}
          >
            {card.title}
          </a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.6rem",
              fontWeight: 600,
              color: prediction.color,
            }}
          >
            {prediction.label}
          </span>
          {potentialROI > 0 && (
            <span
              className="mono"
              style={{ fontSize: "0.58rem", fontWeight: 700, color: "#0d9f4f" }}
            >
              +{potentialROI}% ROI
            </span>
          )}
          {suggestedOffer && (
            <span style={{ fontSize: "0.6rem", color: "#c77d15", fontWeight: 600 }}>
              · Offer ~${suggestedOffer}
            </span>
          )}
          <a
            href={`https://130point.com/cards/?search=${compsSearch}`}
            target="_blank"
            rel="noopener"
            style={{
              fontSize: "0.55rem",
              fontWeight: 600,
              padding: "1px 5px",
              borderRadius: "3px",
              background: "var(--bg-surface)",
              color: "#58a6ff",
              border: "1px solid var(--border)",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Comps
          </a>
        </div>
      </div>

      {/* Right: price + badge */}
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: "110px" }}>
        <div
          className="mono"
          style={{
            fontSize: "0.95rem",
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "0.2rem",
          }}
        >
          {priceFormatted}
        </div>
        {card.avgSoldPrice && card.avgSoldPrice > 0 && (
          <div
            className="mono"
            style={{ fontSize: "0.52rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}
          >
            avg ${card.avgSoldPrice.toFixed(0)}
            {card.pctBelowMarket !== null && card.pctBelowMarket > 0 && (
              <span style={{ color: "#0d9f4f", fontWeight: 700, marginLeft: "0.2rem" }}>
                {card.pctBelowMarket}% below
              </span>
            )}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.3rem" }}>
          <span
            style={{
              fontSize: "0.52rem",
              fontWeight: 700,
              padding: "3px 7px",
              borderRadius: "4px",
              background: actionBg,
              color: "#fff",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {actionLabel}
            {timeLabel && (
              <span className="mono" style={{ marginLeft: "0.3rem" }}>
                {timeLabel}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        marginBottom: "0.5rem",
        marginTop: "0.25rem",
      }}
    >
      <span
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: "0.6rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color,
        }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: "0.55rem",
          fontWeight: 700,
          color: "var(--text-muted)",
          padding: "1px 5px",
          borderRadius: "3px",
          background: "var(--bg-surface)",
        }}
      >
        {count}
      </span>
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "var(--border)",
        }}
      />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const actions = getResearchActions();

  // Research actions indexed for fast lookup
  const buyableActions = new Map(
    actions
      .filter((a) => a.signal === "BUY" || a.signal === "HOLD")
      .map((a) => [a.id, a])
  );
  const sellActions = actions.filter((a) => a.signal === "SELL");
  const sellActionIds = new Set(sellActions.map((a) => a.id));
  const buyableIds = Array.from(buyableActions.keys());

  // Fetch latest scan time
  const { data: latestListing } = await supabase
    .from("Listing")
    .select("lastSeenAt")
    .order("lastSeenAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastScanned = latestListing?.lastSeenAt
    ? new Date(latestListing.lastSeenAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      })
    : null;

  // Fetch all listings
  const { data: rawListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, rawData, actionId, avgSoldPrice, pctBelowMarket, lane")
    .order("priceUSD", { ascending: true })
    .limit(500);

  // Build deal cards — filter + match + price cap
  const allDeals: DealCard[] = (rawListings ?? [])
    .filter((l) => {
      if (!isQualityCard(l.title)) return false;
      if (!l.actionId || !buyableIds.includes(l.actionId)) return false;
      if (sellActionIds.has(l.actionId)) return false;
      const action = buyableActions.get(l.actionId);
      const cap = PRICE_CAPS[action?.lane ?? "rookie"] ?? 1000;
      if (l.priceUSD > cap) return false;
      return true;
    })
    .map((l) => {
      const action = l.actionId ? buyableActions.get(l.actionId) : undefined;
      const raw = (l.rawData ?? {}) as Record<string, unknown>;
      return {
        id: l.id,
        title: l.title,
        priceUSD: l.priceUSD,
        url: l.url,
        isBIN: raw.isBIN === true,
        acceptsOffers: raw.acceptsOffers === true,
        isAuction: raw.isAuction === true,
        itemEndDate: (raw.itemEndDate as string) ?? null,
        avgSoldPrice: l.avgSoldPrice,
        pctBelowMarket: l.pctBelowMarket,
        playerName: action?.player ?? "Unknown",
        lane: action?.lane ?? "rookie",
        catalyst: action?.catalyst ?? "",
        timeframe: action?.timeframe ?? "",
      };
    });

  // Split into sections
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  const endingSoon = allDeals
    .filter((c) => {
      if (!c.isAuction || !c.itemEndDate) return false;
      const end = new Date(c.itemEndDate).getTime();
      const diff = end - now;
      return diff > 0 && diff < DAY_MS;
    })
    .sort((a, b) => {
      const ta = new Date(a.itemEndDate!).getTime();
      const tb = new Date(b.itemEndDate!).getTime();
      return ta - tb;
    });

  const sendOffers = allDeals
    .filter((c) => c.isBIN && c.acceptsOffers && !endingSoon.includes(c))
    .sort((a, b) => a.priceUSD - b.priceUSD);

  const buyNow = allDeals
    .filter((c) => !c.isAuction && !c.acceptsOffers && !endingSoon.includes(c))
    .sort((a, b) => a.priceUSD - b.priceUSD);

  const totalDeals = endingSoon.length + sendOffers.length + buyNow.length;
  const trackedPlayers = actions.filter((a) => a.signal !== "SELL").length;

  // World Cup countdown (June 11 2026)
  const wcDate = new Date("2026-06-11T00:00:00Z");
  const wcDays = Math.ceil((wcDate.getTime() - now) / DAY_MS);

  // Prizm WC release countdown (May 22 2026)
  const prizmDate = new Date("2026-05-22T00:00:00Z");
  const prizmDays = Math.ceil((prizmDate.getTime() - now) / DAY_MS);

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
      {/* ─── Section 1: Market Pulse ──────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        {/* Left: stats row */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            <span className="mono" style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
              {trackedPlayers}
            </span>
            <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Players tracked
            </span>
          </div>
          <div style={{ width: "1px", height: "28px", background: "var(--border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            <span className="mono" style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981", lineHeight: 1 }}>
              {totalDeals}
            </span>
            <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Active deals
            </span>
          </div>
          <div style={{ width: "1px", height: "28px", background: "var(--border)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
            <span className="mono" style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3 }}>
              {lastScanned ?? "—"}
            </span>
            <span style={{ fontSize: "0.55rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Last scanned
            </span>
          </div>
        </div>

        {/* Right: scan button */}
        <ScanButton />
      </div>

      {/* Countdown line */}
      <div
        className="mono"
        style={{
          fontSize: "0.62rem",
          color: "var(--text-muted)",
          marginBottom: "1.5rem",
          letterSpacing: "0.04em",
        }}
      >
        {prizmDays > 0 && (
          <span>
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>{prizmDays}d</span>
            {" to Prizm WC release"}
          </span>
        )}
        {prizmDays > 0 && wcDays > 0 && (
          <span style={{ color: "var(--border)", margin: "0 0.6rem" }}>·</span>
        )}
        {wcDays > 0 && (
          <span>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{wcDays}d</span>
            {" to World Cup 2026"}
          </span>
        )}
      </div>

      {/* ─── Section 2: Hot Picks feed ───────────────────────────────────── */}
      {totalDeals === 0 ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "2.5rem",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            marginBottom: "1.5rem",
          }}
        >
          No deals found. Hit{" "}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>Scan Now</span> to search eBay.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.5rem" }}>
          {/* ENDING SOON */}
          {endingSoon.length > 0 && (
            <>
              <SectionHeader label="Ending Soon" count={endingSoon.length} color="#dc2626" />
              {endingSoon.map((card) => (
                <DealRow key={card.id} card={card} />
              ))}
            </>
          )}

          {/* SEND OFFERS */}
          {sendOffers.length > 0 && (
            <>
              <SectionHeader label="Send Offers" count={sendOffers.length} color="#c77d15" />
              {sendOffers.map((card) => (
                <DealRow key={card.id} card={card} />
              ))}
            </>
          )}

          {/* BUY NOW */}
          {buyNow.length > 0 && (
            <>
              <SectionHeader label="Buy Now" count={buyNow.length} color="#10b981" />
              {buyNow.map((card) => (
                <DealRow key={card.id} card={card} />
              ))}
            </>
          )}
        </div>
      )}

      {/* ─── Section 3: Avoid ────────────────────────────────────────────── */}
      {sellActions.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: "10px",
            padding: "0.85rem 1rem",
            marginBottom: "1.5rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#ef4444",
              marginBottom: "0.6rem",
            }}
          >
            Avoid
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {sellActions.map((action) => (
              <div
                key={action.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.45rem 0.6rem",
                  borderRadius: "6px",
                  background: "var(--bg-surface)",
                }}
              >
                <PlayerAvatar name={action.player} size={20} />
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "var(--text-primary)",
                    flexShrink: 0,
                  }}
                >
                  {action.player}
                </span>
                <span
                  style={{
                    fontSize: "0.48rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "#ef4444",
                    color: "#fff",
                    letterSpacing: "0.05em",
                    flexShrink: 0,
                  }}
                >
                  SELL
                </span>
                <span
                  style={{
                    fontSize: "0.62rem",
                    color: "var(--text-secondary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {action.reasoning}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Section 4: Market Intel (collapsible) ───────────────────────── */}
      <details
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <summary
          style={{
            padding: "0.85rem 1rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
            listStyle: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
              }}
            >
              Show Market Analysis
            </span>
            <span
              style={{
                fontSize: "0.55rem",
                color: "var(--text-muted)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              · 5 charts: WC cycles, market history, age curves, rookie radar, momentum
            </span>
          </div>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>▸</span>
        </summary>

        <div style={{ padding: "1rem", borderTop: "1px solid var(--border)" }}>
          {/* Charts row 1 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              className="card-hover"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.1rem",
                transition: "all 0.15s ease",
              }}
            >
              <WorldCupCycleChart />
            </div>
            <div
              className="card-hover"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.1rem",
                transition: "all 0.15s ease",
              }}
            >
              <MarketCycleChart />
            </div>
          </div>

          {/* Charts row 2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              className="card-hover"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.1rem",
                transition: "all 0.15s ease",
              }}
            >
              <AgeValueCurve />
            </div>
            <div
              className="card-hover"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.1rem",
                transition: "all 0.15s ease",
              }}
            >
              <RookieRadar />
            </div>
          </div>

          {/* Player direction chart */}
          <div
            className="card-hover"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1.1rem",
              transition: "all 0.15s ease",
            }}
          >
            <PlayerDirectionChart />
          </div>
        </div>
      </details>
    </main>
  );
}
