import { supabase } from "@soccer-card-radar/db";

export const dynamic = "force-dynamic";

// Rookie data — researched from Transfermarkt, ESPN, FotMob (Apr 2026)
const rookieStats = [
  {
    player: "Lamine Yamal", age: 18, club: "Barcelona", league: "La Liga", pos: "RW",
    goals: 14, assists: 9, apps: 34, rating: 7.8, trend: "hot",
    cardSignal: "BUY", note: "2nd in Ballon d'Or. First teenager to finish top 2. Cards at ATH but sustained demand.",
    keyCards: ["2023 Topps Chrome RC #64", "2024-25 Obsidian Iridescent SSP", "2023 Chrome Auto #CA-LY"],
    marketCap: "high",
  },
  {
    player: "Lennart Karl", age: 17, club: "Bayern Munich", league: "Bundesliga", pos: "AM",
    goals: 8, assists: 6, apps: 35, rating: 7.4, trend: "hot",
    cardSignal: "BUY", note: "Broke Mbappe's consecutive UCL scoring record. Bayern's youngest-ever UCL scorer. Cards still early.",
    keyCards: ["2025-26 Topps Chrome Bundesliga RC", "2025-26 Topps Deco Auto /10"],
    marketCap: "rising",
  },
  {
    player: "Ethan Nwaneri", age: 17, club: "Arsenal", league: "Premier League", pos: "RW",
    goals: 5, assists: 3, apps: 28, rating: 7.1, trend: "hot",
    cardSignal: "BUY", note: "Filling in for Saka. Two-footed nightmare for defenders. Arsenal's future. Cards undervalued.",
    keyCards: ["2024 Topps Chrome Auto Black Lazer /99", "2024-25 Finest Auto"],
    marketCap: "low",
  },
  {
    player: "Nico Paz", age: 20, club: "Como → Real Madrid", league: "Serie A", pos: "AM",
    goals: 12, assists: 6, apps: 32, rating: 7.68, trend: "hot",
    cardSignal: "BUY", note: "12G 6A in Serie A at 20. Real Madrid buy-back clause. Cards still cheap for his output.",
    keyCards: ["2023-24 Chrome Sapphire Gold RC /50", "2023-24 Megacracks RC"],
    marketCap: "low",
  },
  {
    player: "Viktor Gyokeres", age: 27, club: "Arsenal", league: "Premier League", pos: "ST",
    goals: 12, assists: 0, apps: 26, rating: 6.77, trend: "neutral",
    cardSignal: "WATCH", note: "12 goals but 0 assists. First PL season. Card prices peaked at transfer — wait for form dip to buy.",
    keyCards: ["2026 Chrome PL Auto Red Wave /5"],
    marketCap: "high",
  },
  {
    player: "Eli Junior Kroupi", age: 17, club: "Bournemouth", league: "Premier League", pos: "FW",
    goals: 3, assists: 1, apps: 18, rating: 6.9, trend: "rising",
    cardSignal: "BUY", note: "17-year-old getting PL minutes. Cards extremely cheap. High ceiling, low floor.",
    keyCards: ["2026 Topps Chrome Sapphire Gold /50", "2026 Finest Gold /50"],
    marketCap: "very low",
  },
  {
    player: "Shea Lacey", age: 18, club: "Manchester United", league: "PL2 / PL", pos: "RW",
    goals: 9, assists: 3, apps: 22, rating: 7.95, trend: "rising",
    cardSignal: "BUY", note: "9G 3A in U21s. Amorim integrating him. Cards heating up but still accessible.",
    keyCards: ["2025-26 Chrome PL Orange Auto /25", "2025-26 Chrome Gold RayWave /50"],
    marketCap: "low",
  },
  {
    player: "Claudio Echeverri", age: 19, club: "Girona (loan from Man City)", league: "La Liga", pos: "AM",
    goals: 4, assists: 2, apps: 25, rating: 6.8, trend: "neutral",
    cardSignal: "WATCH", note: "Messi comps but quiet season at Girona. Wait for Man City integration. Cards cheap = low risk entry.",
    keyCards: ["2025-26 Chrome Bundesliga Gold /50 RC", "2025-26 All-Etch SSP"],
    marketCap: "very low",
  },
  {
    player: "Endrick", age: 19, club: "Olympique Lyon (loan)", league: "Ligue 1", pos: "ST",
    goals: 6, assists: 2, apps: 22, rating: 6.7, trend: "cooling",
    cardSignal: "WATCH", note: "On loan from Real Madrid. Not a starter. Cards overpriced relative to current production. Wait.",
    keyCards: ["2024-25 Merlin Gold Refractor /50 RC", "2023-24 Obsidian Aurora Auto PSA 10"],
    marketCap: "medium",
  },
  {
    player: "Kobbie Mainoo", age: 20, club: "Manchester United", league: "Premier League", pos: "CM",
    goals: 0, assists: 2, apps: 18, rating: 6.93, trend: "neutral",
    cardSignal: "BUY", note: "0 goals this season but still a key midfielder. Cards dipped — good entry point. England international.",
    keyCards: ["2022-23 Stadium Club Chrome Auto /25", "2024-25 Merlin Match Ball Auto /10"],
    marketCap: "medium",
  },
  {
    player: "Senny Mayulu", age: 18, club: "PSG", league: "Ligue 1", pos: "AM",
    goals: 3, assists: 4, apps: 20, rating: 7.0, trend: "rising",
    cardSignal: "BUY", note: "PSG academy product getting regular minutes. Dual auto with Zaire-Emery available cheap.",
    keyCards: ["2024-25 Merlin Auto RC", "2024-25 Finest Dual Auto Gold /50"],
    marketCap: "low",
  },
  {
    player: "Santiago Castro", age: 20, club: "Bologna", league: "Serie A", pos: "ST",
    goals: 8, assists: 3, apps: 30, rating: 7.1, trend: "rising",
    cardSignal: "BUY", note: "Consistent performer in Serie A. PSA 10 autos available under $25. Great value.",
    keyCards: ["2024 Merlin Chrome Gold Mojo /50 PSA 10", "2024 Merlin Pink Auto /199"],
    marketCap: "very low",
  },
  {
    player: "Geovany Quenda", age: 17, club: "Sporting CP", league: "Liga Portugal", pos: "RW",
    goals: 4, assists: 5, apps: 28, rating: 7.2, trend: "rising",
    cardSignal: "BUY", note: "Portuguese wonderkid. Aqua Mojo Auto PSA 10 at $20 = steal if he moves to a big club.",
    keyCards: ["2024 Merlin Chrome Aqua Mojo Auto /75 PSA 10"],
    marketCap: "very low",
  },
];

export default async function RookiesPage() {
  const { data: entities } = await supabase
    .from("TrackedEntity")
    .select("player, active")
    .eq("active", true);

  const trackedPlayers = new Set((entities ?? []).map((e) => e.player));

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 2rem", position: "relative", zIndex: 1 }}>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
        Season stats + card buy/sell signals for {rookieStats.length} tracked rookies
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {rookieStats.map((r, i) => {
          const signalColor = r.cardSignal === "BUY" ? "var(--buy-now)" : r.cardSignal === "SELL" ? "var(--score-hot)" : "var(--bid)";
          const signalBg = r.cardSignal === "BUY" ? "var(--buy-now-bg)" : r.cardSignal === "SELL" ? "#ff444415" : "var(--bid-bg)";
          const trendIcon = r.trend === "hot" ? "▲▲" : r.trend === "rising" ? "▲" : r.trend === "cooling" ? "▼" : "—";
          const trendColor = r.trend === "hot" ? "var(--score-hot)" : r.trend === "rising" ? "var(--buy-now)" : r.trend === "cooling" ? "var(--score-hot)" : "var(--text-muted)";
          const isTracked = trackedPlayers.has(r.player);

          return (
            <div
              key={r.player}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "1rem 1.25rem",
                animation: `fadeInUp 0.3s ease-out ${i * 40}ms both`,
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{r.player}</span>
                    <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)", padding: "1px 5px", borderRadius: "3px", background: "var(--bg-surface)" }}>
                      {r.age}yo
                    </span>
                    {isTracked && (
                      <span className="mono" style={{ fontSize: "0.5rem", color: "var(--accent)", padding: "1px 5px", borderRadius: "3px", border: "1px solid var(--accent)" }}>
                        TRACKED
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                    {r.club} · {r.league} · {r.pos}
                  </div>
                </div>

                {/* Signal badge */}
                <div
                  className="mono"
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: "4px",
                    background: signalBg,
                    color: signalColor,
                    letterSpacing: "0.06em",
                  }}
                >
                  {r.cardSignal}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
                <StatBox label="GOALS" value={r.goals} />
                <StatBox label="ASSISTS" value={r.assists} />
                <StatBox label="APPS" value={r.apps} />
                <StatBox label="RATING" value={r.rating.toFixed(1)} />
                <div style={{ textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: "1rem", fontWeight: 700, color: trendColor }}>{trendIcon}</div>
                  <div className="mono" style={{ fontSize: "0.5rem", color: "var(--text-muted)", marginTop: "2px" }}>TREND</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: "0.7rem", fontWeight: 600, color: r.marketCap === "very low" ? "var(--buy-now)" : r.marketCap === "low" ? "var(--bid)" : "var(--text-secondary)" }}>
                    {r.marketCap.toUpperCase()}
                  </div>
                  <div className="mono" style={{ fontSize: "0.5rem", color: "var(--text-muted)", marginTop: "2px" }}>MKT CAP</div>
                </div>
              </div>

              {/* Analysis */}
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.5rem" }}>
                {r.note}
              </div>

              {/* Key cards */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {r.keyCards.map((card) => (
                  <a
                    key={card}
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card)}&_sacat=212`}
                    target="_blank"
                    rel="noopener"
                    className="mono"
                    style={{
                      fontSize: "0.55rem",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: "var(--bg-surface)",
                      color: "var(--watch)",
                      textDecoration: "none",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {card}
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

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div className="mono" style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
      <div className="mono" style={{ fontSize: "0.5rem", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
    </div>
  );
}
