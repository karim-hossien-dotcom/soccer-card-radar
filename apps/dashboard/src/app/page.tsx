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

export default async function ResearchPage() {
  const actions = getResearchActions();

  // Fetch last scan time from most recent listing
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

  // Fetch listing counts per action
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

  // Group actions by lane — only show non-SELL actions in lanes
  const laneActions = laneOrder.map((lane) => ({
    lane,
    label: laneLabels[lane] ?? lane,
    actions: actions.filter((a) => a.lane === lane && a.signal !== "SELL"),
  }));

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 3rem", position: "relative", zIndex: 1 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Research Agent</h2>
          {lastScanned && (
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Last scanned: {lastScanned}
            </p>
          )}
        </div>
        <ScanButton />
      </div>

      {/* Lane sections */}
      {laneActions.map(({ lane, label, actions: laneItems }) => (
        <div
          key={lane}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "1.25rem",
            marginBottom: "1.25rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3 style={{
            fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "0.75rem",
          }}>
            {label}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {laneItems.map((action) => {
              const sStyle = signalStyles[action.signal];
              const dealCount = countByAction[action.id] ?? 0;
              return (
                <div
                  key={action.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                    padding: "0.65rem 0.75rem",
                    borderRadius: "8px",
                    background: "var(--bg-surface)",
                    animation: "fadeInUp 0.3s ease-out both",
                  }}
                >
                  {/* Avatar */}
                  <PlayerAvatar name={action.player} size={40} />

                  {/* Middle: name, reasoning, catalyst */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{action.player}</span>
                      <span style={{
                        fontSize: "0.55rem", fontWeight: 700, padding: "2px 7px",
                        borderRadius: "4px", background: sStyle.bg, color: sStyle.color,
                      }}>
                        {action.signal}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: "0.25rem" }}>
                      {action.reasoning}
                    </p>
                    <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      <span style={{ fontWeight: 600 }}>{action.catalyst}</span>
                      {" · "}
                      <span style={{ fontStyle: "italic" }}>{action.timeframe}</span>
                    </p>
                  </div>

                  {/* Right: deal count */}
                  <div style={{ textAlign: "right", flexShrink: 0, paddingTop: "0.1rem" }}>
                    {dealCount > 0 ? (
                      <a
                        href="/buy"
                        style={{
                          fontSize: "0.6rem", fontWeight: 700,
                          color: "var(--buy-now)", textDecoration: "none",
                          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.1rem",
                        }}
                      >
                        <span style={{ fontSize: "1rem", lineHeight: 1 }}>{dealCount}</span>
                        <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>deal{dealCount !== 1 ? "s" : ""}</span>
                      </a>
                    ) : (
                      <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>no deals</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)" }}>
          <WorldCupCycleChart />
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)" }}>
          <MarketCycleChart />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)" }}>
          <AgeValueCurve />
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)" }}>
          <RookieRadar />
        </div>
      </div>

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem", marginBottom: "1.25rem", boxShadow: "var(--shadow-sm)" }}>
        <PlayerDirectionChart />
      </div>

      {/* Scan timing info */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem" }}>Best Scan Times</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div style={{ padding: "0.6rem", borderRadius: "8px", background: "var(--bg-surface)" }}>
            <div className="mono" style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.2rem" }}>
              Tue–Thu 10am–2pm EST
            </div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Low competition — fewest active bidders. Best for finding mispriced BIN listings and sending low offers.
            </p>
          </div>
          <div style={{ padding: "0.6rem", borderRadius: "8px", background: "var(--bg-surface)" }}>
            <div className="mono" style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.2rem" }}>
              Sun 6–10pm EST
            </div>
            <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Most auctions ending — peak activity. Set snipe bids to catch deals at close.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
