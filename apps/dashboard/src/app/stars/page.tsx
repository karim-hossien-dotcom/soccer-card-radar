import { getResearchActions } from "../research-engine";
import { fetchAllDeals, predict } from "../fetch-deals";
import { assignTier, type PitchPlayerData } from "../helpers";
import PitchView from "../pitch-view";

export const dynamic = "force-dynamic";

const POSITIONS = [
  { x: 50, y: 15 },  // ST — top center
  { x: 22, y: 35 },  // LW — left wing
  { x: 78, y: 35 },  // RW — right wing
  { x: 30, y: 60 },  // LM — left mid
  { x: 70, y: 60 },  // RM — right mid
];

export default async function StarsPage() {
  const actions = getResearchActions();
  const dealsByPlayer = await fetchAllDeals();

  const sellActions = actions.filter((a) => a.signal === "SELL");

  // Filter: steal lane, OR rookie with HOLD signal
  const starsActions = actions.filter(
    (a) => a.lane === "steal" || (a.lane === "rookie" && a.signal === "HOLD")
  );

  const ranked = starsActions
    .filter((a) => dealsByPlayer.has(a.player))
    .sort((a, b) => (dealsByPlayer.get(b.player)?.deals.length ?? 0) - (dealsByPlayer.get(a.player)?.deals.length ?? 0));

  const withoutDeals = starsActions.filter((a) => !dealsByPlayer.has(a.player));
  const all = [...ranked, ...withoutDeals].slice(0, 5);

  const players: PitchPlayerData[] = all.map((action, i) => {
    const pd = dealsByPlayer.get(action.player);
    return {
      name: action.player,
      tier: assignTier(action.signal, action.lane, action.catalyst, "stars"),
      prediction: predict(action.lane, action.catalyst),
      position: POSITIONS[i] ?? { x: 50, y: 50 },
      deals: pd?.deals ?? [],
    };
  });

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2
          className="bebas"
          style={{ fontSize: 13, letterSpacing: "0.1em", color: "#3b82f6", marginBottom: 4 }}
        >
          CURRENT STARS
        </h2>
        <p className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
          Established players at dip prices — asymmetric risk/reward
        </p>
      </div>

      <PitchView players={players} />

      {/* AVOID section */}
      {sellActions.length > 0 && (
        <section style={{ marginTop: 28, marginBottom: 24 }}>
          <h2
            className="bebas"
            style={{ fontSize: 13, letterSpacing: "0.1em", color: "var(--red)", marginBottom: 10 }}
          >
            AVOID
          </h2>
          <div style={{
            background: "var(--surface)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 12,
            padding: "12px 16px",
          }}>
            {sellActions.map((a) => (
              <div
                key={a.id}
                style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0" }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100,
                  background: "rgba(239,68,68,0.15)", color: "var(--red)",
                  fontFamily: "'JetBrains Mono', monospace",
                  whiteSpace: "nowrap",
                }}>
                  SELL
                </span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{a.player}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.reasoning.slice(0, 55)}…
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Market notes */}
      <details style={{ marginTop: 8 }}>
        <summary style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-3)",
          cursor: "pointer",
          padding: "8px 0",
          letterSpacing: "0.08em",
        }}>
          MARKET NOTES
        </summary>
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 16,
          marginTop: 8,
          fontSize: 12,
          color: "var(--text-3)",
          lineHeight: 1.8,
        }}>
          <p><strong style={{ color: "var(--text-2)" }}>Prizm WC</strong> drops May 22 — older WC prices dip</p>
          <p><strong style={{ color: "var(--text-2)" }}>World Cup</strong> Jun 11 – Jul 19 — buy now, sell group stage</p>
          <p><strong style={{ color: "var(--text-2)" }}>Scan times</strong> — Tue-Thu 10am EST (low comp) · Sun 6pm (auctions)</p>
        </div>
      </details>
    </>
  );
}
