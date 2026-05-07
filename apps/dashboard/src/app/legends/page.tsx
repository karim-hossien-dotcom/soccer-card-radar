import { getResearchActions } from "../research-engine";
import { fetchAllDeals, predict } from "../fetch-deals";
import { assignTier, type PitchPlayerData } from "../helpers";
import PitchView from "../pitch-view";
import AvoidSection from "../avoid-section";

export const dynamic = "force-dynamic";

const POSITIONS = [
  { x: 50, y: 15 },  // ST — top center
  { x: 22, y: 35 },  // LW — left wing
  { x: 78, y: 35 },  // RW — right wing
  { x: 30, y: 60 },  // LM — left mid
  { x: 70, y: 60 },  // RM — right mid
];

export default async function LegendsPage() {
  const actions = getResearchActions();
  const dealsByPlayer = await fetchAllDeals();

  // Filter: legacy lane only
  const legendActions = actions.filter((a) => a.lane === "legacy");

  const ranked = legendActions
    .filter((a) => dealsByPlayer.has(a.player))
    .sort((a, b) => (dealsByPlayer.get(b.player)?.deals.length ?? 0) - (dealsByPlayer.get(a.player)?.deals.length ?? 0));

  const withoutDeals = legendActions.filter((a) => !dealsByPlayer.has(a.player));
  const all = [...ranked, ...withoutDeals].slice(0, 5);

  const players: PitchPlayerData[] = all.map((action, i) => {
    const pd = dealsByPlayer.get(action.player);
    return {
      name: action.player,
      tier: assignTier(action.signal, action.lane, action.catalyst, "legends"),
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
          style={{ fontSize: 13, letterSpacing: "0.1em", color: "var(--gold)", marginBottom: 4 }}
        >
          LEGENDS
        </h2>
        <p className="mono" style={{ fontSize: 11, color: "var(--text-3)" }}>
          GOATs at their last World Cup — generational scarcity window
        </p>
      </div>

      <PitchView players={players} />

      <AvoidSection actions={actions} lane="legacy" />

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
          <p><strong style={{ color: "var(--text-2)" }}>World Cup</strong> Jun 11 – Jul 19 — buy now, sell into peak euphoria</p>
          <p><strong style={{ color: "var(--text-2)" }}>Legacy hold</strong> — post-career retirement narrative sustains 5–10yr appreciation</p>
        </div>
      </details>
    </>
  );
}
