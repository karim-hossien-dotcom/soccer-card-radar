import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

// Rookie profiles with stats + headshot URLs from public sources
const rookieProfiles: Record<string, {
  age: number; club: string; league: string; pos: string;
  goals: number; assists: number; apps: number; rating: number;
  trend: string; signal: string; note: string; marketCap: string;
  photo: string;
}> = {
  "Lamine Yamal": {
    age: 18, club: "Barcelona", league: "La Liga", pos: "RW",
    goals: 14, assists: 9, apps: 34, rating: 7.8, trend: "hot",
    signal: "BUY", note: "2nd in Ballon d'Or. First teenager to finish top 2. Cards at ATH but sustained demand.",
    marketCap: "high",
    photo: "https://img.a.transfermarkt.technology/portrait/header/937958-1727938734.jpg",
  },
  "Lennart Karl": {
    age: 17, club: "Bayern Munich", league: "Bundesliga", pos: "AM",
    goals: 8, assists: 6, apps: 35, rating: 7.4, trend: "hot",
    signal: "BUY", note: "Broke Mbappe's consecutive UCL scoring record. Bayern's youngest UCL scorer. Cards still early.",
    marketCap: "rising",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1062628-1726643498.jpg",
  },
  "Ethan Nwaneri": {
    age: 17, club: "Arsenal", league: "Premier League", pos: "RW",
    goals: 5, assists: 3, apps: 28, rating: 7.1, trend: "hot",
    signal: "BUY", note: "Filling in for Saka. Two-footed nightmare for defenders. Cards undervalued.",
    marketCap: "low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/946498-1727089927.jpg",
  },
  "Nico Paz": {
    age: 20, club: "Como", league: "Serie A", pos: "AM",
    goals: 12, assists: 6, apps: 32, rating: 7.68, trend: "hot",
    signal: "BUY", note: "12G 6A in Serie A at 20. Real Madrid buy-back. Cards still cheap for his output.",
    marketCap: "low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/948294-1724316705.jpg",
  },
  "Eli Junior Kroupi": {
    age: 17, club: "Bournemouth", league: "Premier League", pos: "FW",
    goals: 3, assists: 1, apps: 18, rating: 6.9, trend: "rising",
    signal: "BUY", note: "17yo getting PL minutes. Cards extremely cheap. High ceiling, low floor.",
    marketCap: "very low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1091498-1725354600.jpg",
  },
  "Shea Lacey": {
    age: 18, club: "Manchester United", league: "PL2 / PL", pos: "RW",
    goals: 9, assists: 3, apps: 22, rating: 7.95, trend: "rising",
    signal: "BUY", note: "9G 3A in U21s. Amorim integrating him. Cards heating up but accessible.",
    marketCap: "low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/926309-1727938734.jpg",
  },
  "Claudio Echeverri": {
    age: 19, club: "Girona (Man City loan)", league: "La Liga", pos: "AM",
    goals: 4, assists: 2, apps: 25, rating: 6.8, trend: "neutral",
    signal: "WATCH", note: "Messi comps but quiet at Girona. Wait for Man City integration. Cards cheap = low risk.",
    marketCap: "very low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/994536-1724680136.jpg",
  },
  "Endrick": {
    age: 19, club: "Lyon (Real Madrid loan)", league: "Ligue 1", pos: "ST",
    goals: 6, assists: 2, apps: 22, rating: 6.7, trend: "cooling",
    signal: "WATCH", note: "On loan from Real Madrid. Not a starter. Cards overpriced relative to output.",
    marketCap: "medium",
    photo: "https://img.a.transfermarkt.technology/portrait/header/971570-1722420907.jpg",
  },
  "Kobbie Mainoo": {
    age: 20, club: "Manchester United", league: "Premier League", pos: "CM",
    goals: 0, assists: 2, apps: 18, rating: 6.93, trend: "neutral",
    signal: "BUY", note: "0 goals but key midfielder. Cards dipped — good entry point. England international.",
    marketCap: "medium",
    photo: "https://img.a.transfermarkt.technology/portrait/header/820374-1727089927.jpg",
  },
  "Senny Mayulu": {
    age: 18, club: "PSG", league: "Ligue 1", pos: "AM",
    goals: 3, assists: 4, apps: 20, rating: 7.0, trend: "rising",
    signal: "BUY", note: "PSG academy gem getting minutes. Dual auto with Zaire-Emery available cheap.",
    marketCap: "low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/934969-1727089927.jpg",
  },
  "Santiago Castro": {
    age: 20, club: "Bologna", league: "Serie A", pos: "ST",
    goals: 8, assists: 3, apps: 30, rating: 7.1, trend: "rising",
    signal: "BUY", note: "Consistent Serie A performer. PSA 10 autos under $25. Great value.",
    marketCap: "very low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/939498-1694590849.jpg",
  },
  "Geovany Quenda": {
    age: 17, club: "Sporting CP", league: "Liga Portugal", pos: "RW",
    goals: 4, assists: 5, apps: 28, rating: 7.2, trend: "rising",
    signal: "BUY", note: "Portuguese wonderkid. Auto PSA 10 at $20 = steal if he moves to a big club.",
    marketCap: "very low",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1096058-1727089927.jpg",
  },
  "Viktor Gyokeres": {
    age: 27, club: "Arsenal", league: "Premier League", pos: "ST",
    goals: 12, assists: 0, apps: 26, rating: 6.77, trend: "neutral",
    signal: "WATCH", note: "12 goals but 0 assists. Card prices peaked at transfer — wait for dip.",
    marketCap: "high",
    photo: "https://img.a.transfermarkt.technology/portrait/header/325443-1727089927.jpg",
  },
};

export default async function RookiesPage() {
  // Get real listings for each rookie from DB
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, platform, rawData")
    .order("priceUSD", { ascending: true });

  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("player")
    .eq("active", true);

  const playerNames = Object.keys(rookieProfiles);

  // Group listings by player
  function findPlayer(title: string): string | null {
    const t = title.toLowerCase();
    for (const p of playerNames) {
      const last = p.split(" ").pop()!.toLowerCase();
      if (last.length >= 3 && t.includes(last)) {
        const first = p.split(" ")[0].toLowerCase();
        if (first.length >= 3 && t.includes(first)) return p;
        if (last.length >= 5) return p;
      }
    }
    return null;
  }

  const listingsByPlayer: Record<string, typeof listings> = {};
  const usedListingIds = new Set<string>();

  for (const p of playerNames) listingsByPlayer[p] = [];

  for (const l of listings ?? []) {
    const player = findPlayer(l.title);
    if (player && !usedListingIds.has(l.id)) {
      listingsByPlayer[player]!.push(l);
      usedListingIds.add(l.id);
    }
  }

  // Rank cards by value: autos + numbered first, then cheapest
  function cardValueScore(title: string, price: number): number {
    const t = title.toLowerCase();
    let score = 0;
    if (t.includes("auto") || t.includes("autograph")) score += 100;
    if (t.match(/\/[0-9]{1,2}\b/)) score += 80; // low numbered
    if (t.match(/\/[0-9]{2,3}\b/)) score += 40;
    if (t.includes("psa 10") || t.includes("bgs 10")) score += 60;
    if (t.includes("rc") || t.includes("rookie")) score += 30;
    if (t.includes("ssp") || t.includes("case hit")) score += 50;
    // Cheaper = better value (inverse price, capped)
    score += Math.max(0, 50 - price / 10);
    return score;
  }

  for (const p of playerNames) {
    const cards = listingsByPlayer[p] ?? [];
    cards.sort((a, b) => cardValueScore(b.title, b.priceUSD) - cardValueScore(a.title, a.priceUSD));
    listingsByPlayer[p] = cards.slice(0, 5);
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 2rem", position: "relative", zIndex: 1 }}>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
        {playerNames.length} rookies tracked — live eBay listings + season stats + buy/sell signals
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {playerNames.map((name, i) => {
          const r = rookieProfiles[name];
          const cards = (listingsByPlayer[name] ?? []).slice(0, 6);
          const signalColor = r.signal === "BUY" ? "var(--buy-now)" : r.signal === "SELL" ? "var(--score-hot)" : "var(--bid)";
          const signalBg = r.signal === "BUY" ? "var(--buy-now-bg)" : r.signal === "SELL" ? "#ff444415" : "var(--bid-bg)";
          const trendIcon = r.trend === "hot" ? "▲▲" : r.trend === "rising" ? "▲" : r.trend === "cooling" ? "▼" : "—";
          const trendColor = r.trend === "hot" ? "var(--score-hot)" : r.trend === "rising" ? "var(--buy-now)" : r.trend === "cooling" ? "var(--score-hot)" : "var(--text-muted)";

          return (
            <div
              key={name}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.25rem",
                animation: `fadeInUp 0.3s ease-out ${i * 40}ms both`,
              }}
            >
              {/* Player header */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                {/* Photo */}
                <img
                  src={r.photo}
                  alt={name}
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid var(--border)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>{name}</span>
                        <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)", padding: "1px 5px", borderRadius: "3px", background: "var(--bg-surface)" }}>{r.age}yo</span>
                        <span className="mono" style={{ fontSize: "0.7rem", fontWeight: 700, color: trendColor }}>{trendIcon}</span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                        {r.club} · {r.league} · {r.pos}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: "0.65rem", fontWeight: 700, padding: "4px 12px", borderRadius: "4px", background: signalBg, color: signalColor, letterSpacing: "0.06em" }}>
                      {r.signal}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.5rem" }}>
                    {[
                      { l: "G", v: r.goals },
                      { l: "A", v: r.assists },
                      { l: "APP", v: r.apps },
                      { l: "RTG", v: r.rating.toFixed(1) },
                    ].map((s) => (
                      <div key={s.l} style={{ textAlign: "center" }}>
                        <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{s.v}</div>
                        <div className="mono" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>{s.l}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: "center" }}>
                      <div className="mono" style={{ fontSize: "0.65rem", fontWeight: 600, color: r.marketCap === "very low" ? "var(--buy-now)" : r.marketCap === "low" ? "var(--bid)" : "var(--text-secondary)" }}>
                        {r.marketCap.toUpperCase()}
                      </div>
                      <div className="mono" style={{ fontSize: "0.45rem", color: "var(--text-muted)" }}>MKT</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
                {r.note}
              </div>

              {/* Real card listings with images */}
              {cards.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.5rem" }}>
                  {cards.map((card) => {
                    const raw = card.rawData as Record<string, unknown> | null;
                    const isBIN = raw?.isBIN === true;
                    const acceptsOffers = raw?.acceptsOffers === true;
                    const isAuction = raw?.isAuction === true;
                    const buyLabel = isBIN && acceptsOffers ? "SEND OFFER" : isBIN ? "BUY NOW" : isAuction ? "AUCTION" : "BUY";
                    const buyColor = acceptsOffers ? "var(--bid)" : isBIN ? "var(--buy-now)" : "var(--score-hot)";

                    return (
                      <a
                        key={card.id}
                        href={card.url}
                        target="_blank"
                        rel="noopener"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          overflow: "hidden",
                          textDecoration: "none",
                          color: "inherit",
                        }}
                      >
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt=""
                            style={{ width: "100%", height: "120px", objectFit: "contain", background: "#1a1a24", padding: "4px" }}
                          />
                        )}
                        <div style={{ padding: "0.4rem 0.5rem" }}>
                          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {card.title}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                            <div className="mono" style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                              ${card.priceUSD < 1000 ? card.priceUSD.toFixed(2) : card.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </div>
                            <span className="mono" style={{ fontSize: "0.5rem", fontWeight: 600, padding: "1px 5px", borderRadius: "3px", background: `${buyColor}15`, color: buyColor }}>
                              {buyLabel}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Marketplace search links */}
              <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                <a href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(name + " card auto")}&_sacat=212`} target="_blank" rel="noopener" className="mono" style={{ fontSize: "0.55rem", padding: "3px 8px", borderRadius: "3px", background: "var(--bg-surface)", color: "var(--watch)", border: "1px solid var(--border)", textDecoration: "none" }}>
                  eBay
                </a>
                <a href={`https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(name + " soccer card")}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: "0.55rem", padding: "3px 8px", borderRadius: "3px", background: "var(--bg-surface)", color: "#1877f2", border: "1px solid var(--border)", textDecoration: "none" }}>
                  FB Marketplace
                </a>
                <a href={`https://www.mercari.com/search/?keyword=${encodeURIComponent(name + " card")}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: "0.55rem", padding: "3px 8px", borderRadius: "3px", background: "var(--bg-surface)", color: "#ef4444", border: "1px solid var(--border)", textDecoration: "none" }}>
                  Mercari
                </a>
                <a href={`https://www.comc.com/Players/Soccer/${encodeURIComponent(name.replace(/ /g, "_"))}`} target="_blank" rel="noopener" className="mono" style={{ fontSize: "0.55rem", padding: "3px 8px", borderRadius: "3px", background: "var(--bg-surface)", color: "var(--bid)", border: "1px solid var(--border)", textDecoration: "none" }}>
                  COMC
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
