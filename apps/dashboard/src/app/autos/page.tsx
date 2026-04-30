import { supabase } from "@soccer-card-radar/db";
import { getPlayerSignal, signalStyles } from "../player-signals";
import { isQualityCard } from "../card-filter";

export const dynamic = "force-dynamic";

function detectAutoType(title: string): string | null {
  const t = title.toLowerCase();
  if (!t.includes("auto") && !t.includes("autograph") && !t.includes("signature")) return null;
  if (t.includes("dual") || t.includes("match ball") || t.includes("pairings") || t.includes("triple")) return "DUAL";
  if (t.includes("relic") || t.includes("patch") || t.includes("materials") || t.includes("jersey")) return "RELIC";
  return "ON-CARD";
}

function detectGrade(title: string): string | null {
  const t = title.toLowerCase();
  if (t.includes("psa 10")) return "PSA 10";
  if (t.includes("psa 9")) return "PSA 9";
  if (t.includes("psa 8")) return "PSA 8";
  if (t.includes("bgs 10") || t.includes("sgc 10") || t.includes("cgc 10")) return "GEM 10";
  return null;
}

export default async function AutosPage() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, platform, imageUrl, rawData")
    .order("priceUSD", { ascending: true });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const cards = (listings ?? []).map((l) => {
    if (!isQualityCard(l.title)) return null;
    const autoType = detectAutoType(l.title);
    if (!autoType) return null;

    const tLower = l.title.toLowerCase();
    const numMatch = tLower.match(/\/(\d+)\b/);
    const isNumbered = numMatch && parseInt(numMatch[1]) <= 99;
    const isGraded = tLower.includes("psa") || tLower.includes("bgs") || tLower.includes("sgc") || tLower.includes("cgc");
    const isSSP = tLower.includes("ssp") || tLower.includes("case hit") || tLower.includes("1/1");
    if (!isNumbered && !isGraded && !isSSP) return null;

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
    const grade = detectGrade(l.title);
    const numbered = numMatch ? `/${numMatch[1]}` : null;
    const actionLabel = isBIN && acceptsOffers ? "SEND OFFER" : isBIN ? "BUY NOW" : isAuction ? (timeLeft ?? "BID") : "BUY";
    const actionColor = acceptsOffers ? "#c77d15" : isBIN ? "#0d9f4f" : "#dc2626";

    return {
      id: l.id, title: l.title, priceUSD: l.priceUSD, url: l.url, imageUrl: l.imageUrl,
      autoType, grade, numbered, signal,
      actionLabel, actionColor, endingSoon, timeLeft,
    };
  }).filter(Boolean) as NonNullable<{
    id: string; title: string; priceUSD: number; url: string; imageUrl: string | null;
    autoType: string; grade: string | null; numbered: string | null;
    signal: ReturnType<typeof getPlayerSignal>;
    actionLabel: string; actionColor: string; endingSoon: boolean; timeLeft: string | null;
  }>[];

  const offers = cards.filter((c) => c.actionLabel === "SEND OFFER");
  const ending = cards.filter((c) => c.endingSoon && c.actionLabel !== "SEND OFFER");
  const bin = cards.filter((c) => c.actionLabel === "BUY NOW");

  const typeColors: Record<string, string> = { "ON-CARD": "#0d9f4f", DUAL: "#7c3aed", RELIC: "#c77d15" };

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
            const tc = typeColors[c.autoType] ?? "#9b9bab";
            const target = sig?.priceTarget;

            return (
              <a key={`${c.id}-${i}`} href={c.url} target="_blank" rel="noopener" style={{
                display: "grid", gridTemplateColumns: "auto 70px 1fr auto",
                gap: "0.75rem", alignItems: "center", padding: "0.6rem 0.75rem",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "8px", textDecoration: "none", color: "inherit",
                boxShadow: "var(--shadow-sm)",
                animation: `fadeInUp 0.2s ease-out ${i * 15}ms both`,
              }}>
                {c.imageUrl ? <img src={c.imageUrl} alt="" style={{ width: "40px", height: "52px", objectFit: "contain", borderRadius: "4px" }} /> : <div style={{ width: "40px" }} />}

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.55rem", fontWeight: 700, color: tc }}>{c.autoType}</div>
                  {c.numbered && <div className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, marginTop: "1px" }}>{c.numbered}</div>}
                  {c.grade && <div className="mono" style={{ fontSize: "0.45rem", padding: "1px 4px", borderRadius: "3px", background: "var(--bg-surface)", color: "#c77d15", marginTop: "2px", display: "inline-block" }}>{c.grade}</div>}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.2rem", alignItems: "center", fontSize: "0.65rem" }}>
                    {sig && (
                      <>
                        <img src={sig.photo} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%", objectFit: "cover" }} />
                        <span style={{ fontWeight: 600 }}>{sig.player}</span>
                        <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "1px 6px", borderRadius: "3px", background: sigStyle!.bg, color: sigStyle!.color }}>{sig.signal}</span>
                      </>
                    )}
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
        {cards.length} numbered autos (/99 or less + graded + SSP) — deals first
      </p>
      {renderSection("Send Offers", offers, "#c77d15")}
      {renderSection("Ending Soon", ending, "#dc2626")}
      {renderSection("Buy Now", bin, "#0d9f4f")}
    </main>
  );
}
