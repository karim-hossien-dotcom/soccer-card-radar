import { loadSnipe } from "./load";
import { scanStatus } from "../deal-rows";
import Freshness from "../freshness";
import SnipeView from "./snipe-view";

export const dynamic = "force-dynamic";

export default async function SnipePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const sp = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : undefined);
  const n = (k: string) => (sp(k) && Number.isFinite(Number(sp(k))) ? Number(sp(k)) : undefined);
  const add = sp("add");
  const prefill = add ? { card: add, player: sp("player") ?? "", raw: n("raw"), psa9: n("psa9"), psa10: n("psa10"), asOf: sp("asOf"), cert: sp("cert") } : null;
  try {
    const [data, status] = await Promise.all([loadSnipe(), scanStatus()]);
    return (
      <>
        <header className="page-head">
          <h1>Snipe</h1>
          <p>Cards worth bidding on, ranked by what the card is worth graded, how cheap it is right now, how rare it is, and how the player is doing. Max bid keeps PSA 9 at 2x and PSA 10 at 4x your cost, and never goes above the raw price for a raw card. Slab targets set their own max.</p>
        </header>
        <Freshness listingsAt={status.listingsAt} />
        <SnipeView {...data} prefill={prefill} />
      </>
    );
  } catch (e) {
    return <p className="notice">Couldn&apos;t load the snipe board: {(e as Error).message}</p>;
  }
}
