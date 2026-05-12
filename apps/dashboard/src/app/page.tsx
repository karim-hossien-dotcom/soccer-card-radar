import { getResearchActions } from "./research-engine";
import { fetchAllDeals, predict } from "./fetch-deals";
import { assignTier, statsLabel, type PitchPlayerData } from "./helpers";
import PitchView from "./pitch-view";
import AvoidSection from "./avoid-section";

export const dynamic = "force-dynamic";

const POSITIONS = [
  { x: 50, y: 15 },  // ST — top center
  { x: 22, y: 35 },  // LW — left wing
  { x: 78, y: 35 },  // RW — right wing
  { x: 30, y: 60 },  // LM — left mid
  { x: 70, y: 60 },  // RM — right mid
];

export default async function RookiesPage() {
  const actions = getResearchActions();
  const dealsByPlayer = await fetchAllDeals();

  // Filter: rookie BUY players, ranked by deal count
  const rookieActions = actions.filter((a) => a.lane === "rookie" && (a.signal === "BUY" || a.signal === "HOLD"));

  const ranked = rookieActions
    .filter((a) => dealsByPlayer.has(a.player))
    .sort((a, b) => (dealsByPlayer.get(b.player)?.deals.length ?? 0) - (dealsByPlayer.get(a.player)?.deals.length ?? 0));

  // Pad with players that have no deals (show them without deals)
  const withoutDeals = rookieActions.filter((a) => !dealsByPlayer.has(a.player));
  const all = [...ranked, ...withoutDeals].slice(0, 5);

  const players: PitchPlayerData[] = all.map((action, i) => {
    const pd = dealsByPlayer.get(action.player);
    const stats = pd?.stats
      ? {
          sample_size: pd.stats.sample_size,
          median: pd.stats.median,
          last_5_avg: pd.stats.last_5_avg,
          trend_7d_pct: pd.stats.trend_7d_pct,
          trend_30d_pct: pd.stats.trend_30d_pct,
          fair_value_mid: pd.stats.fair_value_mid,
          scraped_at: pd.stats.scraped_at,
        }
      : null;
    return {
      name: action.player,
      tier: assignTier(action.signal, action.lane, action.catalyst, "rookie"),
      prediction: statsLabel(stats, action.lane, action.catalyst),
      position: POSITIONS[i] ?? { x: 50, y: 50 },
      deals: pd?.deals ?? [],
      stats,
    };
  });

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h2
          className="bebas"
          style={{ fontSize: 13, letterSpacing: "0.1em", color: "var(--green)", marginBottom: 4 }}
        >
          ROOKIE SCOUT
        </h2>
        <p className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
          Early entries — buy before the market catches on
        </p>
      </div>

      <PitchView players={players} />

      <AvoidSection actions={actions} lane="rookie" />

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
