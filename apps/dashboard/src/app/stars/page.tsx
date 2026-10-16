import ScoutPage from "../scout-page";

export const dynamic = "force-dynamic";

export default function StarsPage() {
  return (
    <ScoutPage
      title="Stars"
      intro="Established players at dip prices, where the downside is smaller than the upside."
      pick={(a) => a.lane === "steal" || (a.lane === "rookie" && a.signal === "HOLD")}
      tierFor="stars"
      avoidLane="steal"
    />
  );
}
