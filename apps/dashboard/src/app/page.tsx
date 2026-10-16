import ScoutPage from "./scout-page";

export const dynamic = "force-dynamic";

export default function RookiesPage() {
  return (
    <ScoutPage
      title="Rookies"
      intro="Early entries. Buy before the market catches on."
      pick={(a) => a.lane === "rookie" && (a.signal === "BUY" || a.signal === "HOLD")}
      tierFor="rookie"
      avoidLane="rookie"
    />
  );
}
