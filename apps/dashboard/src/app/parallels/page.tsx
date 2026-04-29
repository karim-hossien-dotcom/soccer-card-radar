import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

type ParallelTier = "gold" | "red" | "black" | "super";

interface ParallelListing {
  id: string;
  title: string;
  priceUSD: number;
  url: string;
  platform: string;
  player: string;
  tier: ParallelTier;
  numbered: string;
  signal: string;
}

function detectParallelTier(title: string): { tier: ParallelTier; numbered: string } | null {
  const t = title.toLowerCase();

  // /5 or /3 or /1 = super
  const superMatch = t.match(/\/([1-5])\b/) || t.match(/1\/1/);
  if (superMatch) return { tier: "super", numbered: `/${superMatch[1] ?? "1"}` };

  // /10 = black
  const blackMatch = t.match(/\/10\b/);
  if (blackMatch || t.includes("black") && (t.includes("/10") || t.includes("/15"))) {
    const num = t.match(/\/(\d+)/);
    return { tier: "black", numbered: num ? `/${num[1]}` : "/10" };
  }

  // /25 = red
  const redMatch = t.match(/\/25\b/) || t.match(/\/28\b/) || t.match(/\/30\b/) || t.match(/\/15\b/);
  if (redMatch) {
    const num = t.match(/\/(\d+)/);
    return { tier: "red", numbered: num ? `/${num[1]}` : "/25" };
  }

  // /50 or /75 = gold
  const goldMatch = t.match(/\/50\b/) || t.match(/\/75\b/) || t.match(/\/99\b/);
  if (goldMatch) {
    const num = t.match(/\/(\d+)/);
    return { tier: "gold", numbered: num ? `/${num[1]}` : "/50" };
  }

  return null;
}

function extractPlayerFromTitle(title: string, entities: string[]): string {
  const t = title.toLowerCase();
  for (const player of entities) {
    const lastName = player.split(" ").pop()?.toLowerCase() ?? "";
    if (lastName.length >= 3 && t.includes(lastName)) return player;
  }
  return "Unknown";
}

export default async function ParallelsPage() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, platform")
    .order("priceUSD", { ascending: true });

  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("player")
    .eq("active", true);

  const { data: priceRefs } = await supabase
    .from("PriceReference")
    .select("cardDescription, marketPriceUSD");

  const playerNames = (entities ?? []).map((e) => e.player);

  // Filter to only numbered parallels
  const parallels: ParallelListing[] = (listings ?? [])
    .map((listing) => {
      const detected = detectParallelTier(listing.title);
      if (!detected) return null;

      const player = extractPlayerFromTitle(listing.title, playerNames);

      // Find market comp
      const titleLower = listing.title.toLowerCase();
      const matchingRef = (priceRefs ?? []).find((ref) => {
        const descWords = ref.cardDescription.toLowerCase().split(/\s+/);
        const matches = descWords.filter((w) => w.length >= 3 && titleLower.includes(w));
        return matches.length / descWords.length >= 0.4;
      });

      let signal = "WATCH";
      if (matchingRef) {
        const discount = ((matchingRef.marketPriceUSD - listing.priceUSD) / matchingRef.marketPriceUSD) * 100;
        if (discount >= 30) signal = "STEAL";
        else if (discount >= 10) signal = "GOOD PRICE";
        else if (discount < -10) signal = "OVERPRICED";
      }

      return {
        id: listing.id,
        title: listing.title,
        priceUSD: listing.priceUSD,
        url: listing.url,
        platform: listing.platform,
        player,
        tier: detected.tier,
        numbered: detected.numbered,
        signal,
      };
    })
    .filter(Boolean) as ParallelListing[];

  // Sort: super first, then black, red, gold — within tier by price ascending
  const tierOrder: Record<ParallelTier, number> = { super: 0, black: 1, red: 2, gold: 3 };
  parallels.sort((a, b) => {
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    return a.priceUSD - b.priceUSD;
  });

  const tierColors: Record<ParallelTier, { color: string; bg: string; label: string }> = {
    super: { color: "#ff4444", bg: "#ff444420", label: "SUPER SHORT PRINT" },
    black: { color: "#e8e8ed", bg: "#e8e8ed15", label: "BLACK /10" },
    red: { color: "#ef4444", bg: "#ef444415", label: "RED /25" },
    gold: { color: "#fbbf24", bg: "#fbbf2415", label: "GOLD /50" },
  };

  const superCount = parallels.filter((p) => p.tier === "super").length;
  const blackCount = parallels.filter((p) => p.tier === "black").length;
  const redCount = parallels.filter((p) => p.tier === "red").length;
  const goldCount = parallels.filter((p) => p.tier === "gold").length;

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 2rem", position: "relative", zIndex: 1 }}>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
        {parallels.length} numbered parallels from your watchlist — sorted by rarity
      </p>

      {/* Tier summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {(["super", "black", "red", "gold"] as ParallelTier[]).map((tier) => {
          const tc = tierColors[tier];
          const count = tier === "super" ? superCount : tier === "black" ? blackCount : tier === "red" ? redCount : goldCount;
          return (
            <div key={tier} style={{ background: tc.bg, border: `1px solid ${tc.color}22`, borderRadius: "8px", padding: "0.75rem" }}>
              <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: tc.color }}>{count}</div>
              <div className="mono" style={{ fontSize: "0.55rem", color: tc.color, opacity: 0.7, marginTop: "0.2rem", letterSpacing: "0.06em" }}>{tc.label}</div>
            </div>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {parallels.map((p, i) => {
          const tc = tierColors[p.tier];
          const signalColor = p.signal === "STEAL" ? "var(--buy-now)" : p.signal === "GOOD PRICE" ? "var(--bid)" : p.signal === "OVERPRICED" ? "var(--score-hot)" : "var(--text-muted)";

          return (
            <a
              key={`${p.id}-${i}`}
              href={p.url}
              target="_blank"
              rel="noopener"
              style={{
                display: "grid",
                gridTemplateColumns: "70px 1fr auto",
                gap: "1rem",
                alignItems: "center",
                padding: "0.75rem 1rem",
                background: "var(--bg-card)",
                border: `1px solid ${tc.color}30`,
                borderLeft: `3px solid ${tc.color}`,
                borderRadius: "6px",
                textDecoration: "none",
                color: "inherit",
                animation: `fadeInUp 0.3s ease-out ${i * 25}ms both`,
              }}
            >
              {/* Tier badge */}
              <div style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 700, color: tc.color }}>{p.numbered}</div>
                <div className="mono" style={{ fontSize: "0.5rem", color: tc.color, opacity: 0.6 }}>{p.tier.toUpperCase()}</div>
              </div>

              {/* Content */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.title}
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.25rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--accent)" }}>{p.player}</span>
                  <span>{p.platform}</span>
                </div>
              </div>

              {/* Price + signal */}
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                  ${p.priceUSD < 1000 ? p.priceUSD.toFixed(2) : p.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="mono" style={{ fontSize: "0.55rem", fontWeight: 600, color: signalColor, marginTop: "2px" }}>
                  {p.signal}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </main>
  );
}
