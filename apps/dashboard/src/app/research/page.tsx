export const dynamic = "force-dynamic";

// Research compiled from: Yahoo Sports, SportsCardInvestor, Beckett,
// Athlon Sports, SportsCollectorsDaily, eBay community forums (Apr 30, 2026)

const weeklyActions = [
  {
    action: "BUY NOW",
    priority: "urgent",
    title: "Santiago Castro PSA 10 Autos — under $25",
    detail: "Argentina World Cup squad confirmed. PSA 10 Merlin Chrome autos at $20-25. These were $8 in January. Will 3-5x during tournament if he plays.",
    players: ["Santiago Castro"],
    timeframe: "Before May 22 (Prizm release)",
  },
  {
    action: "BUY NOW",
    priority: "urgent",
    title: "Geovany Quenda — Aqua Mojo Auto PSA 10 at $20",
    detail: "17yo Portuguese wonderkid. Big club transfer rumored for summer. If he moves to PL/La Liga, this card goes 5-10x. Floor is $20, ceiling is $200+.",
    players: ["Geovany Quenda"],
    timeframe: "Before summer transfer window (June)",
  },
  {
    action: "BUY NOW",
    priority: "high",
    title: "Lennart Karl — any numbered auto",
    detail: "Broke Mbappe's consecutive UCL scoring record at 17. Bayern Munich. Germany World Cup squad. Cards still in early pricing — pre-breakout window closing.",
    players: ["Lennart Karl"],
    timeframe: "Before World Cup (June 11)",
  },
  {
    action: "BUY NOW",
    priority: "high",
    title: "Nico Paz — Chrome Sapphire Gold /50 RC",
    detail: "12G 6A in Serie A at 20. Real Madrid buy-back clause active. Argentina World Cup squad. Cards at $560 PSA 10 — undervalued for his output vs Yamal at $396K.",
    players: ["Nico Paz"],
    timeframe: "Before Argentina squad announcement",
  },
  {
    action: "BUY NOW",
    priority: "medium",
    title: "Kobbie Mainoo — buy the dip",
    detail: "0 goals this season = cards dipped 30-40% from peak. England World Cup squad locked. Tournament performance will spike prices. Best entry point in 6 months.",
    players: ["Kobbie Mainoo"],
    timeframe: "Before May squad announcements",
  },
  {
    action: "SELL",
    priority: "high",
    title: "Endrick — sell into World Cup hype",
    detail: "On loan at Lyon, not starting. Cards are overpriced relative to production. Brazil squad guaranteed = short-term spike. Sell during group stage when hype peaks, before he sits on the bench.",
    players: ["Endrick"],
    timeframe: "June 11-25 (Brazil group stage)",
  },
  {
    action: "SELL",
    priority: "medium",
    title: "Viktor Gyokeres — take profits",
    detail: "Card prices peaked at Arsenal transfer. 12 goals but 0 assists in PL. Not a World Cup star for Sweden. Limited upside from here. Sell while Arsenal hype holds.",
    players: ["Viktor Gyokeres"],
    timeframe: "Before end of PL season",
  },
  {
    action: "HOLD",
    priority: "medium",
    title: "Lamine Yamal — hold through World Cup",
    detail: "Cards at ATH but sustained demand. 2nd in Ballon d'Or at 18. Spain World Cup favorites. Don't sell before tournament — potential for another leg up if Spain goes deep.",
    players: ["Lamine Yamal"],
    timeframe: "Through July 19 (WC Final)",
  },
  {
    action: "WAIT",
    priority: "medium",
    title: "Panini Prizm World Cup — wait for release dip",
    detail: "Drops May 22. Initial hype will inflate prices of Prizm parallels. Wait 2-3 weeks post-release for supply to hit market and prices to settle. Then cherry-pick /25 and /10 parallels of your targets.",
    players: [],
    timeframe: "Buy window: June 5-15",
  },
];

const marketTrends = [
  { trend: "World Cup effect", direction: "up", detail: "Resale prices for top stars jumped 200-300% around 2022 tournament. Same momentum building. North America hosting = biggest ever.", source: "Yahoo Sports" },
  { trend: "Prizm WC release", direction: "event", detail: "May 22 — 1 auto per hobby box, 5 numbered Prizms. Host-nation parallels: Old Glory, Maple Leaf, Aguila.", source: "Beckett" },
  { trend: "Soccer fastest growing", direction: "up", detail: "Soccer cards seeing biggest % growth among all major sports in 2026. U.S. market interest at all-time high.", source: "SkyQuest" },
  { trend: "Yamal at $396K", direction: "up", detail: "2024 Chrome Euro SuperFractor auto PSA 10 sold for $396,500. Four Yamal cards topped six figures in 15 months.", source: "SportsCollectorsDaily" },
  { trend: "Mbappe stable", direction: "flat", detail: "2018 Prizm WC rookie PSA 10 holds at ~$190. Not rising — market priced in his career already.", source: "SportsCardInvestor" },
  { trend: "Pulisic host-nation wave", direction: "up", detail: "PSA 10 Donruss Kaboom Gold /10 hit $14,640 at Goldin. U.S. host effect pushing American player cards up.", source: "Athlon Sports" },
];

const scanSchedule = [
  { time: "Tue-Thu 10am-2pm EST", purpose: "Low competition BIN sniping", detail: "Fewest active bidders. Best for finding mispriced Buy It Now listings and sending low offers." },
  { time: "Sun 6-10pm EST", purpose: "Auction endings — snipe deals", detail: "Most auctions end Sunday evening. Peak activity but also most deals closing. Set snipe bids." },
  { time: "Mon 8-10am EST", purpose: "Weekend listing catchup", detail: "New listings from weekend sellers appear. First to see = first to offer." },
  { time: "Fri 11pm-Sat 2am EST", purpose: "Dead zone — cheapest BINs", detail: "Lowest traffic. Desperate sellers drop prices. Auto-scan catches what others miss." },
];

const upcomingReleases = [
  { date: "May 22", product: "Panini Prizm FIFA World Cup 2026", impact: "Major — prices of older WC cards may dip as supply floods in", hot: true },
  { date: "May 2026", product: "Topps Chrome Bundesliga Sapphire", impact: "Lennart Karl, Musiala rookies in high-end format", hot: true },
  { date: "June 11", product: "World Cup 2026 Kicks Off", impact: "All soccer card prices spike. Sell into hype or hold.", hot: true },
  { date: "June 2026", product: "Topps Finest Premier League 2026", impact: "Cole Palmer, Mainoo, Lacey autos in premium product", hot: false },
  { date: "July 19", product: "World Cup 2026 Final", impact: "Peak hype moment. Golden Ball winner cards explode. Sell window closes.", hot: true },
];

export default function ResearchPage() {
  const actionStyles: Record<string, { color: string; bg: string }> = {
    "BUY NOW": { color: "#fff", bg: "#0d9f4f" },
    SELL: { color: "#fff", bg: "#dc2626" },
    HOLD: { color: "#fff", bg: "#7c3aed" },
    WAIT: { color: "#fff", bg: "#2563eb" },
  };

  const priorityBorder: Record<string, string> = {
    urgent: "#dc2626",
    high: "#c77d15",
    medium: "var(--border)",
  };

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 1.5rem 3rem", position: "relative", zIndex: 1 }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem" }}>Weekly Research Agent</h2>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Market intelligence compiled from SportsCardInvestor, Yahoo Sports, Beckett, eBay community &middot; Updated Apr 30, 2026
        </p>
      </div>

      {/* THIS WEEK'S ACTIONS */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "var(--accent-secondary)" }}>&#9679;</span> Actions This Week
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {weeklyActions.map((a, i) => {
            const style = actionStyles[a.action] ?? actionStyles.WAIT;
            return (
              <div
                key={i}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  background: "var(--bg-surface)",
                  borderLeft: `4px solid ${priorityBorder[a.priority] ?? "var(--border)"}`,
                  animation: `fadeInUp 0.3s ease-out ${i * 40}ms both`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.6rem", fontWeight: 700, padding: "3px 10px",
                      borderRadius: "4px", background: style.bg, color: style.color,
                    }}>
                      {a.action}
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{a.title}</span>
                  </div>
                  <span className="mono" style={{ fontSize: "0.55rem", color: "var(--text-muted)", flexShrink: 0 }}>
                    {a.timeframe}
                  </span>
                </div>
                <p className="serif" style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, fontStyle: "italic" }}>
                  {a.detail}
                </p>
                {a.players.length > 0 && (
                  <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem" }}>
                    {a.players.map((p) => (
                      <a
                        key={p}
                        href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(p + " auto /50 OR /25 OR /10 card")}&_sacat=212&LH_BIN=1`}
                        target="_blank"
                        rel="noopener"
                        style={{
                          fontSize: "0.6rem", padding: "2px 8px", borderRadius: "4px",
                          background: "var(--bg-card)", border: "1px solid var(--border)",
                          color: "var(--accent)", fontWeight: 600, textDecoration: "none",
                        }}
                      >
                        Search {p} on eBay &rarr;
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two columns: Market Trends + Scan Schedule */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

        {/* MARKET TRENDS */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)",
        }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>Market Trends</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {marketTrends.map((t, i) => {
              const dirColor = t.direction === "up" ? "var(--buy-now)" : t.direction === "down" ? "var(--accent-secondary)" : "var(--text-muted)";
              const dirIcon = t.direction === "up" ? "\u25B2" : t.direction === "down" ? "\u25BC" : "\u2022";
              return (
                <div key={i} style={{ padding: "0.5rem", borderRadius: "6px", background: "var(--bg-surface)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                    <span style={{ color: dirColor, fontSize: "0.7rem", fontWeight: 700 }}>{dirIcon}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>{t.trend}</span>
                  </div>
                  <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{t.detail}</p>
                  <span style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>{t.source}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SCAN SCHEDULE */}
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)",
        }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>Optimal Scan Times</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {scanSchedule.map((s, i) => (
              <div key={i} style={{ padding: "0.5rem", borderRadius: "6px", background: "var(--bg-surface)" }}>
                <div className="mono" style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--accent)", marginBottom: "0.15rem" }}>
                  {s.time}
                </div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: "0.15rem" }}>{s.purpose}</div>
                <p style={{ fontSize: "0.65rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{s.detail}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "0.75rem" }}>
            <a
              href="/api/scan"
              target="_blank"
              style={{
                display: "block", textAlign: "center", fontSize: "0.75rem",
                fontWeight: 600, padding: "8px", borderRadius: "6px",
                background: "var(--accent)", color: "#fff", textDecoration: "none",
              }}
            >
              Run Full Scan Now
            </a>
          </div>
        </div>
      </div>

      {/* HISTORICAL MARKET DATA — 10-20 year perspective */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem", boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>Historical Market Analysis</h3>
        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
          Sources: SportsCardInvestor, Cardlines, SportscollectorsDigest, eBay sold data, Goldin Auctions
        </p>

        {/* World Cup Cycles */}
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--accent)" }}>World Cup Price Cycles (2014 &rarr; 2026)</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {[
              { year: "2014 Brazil", pattern: "First Panini Prizm WC set. Messi Gold Prizm now $522K. Cards bought at release for $5-20 are now $500-5000. 10-year return: 100-250x on graded rookies.", lesson: "First-edition WC Prizm parallels always appreciate long-term." },
              { year: "2018 Russia", pattern: "Mbappe RC Prizm Gold sold for $216K. Base PSA 10 went from $20 release to $190 now (9.5x in 8 years). Non-RC stars held flat.", lesson: "World Cup rookie cards are the only long-term plays. Non-RC WC cards fade." },
              { year: "2022 Qatar", pattern: "Messi base PSA 10 spiked to $600 during tournament, now $200-277. Short 200-300% spike during games, then 50% pullback after.", lesson: "Sell INTO the tournament. Don't hold through — prices drop 40-50% within 3 months after." },
              { year: "2026 USA/CAN/MEX", pattern: "Biggest ever. U.S. hosting = mainstream media coverage. Soccer card demand at ATH. Prizm drops May 22. Tournament June 11 - July 19.", lesson: "Buy numbered parallels of WC rookies NOW. Sell during group stage or after breakout games. Don't hold past July." },
            ].map((wc, i) => (
              <div key={i} style={{ padding: "0.6rem", borderRadius: "6px", background: "var(--bg-surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                  <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-secondary)" }}>{wc.year}</span>
                </div>
                <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.2rem" }}>{wc.pattern}</p>
                <p style={{ fontSize: "0.65rem", color: "var(--buy-now)", fontWeight: 600 }}>Lesson: {wc.lesson}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Market Cycle */}
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--accent)" }}>The Big Cycle: Boom &rarr; Crash &rarr; Recovery</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {[
              { period: "2020-21", label: "BOOM", color: "#0d9f4f", detail: "COVID drove cards to ATH. Soccer grew 1,586% in 2021. Jordan Fleer PSA 10 hit $738K." },
              { period: "2022-23", label: "CRASH", color: "#dc2626", detail: "Ultra-modern cards dropped 34.8%. Top cards lost 50%+. LeBron RC from $300K to $50K." },
              { period: "2024-25", label: "RECOVERY", color: "#c77d15", detail: "$231M/month in sales by Oct 2024. Volume up, individual prices still below peak. Soccer outperforming." },
              { period: "2026+", label: "GROWTH", color: "#0d9f4f", detail: "Market valued at $11.5B. Forecast: $23.6B by 2034 (9.3% CAGR). Soccer = fastest growing segment." },
            ].map((phase) => (
              <div key={phase.period} style={{ padding: "0.6rem", borderRadius: "6px", background: "var(--bg-surface)", borderTop: `3px solid ${phase.color}` }}>
                <div className="mono" style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{phase.period}</div>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: phase.color, margin: "0.15rem 0" }}>{phase.label}</div>
                <p style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{phase.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key long-term takeaways */}
        <div>
          <h4 style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--accent)" }}>Long-Term vs Short-Term Playbook</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "var(--bg-surface)", borderLeft: "3px solid var(--buy-now)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.35rem" }}>Long-Term Holds (2+ years)</div>
              <ul style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "1rem" }}>
                <li>First-edition Prizm WC rookies of generational talents (Yamal, Karl)</li>
                <li>Numbered autos /25 or lower of proven stars (Mbappe, Salah, Ronaldo)</li>
                <li>PSA 10 pop &lt;10 cards — scarcity drives long-term premium</li>
                <li>2014 + 2018 Prizm WC parallels continue to appreciate</li>
                <li>Avoid: base cards, /199+, sticker autos — zero long-term value</li>
              </ul>
            </div>
            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "var(--bg-surface)", borderLeft: "3px solid var(--accent-secondary)" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.35rem" }}>Short-Term Flips (1-3 months)</div>
              <ul style={{ fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "1rem" }}>
                <li>Buy before World Cup, sell during group stage (peak hype)</li>
                <li>Target players likely to have breakout games</li>
                <li>Prizm WC parallels /50 — buy week 2-3 post-release (supply dip)</li>
                <li>Player transfers: buy before announcement, sell day-of (+30-50% spike)</li>
                <li>Never hold WC cards past the tournament — 40-50% pullback within 3 months</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* UPCOMING RELEASES */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "12px", padding: "1.25rem", boxShadow: "var(--shadow-sm)",
      }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.75rem" }}>Upcoming Releases &amp; Key Dates</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {upcomingReleases.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid", gridTemplateColumns: "90px 1fr auto",
                gap: "0.75rem", alignItems: "center",
                padding: "0.6rem 0.75rem", borderRadius: "6px",
                background: r.hot ? "var(--accent-secondary)08" : "var(--bg-surface)",
                borderLeft: r.hot ? "3px solid var(--accent-secondary)" : "3px solid var(--border)",
              }}
            >
              <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: r.hot ? "var(--accent-secondary)" : "var(--text-primary)" }}>
                {r.date}
              </span>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{r.product}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>{r.impact}</div>
              </div>
              {r.hot && <span style={{ fontSize: "0.55rem", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", background: "#dc262612", color: "#dc2626" }}>KEY DATE</span>}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
