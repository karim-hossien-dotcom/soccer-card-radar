import ScoutPage from "../scout-page";

export const dynamic = "force-dynamic";

export default function LegendsPage() {
  return (
    <ScoutPage
      title="Legends"
      intro="The greats at their last World Cup. A scarcity window that won't come round again."
      pick={(a) => a.lane === "legacy"}
      tierFor="legends"
      avoidLane="legacy"
    />
  );
}
