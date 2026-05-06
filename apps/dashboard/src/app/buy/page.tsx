import { getResearchActions, signalStyles } from "../research-engine";
import { isQualityCard } from "../card-filter";
import { supabase } from "@soccer-card-radar/db";
import CardList from "./card-list";

export const dynamic = "force-dynamic";

export default async function BuyPage() {
  const actions = getResearchActions();

  const buyableActions = new Map(
    actions
      .filter((a) => a.signal === "BUY" || a.signal === "HOLD")
      .map((a) => [a.id, a])
  );

  const sellActionIds = new Set(
    actions.filter((a) => a.signal === "SELL").map((a) => a.id)
  );

  const buyableIds = Array.from(buyableActions.keys());

  const { data: rawListings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, rawData, actionId, avgSoldPrice, pctBelowMarket, lane")
    .order("priceUSD", { ascending: true })
    .limit(500);

  const cards = (rawListings ?? [])
    .filter((l) => {
      if (!isQualityCard(l.title)) return false;
      if (l.actionId && sellActionIds.has(l.actionId)) return false;
      if (!l.actionId || !buyableIds.includes(l.actionId)) return false;
      return true;
    })
    .map((l) => {
      const action = l.actionId ? buyableActions.get(l.actionId) : undefined;
      const raw = (l.rawData ?? {}) as Record<string, unknown>;
      const sStyle = signalStyles[action?.signal ?? "BUY"];

      return {
        id: l.id,
        title: l.title,
        priceUSD: l.priceUSD,
        url: l.url,
        imageUrl: l.imageUrl,
        avgSoldPrice: l.avgSoldPrice,
        pctBelowMarket: l.pctBelowMarket,
        isBIN: raw.isBIN === true,
        acceptsOffers: raw.acceptsOffers === true,
        isAuction: raw.isAuction === true,
        itemEndDate: (raw.itemEndDate as string) ?? null,
        playerName: action?.player ?? "Unknown",
        signal: action?.signal ?? "BUY",
        signalBg: sStyle.bg,
        signalColor: sStyle.color,
        reasoning: action?.reasoning ?? "",
        catalyst: action?.catalyst ?? "",
        timeframe: action?.timeframe ?? "",
        lane: action?.lane ?? "rookie",
      };
    });

  const playerCount = new Set(cards.map((c) => c.playerName)).size;

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "0 1.5rem 3rem",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.3rem" }}>
          <h2
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: "1.35rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Buy Deals
          </h2>
          {cards.length > 0 && (
            <span
              className="mono"
              style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: "20px",
                background: "var(--buy-now-glow)",
                color: "#10b981",
                border: "1px solid rgba(16,185,129,0.25)",
              }}
            >
              {cards.length}
            </span>
          )}
        </div>
        <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          {cards.length} cards across {playerCount} player{playerCount !== 1 ? "s" : ""} — sorted by your preference
        </p>
      </div>

      <CardList cards={cards} />
    </main>
  );
}
