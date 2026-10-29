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
          <p>Cards worth bidding on, best first.</p>
        </header>
        <Freshness listingsAt={status.listingsAt} compact />
        <SnipeView {...data} prefill={prefill} listingsAt={status.listingsAt} />
      </>
    );
  } catch (e) {
    return <p className="notice">Couldn&apos;t load the snipe board: {(e as Error).message}</p>;
  }
}
