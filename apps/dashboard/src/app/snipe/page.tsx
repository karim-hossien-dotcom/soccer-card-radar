import { loadSnipe } from "./load";
import { scanStatus } from "../deal-rows";
import Freshness from "../freshness";
import SnipeView from "./snipe-view";

export const dynamic = "force-dynamic";

export default async function SnipePage() {
  try {
    const [data, status] = await Promise.all([loadSnipe(), scanStatus()]);
    return (
      <>
        <header className="page-head">
          <h1>Snipe</h1>
          <p>Cards worth bidding on, ranked by what the card is worth graded, how cheap it is right now, how rare it is, and how the player is doing. Max bid keeps PSA 9 at 2x and PSA 10 at 4x your cost, and never goes above the raw price for a raw card. Slab targets set their own max.</p>
        </header>
        <Freshness listingsAt={status.listingsAt} />
        <SnipeView {...data} />
      </>
    );
  } catch (e) {
    return <p className="notice">Couldn&apos;t load the snipe board: {(e as Error).message}</p>;
  }
}
