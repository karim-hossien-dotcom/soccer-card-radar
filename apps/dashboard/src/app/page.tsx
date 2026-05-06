import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "./research-engine";
import { isQualityCard } from "./card-filter";
import ScanBtn from "./scan-btn";

export const dynamic = "force-dynamic";

// ── Product tier detection ──────────────────────────────────────────
// Based on market guide: Chrome/Sapphire/Prizm > Finest/Select > Merlin > Donruss > budget
function getProductTier(title: string): { tier: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes("sapphire")) return { tier: "Sapphire", color: "#22c55e" };
  if (t.includes("dynasty")) return { tier: "Dynasty", color: "#22c55e" };
  if (t.includes("immaculate")) return { tier: "Immaculate", color: "#22c55e" };
  if (t.includes("impeccable")) return { tier: "Impeccable", color: "#22c55e" };
  if (t.includes("eminence")) return { tier: "Eminence", color: "#22c55e" };
  if (t.includes("chrome") && !t.includes("merlin")) return { tier: "Chrome", color: "#3b82f6" };
  if (t.includes("prizm") && !t.includes("donruss")) return { tier: "Prizm", color: "#3b82f6" };
  if (t.includes("finest")) return { tier: "Finest", color: "#8b5cf6" };
  if (t.includes("select")) return { tier: "Select", color: "#8b5cf6" };
  if (t.includes("obsidian")) return { tier: "Obsidian", color: "#8b5cf6" };
  if (t.includes("inception")) return { tier: "Inception", color: "#8b5cf6" };
  if (t.includes("museum")) return { tier: "Museum", color: "#8b5cf6" };
  if (t.includes("merlin chrome") || t.includes("chrome merlin")) return { tier: "Merlin Chrome", color: "#a1a1aa" };
  if (t.includes("merlin")) return { tier: "Merlin", color: "#71717a" };
  if (t.includes("donruss optic") || t.includes("optic")) return { tier: "Optic", color: "#71717a" };
  if (t.includes("stadium club")) return { tier: "Stadium Club", color: "#71717a" };
  if (t.includes("donruss")) return { tier: "Donruss", color: "#52525b" };
  if (t.includes("mosaic")) return { tier: "Mosaic", color: "#52525b" };
  if (t.includes("topps now")) return { tier: "NOW", color: "#52525b" };
  if (t.includes("total football")) return { tier: "Total", color: "#52525b" };
  return { tier: "", color: "#3f3f46" };
}

// ── Extract card details from title ─────────────────────────────────
function parseCard(title: string): { numbered: string | null; isAuto: boolean; grade: string | null; isRC: boolean } {
  const t = title.toLowerCase();
  const numMatch = t.match(/\/(\d{1,3})\b/);
  const numbered = numMatch ? `/${numMatch[1]}` : null;
  const isAuto = (t.includes("auto") || t.includes("autograph") || t.includes("signature")) && !t.includes("sticker auto");
  const gradeMatch = t.match(/psa\s*(\d+)/i) || t.match(/bgs\s*([\d.]+)/i) || t.match(/sgc\s*(\d+)/i) || t.match(/cgc\s*(\d+)/i);
  const grade = gradeMatch ? gradeMatch[0].toUpperCase() : null;
  const isRC = t.includes(" rc") || t.includes("rookie") || t.includes(" rc ");
  return { numbered, isAuto, grade, isRC };
}

// ── Prediction ──────────────────────────────────────────────────────
function predict(lane: string, catalyst: string): { label: string; mult: number } {
  const c = catalyst.toLowerCase();
  if (lane === "legacy") return { label: "legacy", mult: 2 };
  if (c.includes("breakout") && c.includes("wc")) return { label: "breakout+WC", mult: 3 };
  if (c.includes("world cup") || c.includes("wc")) return { label: "WC", mult: 2.5 };
  if (c.includes("transfer")) return { label: "transfer", mult: 3 };
  if (c.includes("breakout") || c.includes("record")) return { label: "breakout", mult: 2 };
  if (lane === "steal") return { label: "dip", mult: 1.5 };
  return { label: "hold", mult: 1.3 };
}

function timeLeft(endDate: string): string | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0 || diff > 48 * 3600000) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function Page() {
  const actions = getResearchActions();
  const actionMap = new Map(actions.map((a) => [a.id, a]));
  const buyIds = new Set(actions.filter((a) => a.signal === "BUY" || a.signal === "HOLD").map((a) => a.id));
  const sellActions = actions.filter((a) => a.signal === "SELL");

  const { data: rows } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, rawData, actionId, lane")
    .order("priceUSD", { ascending: true })
    .limit(500);

  const { data: latest } = await supabase
    .from("Listing")
    .select("lastSeenAt")
    .order("lastSeenAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  const scannedAt = latest?.lastSeenAt
    ? new Date(latest.lastSeenAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "never";

  type Deal = {
    id: string; title: string; price: number; url: string;
    player: string; lane: string;
    product: { tier: string; color: string };
    card: { numbered: string | null; isAuto: boolean; grade: string | null; isRC: boolean };
    pred: { label: string; mult: number };
    offer: number | null;
    type: "auction" | "offer" | "bin";
    tl: string | null;
  };

  const deals: Deal[] = [];
  const priceCap: Record<string, number> = { rookie: 1000, steal: 2000, legacy: 5000 };

  for (const r of rows ?? []) {
    if (!r.actionId || !buyIds.has(r.actionId)) continue;
    if (!isQualityCard(r.title)) continue;
    const action = actionMap.get(r.actionId);
    if (!action) continue;
    const lastName = action.player.split(" ").pop()!.toLowerCase();
    if (lastName.length >= 4 && !r.title.toLowerCase().includes(lastName)) continue;
    if (r.priceUSD > (priceCap[action.lane] ?? 1000)) continue;

    const raw = (r.rawData ?? {}) as Record<string, unknown>;
    const isBIN = raw.isBIN === true;
    const acceptsOffers = raw.acceptsOffers === true;
    const isAuction = raw.isAuction === true;
    const endDate = (raw.itemEndDate as string) ?? null;

    let type: "auction" | "offer" | "bin" = "bin";
    let tl: string | null = null;
    if (isAuction && endDate) { tl = timeLeft(endDate); if (!tl) continue; type = "auction"; }
    else if (isBIN && acceptsOffers) { type = "offer"; }

    const pred = predict(action.lane, action.catalyst);
    const offer = type === "offer" ? Math.round(r.priceUSD * (r.priceUSD < 50 ? 0.70 : r.priceUSD < 200 ? 0.75 : 0.80)) : null;

    deals.push({
      id: r.id, title: r.title, price: r.priceUSD, url: r.url,
      player: action.player, lane: action.lane,
      product: getProductTier(r.title),
      card: parseCard(r.title),
      pred, offer, type, tl,
    });
  }

  // Sort: auctions → offers (cheapest) → BIN (cheapest)
  const typeOrder = { auction: 0, offer: 1, bin: 2 };
  deals.sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.price - b.price);

  const auctions = deals.filter((d) => d.type === "auction");
  const offers = deals.filter((d) => d.type === "offer");
  const bins = deals.filter((d) => d.type === "bin");

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Card Radar</h1>
          <p className="mono muted" style={{ fontSize: 11, marginTop: 2 }}>
            {deals.length} deals · {scannedAt}
          </p>
        </div>
        <ScanBtn />
      </div>

      {/* Sections */}
      {[
        { label: "Ending Soon", items: auctions, accent: "#ef4444" },
        { label: "Send Offers", items: offers, accent: "#eab308" },
        { label: "Buy Now", items: bins, accent: "#22c55e" },
      ].filter((s) => s.items.length > 0).map(({ label, items, accent }) => (
        <section key={label} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: accent }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em" }}>
              {label.toUpperCase()}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "#3f3f46" }}>{items.length}</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {items.map((d) => (
              <div key={d.id} className="deal">
                {/* Row 1: Player · Product · Numbering · Grade */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{d.player}</span>
                  {d.product.tier && (
                    <span className="mono" style={{ fontSize: 10, color: d.product.color, fontWeight: 500 }}>
                      {d.product.tier}
                    </span>
                  )}
                  {d.card.numbered && (
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa" }}>
                      {d.card.numbered}
                    </span>
                  )}
                  {d.card.isAuto && (
                    <span className="pill" style={{ background: "#22c55e20", color: "#22c55e", fontSize: 10 }}>AUTO</span>
                  )}
                  {d.card.isRC && (
                    <span className="pill" style={{ background: "#3b82f620", color: "#3b82f6", fontSize: 10 }}>RC</span>
                  )}
                  {d.card.grade && (
                    <span className="pill" style={{ background: "#eab30820", color: "#eab308", fontSize: 10 }}>{d.card.grade}</span>
                  )}
                </div>

                {/* Row 2: Title (clickable) */}
                <a href={d.url} target="_blank" rel="noopener" style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.4 }}>
                  {d.title}
                </a>

                {/* Row 3: Price · Offer · Prediction · Action */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>
                    ${d.price < 1000 ? d.price.toFixed(2) : d.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>

                  {d.offer && (
                    <span className="mono amber" style={{ fontSize: 11, fontWeight: 600 }}>
                      offer ${d.offer}
                    </span>
                  )}

                  <span className="green" style={{ fontSize: 11 }}>
                    {d.pred.mult}x {d.pred.label}
                  </span>

                  <div style={{ flex: 1 }} />

                  <a
                    href={`https://130point.com/cards/?search=${encodeURIComponent(d.player + " " + (d.card.numbered ?? "auto"))}`}
                    target="_blank" rel="noopener"
                    className="muted" style={{ fontSize: 10 }}
                  >
                    comps
                  </a>

                  <span className="mono pill" style={{
                    fontSize: 10, fontWeight: 700,
                    background: d.type === "auction" ? "#ef4444" : d.type === "offer" ? "#eab308" : "#22c55e",
                    color: "#000",
                  }}>
                    {d.type === "auction" ? d.tl : d.type === "offer" ? "OFFER" : "BUY"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {deals.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px 16px" }}>
          <p className="dim" style={{ fontSize: 14 }}>No deals right now</p>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Hit Scan to refresh from eBay</p>
        </div>
      )}

      {/* Avoid */}
      {sellActions.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: "#ef4444" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#71717a", letterSpacing: "0.06em" }}>AVOID</span>
          </div>
          <div className="card">
            {sellActions.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "6px 0" }}>
                <span className="pill red" style={{ background: "#ef444420", fontSize: 10 }}>SELL</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{a.player}</span>
                <span className="dim" style={{ fontSize: 11, flex: 1 }}>{a.reasoning.slice(0, 60)}...</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Market notes — collapsed */}
      <details>
        <summary className="dim" style={{ fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "8px 0", letterSpacing: "0.06em" }}>
          MARKET NOTES
        </summary>
        <div className="card" style={{ marginTop: 8, fontSize: 12, color: "#71717a", lineHeight: 1.7 }}>
          <p><strong style={{ color: "#a1a1aa" }}>Prizm WC drops May 22</strong> — older WC card prices will dip as supply floods in</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#a1a1aa" }}>World Cup Jun 11 – Jul 19</strong> — buy rookies now, sell into group stage</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#a1a1aa" }}>Best scan times</strong> — Tue-Thu 10am-2pm EST (low competition) · Sun 6-10pm EST (auctions ending)</p>
          <p style={{ marginTop: 8 }}><strong style={{ color: "#a1a1aa" }}>Product tiers</strong> — <span style={{ color: "#22c55e" }}>Sapphire/Dynasty</span> &gt; <span style={{ color: "#3b82f6" }}>Chrome/Prizm</span> &gt; <span style={{ color: "#8b5cf6" }}>Finest/Select</span> &gt; <span style={{ color: "#71717a" }}>Merlin/Optic</span> &gt; <span style={{ color: "#52525b" }}>Donruss/budget</span></p>
        </div>
      </details>
    </>
  );
}
