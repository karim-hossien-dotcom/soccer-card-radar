import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

// Rookie profiles with research-backed signals (Apr 2026)
// Sources: Transfermarkt, ESPN, FotMob, SportsCardInvestor, Yahoo Sports
const rookieProfiles: Record<string, {
  age: number; club: string; league: string; pos: string;
  goals: number; assists: number; apps: number; rating: number;
  trend: string; signal: string; note: string; marketCap: string;
  photo: string; worldCup2026: boolean; priceDirection: string;
}> = {
  "Lamine Yamal": {
    age: 18, club: "Barcelona", league: "La Liga", pos: "RW",
    goals: 14, assists: 9, apps: 34, rating: 7.8, trend: "hot",
    signal: "HOLD", note: "Cards at ATH — 150-200% jumps. Four cards topped six figures. World Cup hype will push higher but buy window has passed.",
    marketCap: "high", worldCup2026: true, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/937958-1727938734.jpg",
  },
  "Lennart Karl": {
    age: 17, club: "Bayern Munich", league: "Bundesliga", pos: "AM",
    goals: 8, assists: 6, apps: 35, rating: 7.4, trend: "hot",
    signal: "BUY", note: "Broke Mbappe's UCL scoring record. Cards still early — pre-World Cup pricing. Best risk/reward rookie right now.",
    marketCap: "rising", worldCup2026: true, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1062628-1726643498.jpg",
  },
  "Ethan Nwaneri": {
    age: 17, club: "Arsenal", league: "Premier League", pos: "RW",
    goals: 5, assists: 3, apps: 28, rating: 7.1, trend: "hot",
    signal: "BUY", note: "Filling in for Saka at Arsenal. England U21. Cards undervalued — PL exposure + World Cup squad contender.",
    marketCap: "low", worldCup2026: true, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/946498-1727089927.jpg",
  },
  "Nico Paz": {
    age: 20, club: "Como", league: "Serie A", pos: "AM",
    goals: 12, assists: 6, apps: 32, rating: 7.68, trend: "hot",
    signal: "BUY", note: "12G 6A in Serie A. Real Madrid buy-back. Argentina World Cup squad. Cards still cheap — highest upside per dollar.",
    marketCap: "low", worldCup2026: true, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/948294-1724316705.jpg",
  },
  "Eli Junior Kroupi": {
    age: 17, club: "Bournemouth", league: "Premier League", pos: "FW",
    goals: 3, assists: 1, apps: 18, rating: 6.9, trend: "rising",
    signal: "BUY", note: "17yo getting PL minutes at Bournemouth. Cards extremely cheap. Speculative but massive ceiling.",
    marketCap: "very low", worldCup2026: false, priceDirection: "flat",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1091498-1725354600.jpg",
  },
  "Shea Lacey": {
    age: 18, club: "Manchester United", league: "PL2 / PL", pos: "RW",
    goals: 9, assists: 3, apps: 22, rating: 7.95, trend: "rising",
    signal: "BUY", note: "9G 3A in U21s. Amorim integrating him into first team. Man Utd tax = premium if he breaks through.",
    marketCap: "low", worldCup2026: false, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/926309-1727938734.jpg",
  },
  "Claudio Echeverri": {
    age: 19, club: "Girona (Man City loan)", league: "La Liga", pos: "AM",
    goals: 4, assists: 2, apps: 25, rating: 6.8, trend: "neutral",
    signal: "BUY", note: "Messi comps, quiet at Girona. Cards at floor price. Man City return or World Cup call = instant spike.",
    marketCap: "very low", worldCup2026: true, priceDirection: "flat",
    photo: "https://img.a.transfermarkt.technology/portrait/header/994536-1724680136.jpg",
  },
  "Endrick": {
    age: 19, club: "Lyon (Real Madrid loan)", league: "Ligue 1", pos: "ST",
    goals: 6, assists: 2, apps: 22, rating: 6.7, trend: "cooling",
    signal: "SELL", note: "On loan, not starting. Cards overpriced vs output. Sell into World Cup hype — Brazil squad guaranteed.",
    marketCap: "medium", worldCup2026: true, priceDirection: "down",
    photo: "https://img.a.transfermarkt.technology/portrait/header/971570-1722420907.jpg",
  },
  "Kobbie Mainoo": {
    age: 20, club: "Manchester United", league: "Premier League", pos: "CM",
    goals: 0, assists: 2, apps: 18, rating: 6.93, trend: "neutral",
    signal: "BUY", note: "0 goals = cards dipped. England World Cup squad locked. Buy the dip before tournament hype.",
    marketCap: "medium", worldCup2026: true, priceDirection: "flat",
    photo: "https://img.a.transfermarkt.technology/portrait/header/820374-1727089927.jpg",
  },
  "Senny Mayulu": {
    age: 18, club: "PSG", league: "Ligue 1", pos: "AM",
    goals: 3, assists: 4, apps: 20, rating: 7.0, trend: "rising",
    signal: "BUY", note: "PSG academy gem. France U21. Dual auto with Zaire-Emery at $199 is a steal long-term.",
    marketCap: "low", worldCup2026: false, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/934969-1727089927.jpg",
  },
  "Santiago Castro": {
    age: 20, club: "Bologna", league: "Serie A", pos: "ST",
    goals: 8, assists: 3, apps: 30, rating: 7.1, trend: "rising",
    signal: "BUY", note: "PSA 10 autos under $25. Argentina World Cup squad. Enormous value at current prices.",
    marketCap: "very low", worldCup2026: true, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/939498-1694590849.jpg",
  },
  "Geovany Quenda": {
    age: 17, club: "Sporting CP", league: "Liga Portugal", pos: "RW",
    goals: 4, assists: 5, apps: 28, rating: 7.2, trend: "rising",
    signal: "BUY", note: "Portuguese wonderkid. Auto PSA 10 at $20 = steal. Big club transfer this summer = 5-10x potential.",
    marketCap: "very low", worldCup2026: false, priceDirection: "up",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1096058-1727089927.jpg",
  },
  "Viktor Gyokeres": {
    age: 27, club: "Arsenal", league: "Premier League", pos: "ST",
    goals: 12, assists: 0, apps: 26, rating: 6.77, trend: "neutral",
    signal: "SELL", note: "Card prices peaked at Arsenal transfer. 0 assists. Not a rookie — limited upside. Take profits.",
    marketCap: "high", worldCup2026: true, priceDirection: "down",
    photo: "https://img.a.transfermarkt.technology/portrait/header/325443-1727089927.jpg",
  },
};

export default async function HomePage() {
  const { data: listings } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, imageUrl, platform, rawData")
    .order("priceUSD", { ascending: true });

  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("player")
    .eq("active", true);

  const { count: totalListings } = await supabase
    .from("Listing")
    .select("id", { count: "exact", head: true });

  const { count: totalMatches } = await supabase
    .from("MatchScore")
    .select("id", { count: "exact", head: true });

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
  for (const p of playerNames) listingsByPlayer[p] = [];
  const usedIds = new Set<string>();

  // Only keep numbered (/99 or less), SSP, case hits, 1/1
  function isCollectible(title: string): boolean {
    const t = title.toLowerCase();
    // Numbered /99 or less
    const numMatch = t.match(/\/(\d+)\b/);
    if (numMatch && parseInt(numMatch[1]) <= 99) return true;
    // SSP, case hit, 1/1
    if (t.includes("ssp") || t.includes("case hit") || t.includes("1/1")) return true;
    // Auto (autos are always collectible)
    if (t.includes("auto") || t.includes("autograph") || t.includes("signature")) return true;
    // Graded
    if (t.includes("psa") || t.includes("bgs") || t.includes("sgc") || t.includes("cgc")) return true;
    // Skip everything else (base, common refractors, /150+, etc.)
    return false;
  }

  for (const l of listings ?? []) {
    if (!isCollectible(l.title)) continue;
    const player = findPlayer(l.title);
    if (player && !usedIds.has(l.id)) {
      listingsByPlayer[player]!.push(l);
      usedIds.add(l.id);
    }
  }

  // Top 5 best-value cards per player
  function cardValueScore(title: string, price: number): number {
    const t = title.toLowerCase();
    let score = 0;
    if (t.includes("auto") || t.includes("autograph")) score += 100;
    if (t.match(/\/[0-9]{1,2}\b/)) score += 80;
    if (t.match(/\/[0-9]{2,3}\b/)) score += 40;
    if (t.includes("psa 10") || t.includes("bgs 10")) score += 60;
    if (t.includes("ssp") || t.includes("case hit")) score += 50;
    score += Math.max(0, 50 - price / 10);
    return score;
  }

  for (const p of playerNames) {
    const cards = listingsByPlayer[p] ?? [];
    cards.sort((a, b) => cardValueScore(b.title, b.priceUSD) - cardValueScore(a.title, a.priceUSD));
    listingsByPlayer[p] = cards.slice(0, 5);
  }

  const buySignals = Object.values(rookieProfiles).filter((r) => r.signal === "BUY").length;
  const sellSignals = Object.values(rookieProfiles).filter((r) => r.signal === "SELL").length;
  const wcPlayers = Object.values(rookieProfiles).filter((r) => r.worldCup2026).length;

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 3rem", position: "relative", zIndex: 1 }}>

      {/* Market Intelligence Banner */}
      <div style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Market Intelligence</h2>
          <span className="mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>
            World Cup 2026: ~50 days away
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
          <MetricBox label="Players" value={entities?.length ?? 0} sub="tracked" />
          <MetricBox label="Listings" value={totalListings ?? 0} sub="live on eBay" />
          <MetricBox label="Matches" value={totalMatches ?? 0} sub="scored" />
          <MetricBox label="Buy Signals" value={buySignals} sub="rookies" color="var(--buy-now)" />
          <MetricBox label="WC Squad" value={wcPlayers} sub="of 13 rookies" color="var(--accent-secondary)" />
        </div>
      </div>

      {/* Scan timing info */}
      <div style={{
        background: "var(--bg-surface)",
        borderRadius: "8px",
        padding: "0.75rem 1rem",
        marginBottom: "1.5rem",
        fontSize: "0.75rem",
        color: "var(--text-secondary)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <strong style={{ color: "var(--text-primary)" }}>Best scan times:</strong>{" "}
          Tue-Thu 10am-2pm EST (low competition) | Sun 6-10pm EST (most auctions ending)
        </div>
        <a
          href="/api/scan"
          target="_blank"
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: "5px",
            background: "var(--accent)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Run Scan Now
        </a>
      </div>

      {/* Rookie Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {playerNames.map((name, i) => {
          const r = rookieProfiles[name];
          const cards = (listingsByPlayer[name] ?? []).slice(0, 5);

          const signalStyles: Record<string, { color: string; bg: string }> = {
            BUY: { color: "#fff", bg: "#0d9f4f" },
            SELL: { color: "#fff", bg: "#dc2626" },
            HOLD: { color: "#fff", bg: "#7c3aed" },
            WATCH: { color: "#fff", bg: "#2563eb" },
          };
          const sig = signalStyles[r.signal] ?? signalStyles.WATCH;

          const dirArrow = r.priceDirection === "up" ? "&#9650;" : r.priceDirection === "down" ? "&#9660;" : "&#9644;";
          const dirColor = r.priceDirection === "up" ? "var(--buy-now)" : r.priceDirection === "down" ? "var(--accent-secondary)" : "var(--text-muted)";

          const trendIcon = r.trend === "hot" ? "&#128293;" : r.trend === "rising" ? "&#9650;" : r.trend === "cooling" ? "&#9660;" : "&#8212;";

          return (
            <div
              key={name}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.25rem",
                boxShadow: "var(--shadow-sm)",
                animation: `fadeInUp 0.3s ease-out ${i * 35}ms both`,
              }}
            >
              {/* Player header */}
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                <img
                  src={r.photo}
                  alt={name}
                  style={{
                    width: "60px", height: "60px", borderRadius: "50%",
                    objectFit: "cover", border: "2px solid var(--border)", flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.05rem", fontWeight: 700 }}>{name}</span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500 }}>{r.age}yo</span>
                        {r.worldCup2026 && (
                          <span style={{ fontSize: "0.55rem", padding: "1px 6px", borderRadius: "3px", background: "#dc262612", color: "#dc2626", fontWeight: 600 }}>
                            WC 2026
                          </span>
                        )}
                        <span dangerouslySetInnerHTML={{ __html: dirArrow }} style={{ color: dirColor, fontSize: "0.7rem" }} />
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                        {r.club} &middot; {r.league} &middot; {r.pos}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "4px 14px",
                      borderRadius: "5px", background: sig.bg, color: sig.color,
                    }}>
                      {r.signal}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.6rem", alignItems: "center" }}>
                    <Stat label="G" value={r.goals} />
                    <Stat label="A" value={r.assists} />
                    <Stat label="APP" value={r.apps} />
                    <Stat label="RTG" value={r.rating.toFixed(1)} />
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                      <span dangerouslySetInnerHTML={{ __html: trendIcon }} /> {r.trend}
                    </div>
                    <div style={{
                      fontSize: "0.6rem", fontWeight: 600,
                      color: r.marketCap === "very low" ? "var(--buy-now)" : r.marketCap === "low" ? "#c77d15" : "var(--text-muted)",
                    }}>
                      MKT: {r.marketCap.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analysis */}
              <div className="serif" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.75rem", fontStyle: "italic" }}>
                {r.note}
              </div>

              {/* Card grid */}
              {cards.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  {cards.map((card) => {
                    const raw = card.rawData as Record<string, unknown> | null;
                    const isBIN = raw?.isBIN === true;
                    const acceptsOffers = raw?.acceptsOffers === true;
                    const isAuction = raw?.isAuction === true;
                    const label = isBIN && acceptsOffers ? "OFFER" : isBIN ? "BUY" : isAuction ? "BID" : "BUY";
                    const labelColor = acceptsOffers ? "#c77d15" : isBIN ? "#0d9f4f" : "#dc2626";

                    return (
                      <a key={card.id} href={card.url} target="_blank" rel="noopener" style={{
                        display: "flex", flexDirection: "column", background: "var(--bg-surface)",
                        border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden",
                        textDecoration: "none", color: "inherit", transition: "box-shadow 0.15s",
                      }}>
                        {card.imageUrl && (
                          <img src={card.imageUrl} alt="" style={{ width: "100%", height: "110px", objectFit: "contain", background: "#fff", padding: "4px" }} />
                        )}
                        <div style={{ padding: "0.4rem 0.5rem" }}>
                          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {card.title}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                            <span className="mono" style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                              ${card.priceUSD < 1000 ? card.priceUSD.toFixed(2) : card.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </span>
                            <span style={{ fontSize: "0.5rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: `${labelColor}15`, color: labelColor }}>
                              {label}
                            </span>
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Marketplace links */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {[
                  { label: "eBay", url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(name + " auto /50 OR /25 OR /10 -base -lot -leaf")}&_sacat=212`, color: "#e53238" },
                  { label: "Sold Comps", url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(name + " auto /50 OR /25 OR /10")}&_sacat=212&LH_Complete=1&LH_Sold=1`, color: "#8b0000" },
                  { label: "Cardmarket", url: `https://www.cardmarket.com/en/OtherTCG/Products/Search?searchString=${encodeURIComponent(name)}`, color: "#0a4d8c" },
                  { label: "Price Guide", url: `https://www.sportscardinvestor.com/subjects/${encodeURIComponent(name.toLowerCase().replace(/ /g, "-"))}-soccer`, color: "#2563eb" },
                ].map((link) => (
                  <a key={link.label} href={link.url} target="_blank" rel="noopener" style={{
                    fontSize: "0.6rem", padding: "3px 8px", borderRadius: "4px",
                    background: "var(--bg-surface)", color: link.color, fontWeight: 600,
                    border: "1px solid var(--border)", textDecoration: "none",
                  }}>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function MetricBox({ label, value, sub, color }: { label: string; value: number; sub: string; color?: string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: "1.5rem", fontWeight: 800, color: color ?? "var(--text-primary)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.25rem" }}>{label}</div>
      <div style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: "0.5rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}
