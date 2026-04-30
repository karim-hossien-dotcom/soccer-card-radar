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
  imageUrl: string | null;
  isBIN: boolean;
  acceptsOffers: boolean;
  isAuction: boolean;
  endingSoon: boolean;
  timeLeft: string | null;
}

function detectParallelTier(title: string): { tier: ParallelTier; numbered: string } | null {
  const t = title.toLowerCase();
  const numMatch = t.match(/\/(\d+)\b/);
  if (!numMatch) return null;
  const num = parseInt(numMatch[1]);
  if (num <= 5) return { tier: "super", numbered: `/${num}` };
  if (num <= 15) return { tier: "black", numbered: `/${num}` };
  if (num <= 30) return { tier: "red", numbered: `/${num}` };
  if (num <= 99) return { tier: "gold", numbered: `/${num}` };
  return null; // /100+ not interesting enough
}

function extractPlayer(title: string, players: string[]): string {
  const t = title.toLowerCase();
  for (const p of players) {
    const last = p.split(" ").pop()!.toLowerCase();
    if (last.length >= 3 && t.includes(last)) return p;
  }
  return "Unknown";
}

export default async function ParallelsPage() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, platform, imageUrl, rawData")
    .order("priceUSD", { ascending: true });

  const { data: entities } = await supabase.from("TrackedEntity").select("player").eq("active", true);
  const playerNames = (entities ?? []).map((e) => e.player);

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const parallels: ParallelListing[] = (listings ?? [])
    .map((l) => {
      const detected = detectParallelTier(l.title);
      if (!detected) return null;

      // Exclude autos — those belong on the /autos page
      const tLower = l.title.toLowerCase();
      if (tLower.includes("auto") || tLower.includes("autograph") || tLower.includes("signature")) return null;

      const raw = l.rawData as Record<string, unknown> | null;
      const isBIN = raw?.isBIN === true;
      const acceptsOffers = raw?.acceptsOffers === true;
      const isAuction = raw?.isAuction === true;
      const endDate = raw?.itemEndDate ? new Date(raw.itemEndDate as string).getTime() : null;

      // Hide auctions ending 2+ days out
      if (isAuction && !isBIN && endDate && endDate - now > 2 * twentyFourHours) return null;

      const endingSoon = endDate ? endDate - now < twentyFourHours && endDate > now : false;

      let timeLeft: string | null = null;
      if (endDate && endDate > now) {
        const diff = endDate - now;
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        timeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }

      return {
        id: l.id,
        title: l.title,
        priceUSD: l.priceUSD,
        url: l.url,
        platform: l.platform,
        player: extractPlayer(l.title, playerNames),
        tier: detected.tier,
        numbered: detected.numbered,
        imageUrl: l.imageUrl,
        isBIN,
        acceptsOffers,
        isAuction,
        endingSoon,
        timeLeft,
      };
    })
    .filter(Boolean) as ParallelListing[];

  // Split into two groups
  const offers = parallels.filter((p) => p.isBIN && p.acceptsOffers);
  const endingSoon = parallels.filter((p) => p.isAuction && p.endingSoon);
  const binOnly = parallels.filter((p) => p.isBIN && !p.acceptsOffers);

  // Sort offers by tier rarity then price
  const tierOrder: Record<ParallelTier, number> = { super: 0, black: 1, red: 2, gold: 3 };
  offers.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.priceUSD - b.priceUSD);
  endingSoon.sort((a, b) => {
    // Most urgent first
    const aTime = a.timeLeft ? parseInt(a.timeLeft) : 999;
    const bTime = b.timeLeft ? parseInt(b.timeLeft) : 999;
    return aTime - bTime;
  });
  binOnly.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.priceUSD - b.priceUSD);

  const tierColors: Record<ParallelTier, { color: string; label: string }> = {
    super: { color: "#ff4444", label: "SSP" },
    black: { color: "#e8e8ed", label: "BLK" },
    red: { color: "#ef4444", label: "RED" },
    gold: { color: "#fbbf24", label: "GLD" },
  };

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 2rem", position: "relative", zIndex: 1 }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--bid-bg)", border: "1px solid var(--bid)22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--bid)" }}>{offers.length}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--bid)", opacity: 0.7, letterSpacing: "0.06em" }}>SEND OFFERS</div>
        </div>
        <div style={{ background: "#ff444415", border: "1px solid #ff444422", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--score-hot)" }}>{endingSoon.length}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--score-hot)", opacity: 0.7, letterSpacing: "0.06em" }}>ENDING &lt;24H</div>
        </div>
        <div style={{ background: "var(--buy-now-bg)", border: "1px solid var(--buy-now)22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--buy-now)" }}>{binOnly.length}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--buy-now)", opacity: 0.7, letterSpacing: "0.06em" }}>BUY NOW</div>
        </div>
      </div>

      {/* SEND OFFERS section */}
      {offers.length > 0 && (
        <>
          <h2 className="mono" style={{ fontSize: "0.8rem", color: "var(--bid)", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
            SEND OFFERS — {offers.length} cards accepting offers
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "2rem" }}>
            {offers.map((p, i) => <ParallelCard key={`o-${p.id}-${i}`} p={p} tc={tierColors[p.tier]} index={i} actionLabel="SEND OFFER" actionColor="var(--bid)" />)}
          </div>
        </>
      )}

      {/* ENDING SOON section */}
      {endingSoon.length > 0 && (
        <>
          <h2 className="mono" style={{ fontSize: "0.8rem", color: "var(--score-hot)", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
            ENDING SOON — auctions closing within 24h
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "2rem" }}>
            {endingSoon.map((p, i) => <ParallelCard key={`e-${p.id}-${i}`} p={p} tc={tierColors[p.tier]} index={i} actionLabel={p.timeLeft ?? "ENDING"} actionColor="var(--score-hot)" />)}
          </div>
        </>
      )}

      {/* BUY NOW section */}
      {binOnly.length > 0 && (
        <>
          <h2 className="mono" style={{ fontSize: "0.8rem", color: "var(--buy-now)", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
            BUY NOW — fixed price
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {binOnly.map((p, i) => <ParallelCard key={`b-${p.id}-${i}`} p={p} tc={tierColors[p.tier]} index={i} actionLabel="BUY NOW" actionColor="var(--buy-now)" />)}
          </div>
        </>
      )}

      {parallels.length === 0 && (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: "8px" }}>
          <span className="mono">NO NUMBERED PARALLELS FOUND</span>
        </div>
      )}
    </main>
  );
}

function ParallelCard({ p, tc, index, actionLabel, actionColor }: {
  p: ParallelListing;
  tc: { color: string; label: string };
  index: number;
  actionLabel: string;
  actionColor: string;
}) {
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 50px 1fr auto",
        gap: "0.75rem",
        alignItems: "center",
        padding: "0.6rem 0.75rem",
        background: "var(--bg-card)",
        border: `1px solid ${tc.color}25`,
        borderLeft: `3px solid ${tc.color}`,
        borderRadius: "6px",
        textDecoration: "none",
        color: "inherit",
        animation: `fadeInUp 0.25s ease-out ${index * 20}ms both`,
      }}
    >
      {/* Image */}
      {p.imageUrl ? (
        <img src={p.imageUrl} alt="" style={{ width: "40px", height: "52px", objectFit: "contain", borderRadius: "3px" }} />
      ) : (
        <div style={{ width: "40px" }} />
      )}

      {/* Tier */}
      <div style={{ textAlign: "center" }}>
        <div className="mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: tc.color }}>{p.numbered}</div>
        <div className="mono" style={{ fontSize: "0.45rem", color: tc.color, opacity: 0.6 }}>{tc.label}</div>
      </div>

      {/* Content */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
        <div style={{ fontSize: "0.65rem", color: "var(--accent)", marginTop: "0.15rem" }}>{p.player}</div>
      </div>

      {/* Price + action */}
      <div style={{ textAlign: "right", minWidth: "90px" }}>
        <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          ${p.priceUSD < 1000 ? p.priceUSD.toFixed(2) : p.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
        <div className="mono" style={{ fontSize: "0.5rem", fontWeight: 600, padding: "1px 6px", borderRadius: "3px", background: `${actionColor}15`, color: actionColor, display: "inline-block", marginTop: "2px" }}>
          {actionLabel}
        </div>
      </div>
    </a>
  );
}
