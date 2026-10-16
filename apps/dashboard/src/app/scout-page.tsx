import { getResearchActions, type ResearchAction, type Lane } from "./research-engine";
import { fetchAllDeals } from "./fetch-deals";
import { scanStatus } from "./deal-rows";
import Freshness from "./freshness";
import { assignTier, statsLabel, type PitchPlayerData } from "./helpers";
import PitchView from "./pitch-view";
import AvoidSection from "./avoid-section";

const POSITIONS = [
  { x: 50, y: 15 },  // ST — top center
  { x: 22, y: 35 },  // LW — left wing
  { x: 78, y: 35 },  // RW — right wing
  { x: 30, y: 60 },  // LM — left mid
  { x: 70, y: 60 },  // RM — right mid
];

/** Shared body of the Rookies / Stars / Legends pages: top 5 players by live deal count on the pitch. */
export default async function ScoutPage({ title, intro, pick, tierFor, avoidLane }: {
  title: string;
  intro: string;
  pick: (a: ResearchAction) => boolean;
  tierFor: "rookie" | "stars" | "legends";
  avoidLane: Lane;
}) {
  const actions = getResearchActions();
  const [dealsByPlayer, status] = await Promise.all([fetchAllDeals(), scanStatus()]);
  const lane = actions.filter(pick);
  const dealCount = (a: ResearchAction) => dealsByPlayer.get(a.player)?.deals.length ?? 0;
  const ranked = lane.filter((a) => dealsByPlayer.has(a.player)).sort((a, b) => dealCount(b) - dealCount(a));
  const all = [...ranked, ...lane.filter((a) => !dealsByPlayer.has(a.player))].slice(0, 5);

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
      tier: assignTier(action.signal, action.lane, action.catalyst, tierFor),
      prediction: statsLabel(stats, action.lane, action.catalyst),
      position: POSITIONS[i] ?? { x: 50, y: 50 },
      deals: pd?.deals ?? [],
      stats,
    };
  });

  return (
    <>
      <header className="page-head">
        <h1>{title}</h1>
        <p>{intro}</p>
      </header>
      <Freshness listingsAt={status.listingsAt} />
      <PitchView players={players} />
      <AvoidSection actions={actions} lane={avoidLane} />
      <details className="notes">
        <summary>Market notes</summary>
        <div>
          <p><strong>Prizm WC</strong> drops May 22: older WC prices dip.</p>
          <p><strong>World Cup</strong> Jun 11 – Jul 19: buy now, sell in the group stage.</p>
          <p><strong>Scan times</strong> Tue–Thu 10am EST (low competition), Sun 6pm (auctions).</p>
        </div>
      </details>
    </>
  );
}
