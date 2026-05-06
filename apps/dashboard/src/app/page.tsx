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

export const dynamic = "force-dynamic";

const laneLabels: Record<string, string> = {
  rookie: "Rookie Scout",
  steal: "Current Steals",
  legacy: "Legacy & Retiring",
};

const laneOrder = ["rookie", "steal", "legacy"];

const signalBadgeStyle: Record<string, { bg: string; color: string }> = {
  BUY:  { bg: "#10b981", color: "#fff" },
  HOLD: { bg: "#a78bfa", color: "#fff" },
  SELL: { bg: "#ef4444", color: "#fff" },
};

export default async function ResearchPage() {
  const actions = getResearchActions();

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

  const { data: listingCounts } = await supabase
    .from("Listing")
    .select("actionId")
    .not("actionId", "is", null);

  const countByAction: Record<string, number> = {};
  for (const row of listingCounts ?? []) {
    if (row.actionId) {
      countByAction[row.actionId] = (countByAction[row.actionId] ?? 0) + 1;
    }
  }

  const laneActions = laneOrder.map((lane) => ({
    lane,
    label: laneLabels[lane] ?? lane,
    actions: actions.filter((a) => a.lane === lane && a.signal !== "SELL"),
  }));

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
              marginBottom: "0.3rem",
            }}
          >
            Market Research
          </h2>
          {lastScanned && (
            <p
              className="mono"
              style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.04em" }}
            >
              Last scanned: {lastScanned}
            </p>
          )}
        </div>
        <ScanButton />
      </div>

      {/* Lane cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        {laneActions.map(({ lane, label, actions: laneItems }) => (
          <div
            key={lane}
            className="card-hover"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "1.1rem",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.15s ease",
            }}
          >
            {/* Lane header */}
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                marginBottom: "0.85rem",
              }}
            >
              {label}
            </div>

            {/* Players */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {laneItems.map((action) => {
                const badge = signalBadgeStyle[action.signal] ?? signalBadgeStyle["BUY"];
                const dealCount = countByAction[action.id] ?? 0;
                return (
                  <div
                    key={action.id}
                    className="row-hover"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr auto",
                      gap: "0.6rem",
                      alignItems: "flex-start",
                      padding: "0.55rem 0.6rem",
                      borderRadius: "8px",
                      background: "var(--bg-surface)",
                      animation: "fadeInUp 0.3s ease-out both",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Avatar */}
                    <PlayerAvatar name={action.player} size={28} />

                    {/* Name + reasoning */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          marginBottom: "0.2rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontWeight: 600,
                            fontSize: "0.78rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {action.player}
                        </span>
                        <span
                          style={{
                            fontSize: "0.5rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "20px",
                            background: badge.bg,
                            color: badge.color,
                            letterSpacing: "0.05em",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {action.signal}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.66rem",
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {action.reasoning}
                      </p>
                    </div>

                    {/* Deal count */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {dealCount > 0 ? (
                        <a
                          href="/buy"
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: "0.05rem",
                            textDecoration: "none",
                          }}
                        >
                          <span
                            className="mono"
                            style={{ fontSize: "0.9rem", fontWeight: 700, color: "#10b981", lineHeight: 1 }}
                          >
                            {dealCount}
                          </span>
                          <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>
                            deal{dealCount !== 1 ? "s" : ""}
                          </span>
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {laneItems.length === 0 && (
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", padding: "0.5rem 0.6rem" }}>
                  No active signals
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

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
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
        >
          <WorldCupCycleChart />
        </div>
        <div
          className="card-hover"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm)",
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
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
        >
          <AgeValueCurve />
        </div>
        <div
          className="card-hover"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
        >
          <RookieRadar />
        </div>
      </div>

      {/* PlayerDirection chart */}
      <div
        className="card-hover"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          marginBottom: "1rem",
          boxShadow: "var(--shadow-sm)",
          transition: "all 0.15s ease",
        }}
      >
        <PlayerDirectionChart />
      </div>

      {/* Scan timing */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1.25rem",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h3
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "var(--text-secondary)",
            marginBottom: "0.85rem",
            letterSpacing: "0.01em",
          }}
        >
          Best Scan Times
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "0.3rem",
                letterSpacing: "0.02em",
              }}
            >
              Tue–Thu · 10am–2pm EST
            </div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              Low competition — fewest active bidders. Best for finding mispriced BIN listings and sending low offers.
            </p>
          </div>
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "0.3rem",
                letterSpacing: "0.02em",
              }}
            >
              Sun · 6–10pm EST
            </div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              Most auctions ending — peak activity. Set snipe bids to catch deals at close.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
