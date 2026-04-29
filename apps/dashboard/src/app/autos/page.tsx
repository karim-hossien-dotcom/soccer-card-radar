import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

type AutoType = "on_card" | "sticker" | "dual" | "relic_auto";

interface AutoListing {
  id: string;
  title: string;
  priceUSD: number;
  url: string;
  platform: string;
  player: string;
  autoType: AutoType;
  numbered: string | null;
  graded: boolean;
  grade: string | null;
  signal: string;
  marketPrice: number | null;
  imageUrl: string | null;
}

function detectAutoType(title: string): AutoType | null {
  const t = title.toLowerCase();
  if (!t.includes("auto") && !t.includes("autograph") && !t.includes("signature")) return null;

  if (t.includes("dual auto") || t.includes("dual signature") || t.includes("match ball") || t.includes("pairings")) return "dual";
  if (t.includes("relic") || t.includes("patch") || t.includes("jersey") || t.includes("materials")) return "relic_auto";
  if (t.includes("sticker auto")) return "sticker";
  return "on_card";
}

function extractNumbering(title: string): string | null {
  const match = title.match(/\/(\d+)/);
  return match ? `/${match[1]}` : null;
}

function detectGrade(title: string): { graded: boolean; grade: string | null } {
  const t = title.toLowerCase();
  if (t.includes("psa 10") || t.includes("psa10")) return { graded: true, grade: "PSA 10" };
  if (t.includes("psa 9") || t.includes("psa9")) return { graded: true, grade: "PSA 9" };
  if (t.includes("psa 8") || t.includes("psa8")) return { graded: true, grade: "PSA 8" };
  if (t.includes("bgs 10")) return { graded: true, grade: "BGS 10" };
  if (t.includes("bgs 9.5")) return { graded: true, grade: "BGS 9.5" };
  if (t.includes("cgc 10") || t.includes("sgc 10")) return { graded: true, grade: "CGC/SGC 10" };
  return { graded: false, grade: null };
}

function extractPlayerFromTitle(title: string, entities: string[]): string {
  const t = title.toLowerCase();
  for (const player of entities) {
    const parts = player.toLowerCase().split(" ");
    const lastName = parts[parts.length - 1];
    if (lastName.length >= 3 && t.includes(lastName)) {
      // Verify with first name too if available
      if (parts.length > 1 && parts[0].length >= 3 && t.includes(parts[0])) return player;
      if (parts.length === 1 || parts[0].length < 3) return player;
      // Last name only match for unique names
      if (lastName.length >= 5) return player;
    }
  }
  return "Unknown";
}

export default async function AutosPage() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, platform, imageUrl")
    .order("priceUSD", { ascending: true });

  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("player")
    .eq("active", true);

  const { data: priceRefs } = await supabase
    .from("PriceReference")
    .select("cardDescription, marketPriceUSD");

  const playerNames = (entities ?? []).map((e) => e.player);

  // Filter to only autos
  const autos: AutoListing[] = (listings ?? [])
    .map((listing) => {
      const autoType = detectAutoType(listing.title);
      if (!autoType) return null;

      const player = extractPlayerFromTitle(listing.title, playerNames);
      const numbered = extractNumbering(listing.title);
      const { graded, grade } = detectGrade(listing.title);

      // Find market comp
      const titleLower = listing.title.toLowerCase();
      const matchingRef = (priceRefs ?? []).find((ref) => {
        const descWords = ref.cardDescription.toLowerCase().split(/\s+/);
        const matches = descWords.filter((w) => w.length >= 3 && titleLower.includes(w));
        return matches.length / descWords.length >= 0.4;
      });

      let signal = "WATCH";
      let marketPrice: number | null = null;
      if (matchingRef) {
        marketPrice = matchingRef.marketPriceUSD;
        const discount = ((marketPrice - listing.priceUSD) / marketPrice) * 100;
        if (discount >= 30) signal = "STEAL";
        else if (discount >= 10) signal = "GOOD PRICE";
        else if (discount >= -10) signal = "FAIR";
        else signal = "OVERPRICED";
      }

      return {
        id: listing.id,
        title: listing.title,
        priceUSD: listing.priceUSD,
        url: listing.url,
        platform: listing.platform,
        player,
        autoType,
        numbered,
        graded,
        grade,
        signal,
        marketPrice,
        imageUrl: listing.imageUrl,
      };
    })
    .filter(Boolean) as AutoListing[];

  // Sort: cheapest first (finds undervalued), then by type
  autos.sort((a, b) => {
    // Steals first
    const signalOrder: Record<string, number> = { STEAL: 0, "GOOD PRICE": 1, FAIR: 2, WATCH: 3, OVERPRICED: 4 };
    const sigDiff = (signalOrder[a.signal] ?? 3) - (signalOrder[b.signal] ?? 3);
    if (sigDiff !== 0) return sigDiff;
    return a.priceUSD - b.priceUSD;
  });

  const typeColors: Record<AutoType, { color: string; label: string }> = {
    on_card: { color: "var(--buy-now)", label: "ON-CARD" },
    dual: { color: "#c084fc", label: "DUAL AUTO" },
    relic_auto: { color: "var(--bid)", label: "RELIC AUTO" },
    sticker: { color: "var(--text-muted)", label: "STICKER" },
  };

  const onCardCount = autos.filter((a) => a.autoType === "on_card").length;
  const dualCount = autos.filter((a) => a.autoType === "dual").length;
  const relicCount = autos.filter((a) => a.autoType === "relic_auto").length;
  const gradedCount = autos.filter((a) => a.graded).length;

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 2rem", position: "relative", zIndex: 1 }}>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
        {autos.length} autographs tracked — sorted by deal quality
      </p>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--buy-now-bg)", border: "1px solid var(--buy-now)22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--buy-now)" }}>{onCardCount}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--buy-now)", opacity: 0.7, letterSpacing: "0.06em" }}>ON-CARD AUTO</div>
        </div>
        <div style={{ background: "#c084fc15", border: "1px solid #c084fc22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "#c084fc" }}>{dualCount}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "#c084fc", opacity: 0.7, letterSpacing: "0.06em" }}>DUAL AUTO</div>
        </div>
        <div style={{ background: "var(--bid-bg)", border: "1px solid var(--bid)22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--bid)" }}>{relicCount}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--bid)", opacity: 0.7, letterSpacing: "0.06em" }}>RELIC AUTO</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>{gradedCount}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>GRADED</div>
        </div>
      </div>

      {/* Auto cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {autos.map((a, i) => {
          const tc = typeColors[a.autoType];
          const signalColor = a.signal === "STEAL" ? "var(--buy-now)" : a.signal === "GOOD PRICE" ? "var(--bid)" : a.signal === "OVERPRICED" ? "var(--score-hot)" : "var(--text-muted)";

          return (
            <a
              key={`${a.id}-${i}`}
              href={a.url}
              target="_blank"
              rel="noopener"
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr auto",
                gap: "1rem",
                alignItems: "center",
                padding: "0.75rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                textDecoration: "none",
                color: "inherit",
                animation: `fadeInUp 0.3s ease-out ${i * 25}ms both`,
              }}
            >
              {/* Image + Type badge */}
              <div style={{ textAlign: "center", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {a.imageUrl && (
                  <img src={a.imageUrl} alt="" style={{ width: "40px", height: "50px", objectFit: "contain", borderRadius: "3px" }} />
                )}
                <div>
                <div className="mono" style={{ fontSize: "0.6rem", fontWeight: 600, color: tc.color, letterSpacing: "0.04em" }}>
                  {tc.label}
                </div>
                {a.numbered && (
                  <div className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                    {a.numbered}
                  </div>
                )}
                {a.grade && (
                  <div className="mono" style={{ fontSize: "0.5rem", padding: "1px 4px", borderRadius: "2px", background: "var(--bg-surface)", color: "var(--bid)", marginTop: "3px", display: "inline-block" }}>
                    {a.grade}
                  </div>
                )}
                </div>
              </div>

              {/* Content */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.title}
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.7rem" }}>
                  <span style={{ color: "var(--accent)" }}>{a.player}</span>
                  <span style={{ color: "var(--text-muted)" }}>{a.platform}</span>
                </div>
              </div>

              {/* Price + signal */}
              <div style={{ textAlign: "right", minWidth: "100px" }}>
                <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                  ${a.priceUSD < 1000 ? a.priceUSD.toFixed(2) : a.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                {a.marketPrice && (
                  <div className="mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)", marginTop: "1px" }}>
                    mkt ~${a.marketPrice < 1000 ? a.marketPrice.toFixed(0) : a.marketPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                )}
                <div className="mono" style={{ fontSize: "0.55rem", fontWeight: 600, color: signalColor, marginTop: "3px" }}>
                  {a.signal}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}
