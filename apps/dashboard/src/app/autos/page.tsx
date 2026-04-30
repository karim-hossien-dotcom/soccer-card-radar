import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

type AutoType = "on_card" | "dual" | "relic_auto";

interface AutoListing {
  id: string;
  title: string;
  priceUSD: number;
  url: string;
  player: string;
  autoType: AutoType;
  numbered: string | null;
  grade: string | null;
  imageUrl: string | null;
  isBIN: boolean;
  acceptsOffers: boolean;
  isAuction: boolean;
  endingSoon: boolean;
  timeLeft: string | null;
}

function detectAutoType(title: string): AutoType | null {
  const t = title.toLowerCase();
  if (!t.includes("auto") && !t.includes("autograph") && !t.includes("signature")) return null;
  if (t.includes("dual") || t.includes("match ball") || t.includes("pairings") || t.includes("triple auto")) return "dual";
  if (t.includes("relic") || t.includes("patch") || t.includes("materials") || t.includes("jersey")) return "relic_auto";
  return "on_card";
}

function extractPlayer(title: string, players: string[]): string {
  const t = title.toLowerCase();
  for (const p of players) {
    const last = p.split(" ").pop()!.toLowerCase();
    if (last.length >= 3 && t.includes(last)) return p;
  }
  return "Unknown";
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

  const { data: entities } = await supabase.from("TrackedEntity").select("player").eq("active", true);
  const playerNames = (entities ?? []).map((e) => e.player);

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  const autos: AutoListing[] = (listings ?? [])
    .map((l) => {
      const autoType = detectAutoType(l.title);
      if (!autoType) return null;

      // Only show numbered autos (/99 or less), graded, SSP, or case hits
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

      // Hide auctions 2+ days out
      if (isAuction && !isBIN && endDate && endDate - now > 2 * twentyFourHours) return null;

      const endingSoon = endDate ? endDate - now < twentyFourHours && endDate > now : false;
      let timeLeft: string | null = null;
      if (endDate && endDate > now) {
        const diff = endDate - now;
        const hours = Math.floor(diff / (60 * 60 * 1000));
        const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
        timeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      }

      const numMatch = l.title.match(/\/(\d+)\b/);

      return {
        id: l.id,
        title: l.title,
        priceUSD: l.priceUSD,
        url: l.url,
        player: extractPlayer(l.title, playerNames),
        autoType,
        numbered: numMatch ? `/${numMatch[1]}` : null,
        grade: detectGrade(l.title),
        imageUrl: l.imageUrl,
        isBIN,
        acceptsOffers,
        isAuction,
        endingSoon,
        timeLeft,
      };
    })
    .filter(Boolean) as AutoListing[];

  const offers = autos.filter((a) => a.isBIN && a.acceptsOffers);
  const endingSoon = autos.filter((a) => a.isAuction && a.endingSoon);
  const binOnly = autos.filter((a) => a.isBIN && !a.acceptsOffers);

  offers.sort((a, b) => a.priceUSD - b.priceUSD);
  endingSoon.sort((a, b) => (a.timeLeft ?? "999").localeCompare(b.timeLeft ?? "999"));
  binOnly.sort((a, b) => a.priceUSD - b.priceUSD);

  const typeColors: Record<AutoType, { color: string; label: string }> = {
    on_card: { color: "var(--buy-now)", label: "ON-CARD" },
    dual: { color: "#c084fc", label: "DUAL" },
    relic_auto: { color: "var(--bid)", label: "RELIC" },
  };

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 2rem", position: "relative", zIndex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "var(--bid-bg)", border: "1px solid var(--bid)22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--bid)" }}>{offers.length}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--bid)", opacity: 0.7 }}>SEND OFFERS</div>
        </div>
        <div style={{ background: "#ff444415", border: "1px solid #ff444422", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--score-hot)" }}>{endingSoon.length}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--score-hot)", opacity: 0.7 }}>ENDING &lt;24H</div>
        </div>
        <div style={{ background: "var(--buy-now-bg)", border: "1px solid var(--buy-now)22", borderRadius: "8px", padding: "0.75rem" }}>
          <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--buy-now)" }}>{binOnly.length}</div>
          <div className="mono" style={{ fontSize: "0.55rem", color: "var(--buy-now)", opacity: 0.7 }}>BUY NOW</div>
        </div>
      </div>

      {/* SEND OFFERS */}
      {offers.length > 0 && (
        <>
          <h2 className="mono" style={{ fontSize: "0.8rem", color: "var(--bid)", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
            SEND OFFERS — {offers.length} autos accepting offers
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "2rem" }}>
            {offers.map((a, i) => <AutoCard key={`o-${a.id}-${i}`} a={a} tc={typeColors[a.autoType]} index={i} actionLabel="SEND OFFER" actionColor="var(--bid)" />)}
          </div>
        </>
      )}

      {/* ENDING SOON */}
      {endingSoon.length > 0 && (
        <>
          <h2 className="mono" style={{ fontSize: "0.8rem", color: "var(--score-hot)", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
            ENDING SOON — auctions closing within 24h
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "2rem" }}>
            {endingSoon.map((a, i) => <AutoCard key={`e-${a.id}-${i}`} a={a} tc={typeColors[a.autoType]} index={i} actionLabel={a.timeLeft ?? "ENDING"} actionColor="var(--score-hot)" />)}
          </div>
        </>
      )}

      {/* BUY NOW */}
      {binOnly.length > 0 && (
        <>
          <h2 className="mono" style={{ fontSize: "0.8rem", color: "var(--buy-now)", marginBottom: "0.75rem", letterSpacing: "0.08em" }}>
            BUY NOW — fixed price autos
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {binOnly.map((a, i) => <AutoCard key={`b-${a.id}-${i}`} a={a} tc={typeColors[a.autoType]} index={i} actionLabel="BUY NOW" actionColor="var(--buy-now)" />)}
          </div>
        </>
      )}
    </main>
  );
}

function AutoCard({ a, tc, index, actionLabel, actionColor }: {
  a: AutoListing;
  tc: { color: string; label: string };
  index: number;
  actionLabel: string;
  actionColor: string;
}) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 70px 1fr auto",
        gap: "0.75rem",
        alignItems: "center",
        padding: "0.6rem 0.75rem",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        textDecoration: "none",
        color: "inherit",
        animation: `fadeInUp 0.25s ease-out ${index * 20}ms both`,
      }}
    >
      {a.imageUrl ? (
        <img src={a.imageUrl} alt="" style={{ width: "40px", height: "52px", objectFit: "contain", borderRadius: "3px" }} />
      ) : <div style={{ width: "40px" }} />}

      <div style={{ textAlign: "center" }}>
        <div className="mono" style={{ fontSize: "0.55rem", fontWeight: 600, color: tc.color }}>{tc.label}</div>
        {a.numbered && <div className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, marginTop: "1px" }}>{a.numbered}</div>}
        {a.grade && <div className="mono" style={{ fontSize: "0.45rem", padding: "1px 3px", borderRadius: "2px", background: "var(--bg-surface)", color: "var(--bid)", marginTop: "2px", display: "inline-block" }}>{a.grade}</div>}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
        <div style={{ fontSize: "0.65rem", color: "var(--accent)", marginTop: "0.15rem" }}>{a.player}</div>
      </div>

      <div style={{ textAlign: "right", minWidth: "90px" }}>
        <div className="mono" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
          ${a.priceUSD < 1000 ? a.priceUSD.toFixed(2) : a.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </div>
        <div className="mono" style={{ fontSize: "0.5rem", fontWeight: 600, padding: "1px 6px", borderRadius: "3px", background: `${actionColor}15`, color: actionColor, display: "inline-block", marginTop: "2px" }}>
          {actionLabel}
        </div>
      </div>
    </a>
  );
}
