import { supabase } from "@soccer-card-radar/db";
import { getPlayerSignal, signalStyles } from "../player-signals";
import { isQualityCard } from "../card-filter";

export const dynamic = "force-dynamic";

type ParallelTier = "gold" | "red" | "black" | "super";

function detectTier(title: string): { tier: ParallelTier; numbered: string } | null {
  const t = title.toLowerCase();
  const m = t.match(/\/(\d+)\b/);
  if (!m) return null;
  const n = parseInt(m[1]);
  if (n <= 5) return { tier: "super", numbered: `/${n}` };
  if (n <= 15) return { tier: "black", numbered: `/${n}` };
  if (n <= 30) return { tier: "red", numbered: `/${n}` };
  if (n <= 99) return { tier: "gold", numbered: `/${n}` };
  return null;
}

export default async function ParallelsPage() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, platform, imageUrl, rawData")
    .order("priceUSD", { ascending: true });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const cards = (listings ?? []).map((l) => {
    if (!isQualityCard(l.title)) return null;
    const detected = detectTier(l.title);
    if (!detected) return null;
    const tLower = l.title.toLowerCase();
    if (tLower.includes("auto") || tLower.includes("autograph") || tLower.includes("signature")) return null;

    const raw = l.rawData as Record<string, unknown> | null;
    const isBIN = raw?.isBIN === true;
    const acceptsOffers = raw?.acceptsOffers === true;
    const isAuction = raw?.isAuction === true;
    const endDate = raw?.itemEndDate ? new Date(raw.itemEndDate as string).getTime() : null;
    if (isAuction && !isBIN && endDate && endDate - now > 2 * day) return null;

    const endingSoon = endDate ? endDate - now < day && endDate > now : false;
    let timeLeft: string | null = null;
    if (endDate && endDate > now) {
      const diff = endDate - now;
      const h = Math.floor(diff / (60 * 60 * 1000));
      const m = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      timeLeft = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    const signal = getPlayerSignal(l.title);
    const actionLabel = isBIN && acceptsOffers ? "SEND OFFER" : isBIN ? "BUY NOW" : isAuction ? (timeLeft ?? "BID") : "BUY";
    const actionColor = acceptsOffers ? "#c77d15" : isBIN ? "#0d9f4f" : "#dc2626";

    return {
      ...l, ...detected, signal, isBIN, acceptsOffers, isAuction, endingSoon, timeLeft, actionLabel, actionColor,
    };
  }).filter(Boolean) as NonNullable<ReturnType<typeof detectTier> & {
    id: string; title: string; priceUSD: number; url: string; imageUrl: string | null;
    signal: ReturnType<typeof getPlayerSignal>; actionLabel: string; actionColor: string;
    endingSoon: boolean; timeLeft: string | null;
  }>[];

  // Sort: offers first, then ending soon, then BIN
  const offers = cards.filter((c) => c.actionLabel === "SEND OFFER");
  const ending = cards.filter((c) => c.endingSoon && c.actionLabel !== "SEND OFFER");
  const bin = cards.filter((c) => c.actionLabel === "BUY NOW");

  const tierColors: Record<ParallelTier, string> = { super: "#dc2626", black: "#1a1a2e", red: "#ef4444", gold: "#c77d15" };

  function renderSection(title: string, items: typeof cards, sectionColor: string) {
    if (items.length === 0) return null;
    return (
      <>
        <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: sectionColor, marginBottom: "0.5rem", marginTop: "1rem" }}>
          {title} ({items.length})
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {items.map((c, i) => {
            const sig = c.signal;
            const sigStyle = sig ? signalStyles[sig.signal] : null;
            const tc = tierColors[c.tier];
            const target = sig?.priceTarget;

            return (
              <a key={`${c.id}-${i}`} href={c.url} target="_blank" rel="noopener" style={{
                display: "grid", gridTemplateColumns: "auto 50px 1fr auto",
                gap: "0.75rem", alignItems: "center", padding: "0.6rem 0.75rem",
                background: "var(--bg-card)", border: `1px solid ${tc}20`,
                borderLeft: `3px solid ${tc}`, borderRadius: "8px",
                textDecoration: "none", color: "inherit", boxShadow: "var(--shadow-sm)",
                animation: `fadeInUp 0.2s ease-out ${i * 15}ms both`,
              }}>
                {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: "40px", height: "52px", objectFit: "contain", borderRadius: "4px" }} /> : <div style={{ width: "40px" }} />}

                <div style={{ textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: tc }}>{c.numbered}</div>
                  <div style={{ fontSize: "0.45rem", color: "var(--text-muted)", fontWeight: 600 }}>{c.tier.toUpperCase()}</div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem", alignItems: "center", fontSize: "0.65rem" }}>
                    {sig && (
                      <>
                        <img src={sig.photo} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{sig.player}</span>
                        <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "1px 6px", borderRadius: "3px", background: sigStyle!.bg, color: sigStyle!.color }}>{sig.signal}</span>
                      </>
                    )}
                    {!sig && <span style={{ color: "var(--text-muted)" }}>Unknown player</span>}
                    {target && (
                      <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>
                        Target: ${target.mid}-${target.ceiling}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: "right", minWidth: "95px" }}>
                  <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                    ${c.priceUSD < 1000 ? c.priceUSD.toFixed(2) : c.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                  {target && c.priceUSD < target.mid && (
                    <div className="mono" style={{ fontSize: "0.5rem", color: "var(--buy-now)", fontWeight: 600 }}>
                      {Math.round(((target.mid - c.priceUSD) / c.priceUSD) * 100)}% upside
                    </div>
                  )}
                  <span style={{ fontSize: "0.5rem", fontWeight: 700, padding: "1px 6px", borderRadius: "3px", background: `${c.actionColor}15`, color: c.actionColor, display: "inline-block", marginTop: "2px" }}>
                    {c.actionLabel}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 3rem", position: "relative", zIndex: 1 }}>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
        {cards.length} numbered parallels (/99 or less) — no autos, no base cards
      </p>
      {renderSection("Send Offers", offers, "#c77d15")}
      {renderSection("Ending Soon", ending, "#dc2626")}
      {renderSection("Buy Now", bin, "#0d9f4f")}
    </main>
  );
}
