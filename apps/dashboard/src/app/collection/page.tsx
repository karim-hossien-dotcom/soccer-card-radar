import { loadCollection } from "./load";
import CollectionView from "./collection-view";

export const dynamic = "force-dynamic";

export default async function CollectionPage() {
  try {
    const cards = await loadCollection();
    return <CollectionView cards={cards} />;
  } catch (e) {
    return (
      <div style={{ padding: 16, border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-2)" }}>
        Couldn&apos;t load the collection: {(e as Error).message}
      </div>
    );
  }
}
