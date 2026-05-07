import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "./research-engine";
import { isQualityCard } from "./card-filter";
import { parseCard, getProductTier, timeLeft, predict, type DealItem } from "./helpers";
import type { ResearchAction } from "./research-engine";

const PRICE_CAP: Record<string, number> = { rookie: 1000, steal: 2000, legacy: 5000 };

// Freshness window: a listing must have been re-confirmed by a scan within
// this many hours, otherwise it's assumed sold/ended. eBay Browse API only
// returns active listings, so a row that stops appearing is gone.
const MAX_STALE_HOURS = 48;

export type PlayerDeals = {
  action: ResearchAction;
  deals: DealItem[];
};

export async function fetchAllDeals(): Promise<Map<string, PlayerDeals>> {
  const actions = getResearchActions();
  const actionMap = new Map(actions.map((a) => [a.id, a]));

  const freshCutoff = new Date(Date.now() - MAX_STALE_HOURS * 3600_000).toISOString();

  const { data: rows } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, rawData, actionId, lane, lastSeenAt, soldAt")
    .is("soldAt", null)
    .gte("lastSeenAt", freshCutoff)
    .order("priceUSD", { ascending: true })
    .limit(500);

  const dealsByPlayer = new Map<string, PlayerDeals>();

  for (const r of rows ?? []) {
    if (!r.actionId) continue;
    if (!isQualityCard(r.title)) continue;

    const action = actionMap.get(r.actionId);
    if (!action) continue;

    const lastName = action.player.split(" ").pop()!.toLowerCase();
    if (lastName.length >= 4 && !r.title.toLowerCase().includes(lastName)) continue;
    if (r.priceUSD > (PRICE_CAP[action.lane] ?? 1000)) continue;

    const raw = (r.rawData ?? {}) as Record<string, unknown>;
    const isBIN = raw.isBIN === true;
    const acceptsOffers = raw.acceptsOffers === true;
    const isAuction = raw.isAuction === true;
    const endDate = (raw.itemEndDate as string) ?? null;

    let actionLabel = "BUY";
    let actionColor = "#22c55e";

    if (isAuction && endDate) {
      const tl = timeLeft(endDate);
      if (!tl) continue;
      actionLabel = tl;
      actionColor = "#ef4444";
    } else if (isBIN && acceptsOffers) {
      actionLabel = "OFFER";
      actionColor = "#eab308";
    }

    const product = getProductTier(r.title);
    const card = parseCard(r.title);
    const offer =
      actionLabel === "OFFER"
        ? Math.round(r.priceUSD * (r.priceUSD < 50 ? 0.7 : r.priceUSD < 200 ? 0.75 : 0.8))
        : null;

    const deal: DealItem = {
      title: r.title,
      price: r.priceUSD,
      url: r.url,
      product: product.tier,
      productColor: product.color,
      numbered: card.numbered,
      isAuto: card.isAuto,
      grade: card.grade,
      offer,
      actionLabel,
      actionColor,
    };

    if (!dealsByPlayer.has(action.player)) {
      dealsByPlayer.set(action.player, { action, deals: [] });
    }
    dealsByPlayer.get(action.player)!.deals.push(deal);
  }

  // Sort deals within each player by price ascending
  for (const pd of dealsByPlayer.values()) {
    pd.deals.sort((a, b) => a.price - b.price);
  }

  return dealsByPlayer;
}

export { predict };
