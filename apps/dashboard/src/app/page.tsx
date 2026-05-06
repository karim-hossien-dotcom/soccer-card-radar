import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "./research-engine";
import { isQualityCard } from "./card-filter";
import ScanBtn from "./scan-btn";

export const dynamic = "force-dynamic";

// Prediction based on lane + catalyst
function predict(lane: string, catalyst: string): { label: string; mult: number } {
  const c = catalyst.toLowerCase();
  if (lane === "legacy") return { label: "legacy hold", mult: 2 };
  if (c.includes("breakout") && c.includes("wc")) return { label: "breakout + WC", mult: 3 };
  if (c.includes("world cup") || c.includes("wc")) return { label: "WC hype", mult: 2.5 };
  if (c.includes("transfer")) return { label: "transfer", mult: 3 };
  if (c.includes("breakout") || c.includes("record")) return { label: "breakout", mult: 2 };
  if (lane === "steal") return { label: "dip recovery", mult: 1.5 };
  return { label: "hold", mult: 1.3 };
}

function timeLeft(endDate: string): string | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return null; // too far out
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function Page() {
  const actions = getResearchActions();
  const actionMap = new Map(actions.map((a) => [a.id, a]));
  const buyIds = new Set(actions.filter((a) => a.signal === "BUY" || a.signal === "HOLD").map((a) => a.id));
  const sellActions = actions.filter((a) => a.signal === "SELL");

  // Fetch listings
  const { data: rows } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, rawData, actionId, lane")
    .order("priceUSD", { ascending: true })
    .limit(500);

  // Last scanned
  const { data: latest } = await supabase
    .from("Listing")
    .select("lastSeenAt")
    .order("lastSeenAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const scannedAt = latest?.lastSeenAt
    ? new Date(latest.lastSeenAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "never";

  // Filter and enrich
  type Deal = {
    id: string; title: string; price: number; url: string;
    player: string; signal: string; lane: string;
    reasoning: string; catalyst: string;
    pred: { label: string; mult: number };
    offer: number | null;
    type: "auction" | "offer" | "bin";
    timeLeft: string | null;
    compsUrl: string;
  };

  const deals: Deal[] = [];
  const priceCap: Record<string, number> = { rookie: 1000, steal: 2000, legacy: 5000 };

  for (const r of rows ?? []) {
    if (!r.actionId || !buyIds.has(r.actionId)) continue;
    if (!isQualityCard(r.title)) continue;

    const action = actionMap.get(r.actionId);
    if (!action) continue;

    const cap = priceCap[action.lane] ?? 1000;
    if (r.priceUSD > cap) continue;

    const raw = (r.rawData ?? {}) as Record<string, unknown>;
    const isBIN = raw.isBIN === true;
    const acceptsOffers = raw.acceptsOffers === true;
    const isAuction = raw.isAuction === true;
    const endDate = (raw.itemEndDate as string) ?? null;

    let type: "auction" | "offer" | "bin" = "bin";
    let tl: string | null = null;

    if (isAuction && endDate) {
      tl = timeLeft(endDate);
      if (!tl) continue; // ended or too far out
      type = "auction";
    } else if (isBIN && acceptsOffers) {
      type = "offer";
    }

    const pred = predict(action.lane, action.catalyst);
    const offer = type === "offer"
      ? Math.round(r.priceUSD < 50 ? r.priceUSD * 0.70 : r.priceUSD < 200 ? r.priceUSD * 0.75 : r.priceUSD * 0.80)
      : null;

    const searchTerm = action.player + " " + (r.title.match(/\/\d+/)?.[0] ?? "auto");

    deals.push({
      id: r.id, title: r.title, price: r.priceUSD, url: r.url,
      player: action.player, signal: action.signal, lane: action.lane,
      reasoning: action.reasoning, catalyst: action.catalyst,
      pred, offer, type, timeLeft: tl,
      compsUrl: `https://130point.com/cards/?search=${encodeURIComponent(searchTerm)}`,
    });
  }

  // Sort: auctions first (soonest), then offers (cheapest), then BIN (cheapest)
  const typeOrder = { auction: 0, offer: 1, bin: 2 };
  deals.sort((a, b) => {
    const to = typeOrder[a.type] - typeOrder[b.type];
    if (to !== 0) return to;
    return a.price - b.price;
  });

  const auctions = deals.filter((d) => d.type === "auction");
  const offers = deals.filter((d) => d.type === "offer");
  const bins = deals.filter((d) => d.type === "bin");

  const sections = [
    { label: "ENDING SOON", items: auctions, accent: "var(--red)" },
    { label: "SEND OFFERS", items: offers, accent: "var(--amber)" },
    { label: "BUY NOW", items: bins, accent: "var(--green)" },
  ].filter((s) => s.items.length > 0);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div className="sora" style={{ fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.03em" }}>
            Card Radar
          </div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--text-3)", marginTop: "2px" }}>
            {deals.length} deals · scanned {scannedAt}
          </div>
        </div>
        <ScanBtn />
      </div>

      {/* Deal Feed */}
      {sections.map(({ label, items, accent }) => (
        <div key={label} style={{ marginBottom: "1.5rem" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            marginBottom: "0.5rem", padding: "0 0.25rem",
          }}>
            <div style={{ width: "3px", height: "12px", background: accent, borderRadius: "2px" }} />
            <span className="sora" style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em" }}>
              {label}
            </span>
            <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-3)" }}>{items.length}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1px", background: "var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            {items.map((deal) => {
              const roi = Math.round((deal.pred.mult - 1) * 100);

              return (
                <div key={deal.id} className="deal-row" style={{ background: "var(--surface)", padding: "0.65rem 0.75rem" }}>
                  {/* Row 1: Player + Title + Price */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.3rem" }}>
                    {/* Player */}
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>
                      {deal.player}
                    </span>

                    {/* Title — clickable eBay link */}
                    <a href={deal.url} target="_blank" rel="noopener" style={{
                      fontSize: "0.65rem", color: "var(--text-2)", flex: 1, minWidth: 0,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {deal.title}
                    </a>

                    {/* Price */}
                    <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", flexShrink: 0 }}>
                      ${deal.price < 1000 ? deal.price.toFixed(2) : deal.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {/* Row 2: Prediction + Offer + Action + Comps */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.55rem" }}>
                    {/* Prediction */}
                    <span style={{ color: "var(--green)" }}>
                      {deal.pred.mult}x {deal.pred.label}
                    </span>
                    {roi > 0 && (
                      <span className="mono" style={{ color: "var(--green)", fontWeight: 600 }}>+{roi}%</span>
                    )}

                    {/* Offer */}
                    {deal.offer && (
                      <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                        Offer ${deal.offer}
                      </span>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Comps link */}
                    <a href={deal.compsUrl} target="_blank" rel="noopener" style={{
                      color: "var(--text-3)", fontSize: "0.5rem", fontWeight: 500,
                    }}>
                      comps
                    </a>

                    {/* Action badge */}
                    <span className="mono" style={{
                      fontSize: "0.5rem", fontWeight: 700, padding: "2px 6px", borderRadius: "3px",
                      background: deal.type === "auction" ? "var(--red)" : deal.type === "offer" ? "var(--amber)" : "var(--green)",
                      color: "#000",
                    }}>
                      {deal.type === "auction" ? deal.timeLeft : deal.type === "offer" ? "OFFER" : "BUY"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {deals.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-3)", fontSize: "0.8rem" }}>
          No deals right now. Hit Scan to refresh.
        </div>
      )}

      {/* Avoid */}
      {sellActions.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", padding: "0 0.25rem" }}>
            <div style={{ width: "3px", height: "12px", background: "var(--red)", borderRadius: "2px" }} />
            <span className="sora" style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em" }}>AVOID</span>
          </div>
          <div style={{ background: "var(--surface)", borderRadius: "8px", padding: "0.6rem 0.75rem", border: "1px solid rgba(239,68,68,0.15)" }}>
            {sellActions.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", padding: "0.25rem 0" }}>
                <span style={{ fontSize: "0.5rem", fontWeight: 700, padding: "1px 5px", borderRadius: "3px", background: "var(--red)", color: "#fff" }}>SELL</span>
                <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>{a.player}</span>
                <span style={{ fontSize: "0.6rem", color: "var(--text-3)", flex: 1 }}>{a.reasoning.slice(0, 80)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Intel — collapsed */}
      <details style={{ marginTop: "1rem" }}>
        <summary className="sora" style={{
          fontSize: "0.6rem", fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.1em",
          cursor: "pointer", padding: "0.5rem 0.25rem", listStyle: "none",
          display: "flex", alignItems: "center", gap: "0.5rem",
        }}>
          <span style={{ fontSize: "0.7rem" }}>&#9654;</span> MARKET ANALYSIS
        </summary>
        <div style={{ padding: "1rem 0", color: "var(--text-2)", fontSize: "0.75rem" }}>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong>Prizm WC release:</strong> May 22 (17 days) — expect older WC card prices to dip as supply floods in.
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong>World Cup:</strong> June 11 – July 19 — buy rookies NOW, sell into group stage hype.
          </p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong>Best scan times:</strong> Tue-Thu 10am-2pm EST (low competition) · Sun 6-10pm EST (auction endings)
          </p>
          <p>
            <strong>Key insight:</strong> Soccer cards grew 1,586% in 2021. Market recovered from 2022 crash. WC 2026 in USA = biggest demand spike ever.
          </p>
        </div>
      </details>
    </>
  );
}
