import { supabase } from "@soccer-card-radar/db";
import { getResearchActions } from "./research-engine";
import { isQualityCard } from "./card-filter";
import ScanBtn from "./scan-btn";
import Pitch, { type PitchPlayer } from "./pitch";

export const dynamic = "force-dynamic";

function getProductTier(title: string): { tier: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes("sapphire")) return { tier: "Sapphire", color: "#22c55e" };
  if (t.includes("dynasty")) return { tier: "Dynasty", color: "#22c55e" };
  if (t.includes("immaculate") || t.includes("impeccable") || t.includes("eminence")) return { tier: "Premium", color: "#22c55e" };
  if (t.includes("chrome") && !t.includes("merlin")) return { tier: "Chrome", color: "#3b82f6" };
  if (t.includes("prizm")) return { tier: "Prizm", color: "#3b82f6" };
  if (t.includes("finest") || t.includes("select") || t.includes("obsidian")) return { tier: "Mid-Premium", color: "#8b5cf6" };
  if (t.includes("merlin")) return { tier: "Merlin", color: "#71717a" };
  if (t.includes("optic") || t.includes("stadium club")) return { tier: "Mid", color: "#71717a" };
  return { tier: "", color: "#3f3f46" };
}

function parseCard(title: string) {
  const t = title.toLowerCase();
  const numMatch = t.match(/\/(\d{1,3})\b/);
  const gradeMatch = t.match(/psa\s*(\d+)/i) || t.match(/bgs\s*([\d.]+)/i) || t.match(/sgc\s*(\d+)/i);
  return {
    numbered: numMatch ? `/${numMatch[1]}` : null,
    isAuto: (t.includes("auto") || t.includes("autograph")) && !t.includes("sticker auto"),
    grade: gradeMatch ? gradeMatch[0].toUpperCase() : null,
  };
}

function predict(lane: string, catalyst: string): string {
  const c = catalyst.toLowerCase();
  if (lane === "legacy") return "2x legacy";
  if (c.includes("breakout") && c.includes("wc")) return "3x breakout+WC";
  if (c.includes("world cup") || c.includes("wc")) return "2.5x WC";
  if (c.includes("transfer")) return "3x transfer";
  if (c.includes("breakout") || c.includes("record")) return "2x breakout";
  if (lane === "steal") return "1.5x dip";
  return "1.3x hold";
}

function timeLeft(endDate: string): string | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0 || diff > 48 * 3600000) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

export default async function Page() {
  const actions = getResearchActions();
  const actionMap = new Map(actions.map((a) => [a.id, a]));
  const buyIds = new Set(actions.filter((a) => a.signal === "BUY" || a.signal === "HOLD").map((a) => a.id));
  const sellActions = actions.filter((a) => a.signal === "SELL");

  const { data: rows } = await supabase
    .from("Listing")
    .select("id, title, priceUSD, url, rawData, actionId, lane")
    .order("priceUSD", { ascending: true }).limit(500);

  const { data: latest } = await supabase
    .from("Listing").select("lastSeenAt")
    .order("lastSeenAt", { ascending: false }).limit(1).maybeSingle();

  const scannedAt = latest?.lastSeenAt
    ? new Date(latest.lastSeenAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "never";

  const priceCap: Record<string, number> = { rookie: 1000, steal: 2000, legacy: 5000 };

  // Build deals per player
  const dealsByPlayer: Record<string, { action: ReturnType<typeof actions>[0]; deals: PitchPlayer["deals"] }> = {};

  for (const r of rows ?? []) {
    if (!r.actionId || !buyIds.has(r.actionId)) continue;
    if (!isQualityCard(r.title)) continue;
    const action = actionMap.get(r.actionId);
    if (!action) continue;
    const lastName = action.player.split(" ").pop()!.toLowerCase();
    if (lastName.length >= 4 && !r.title.toLowerCase().includes(lastName)) continue;
    if (r.priceUSD > (priceCap[action.lane] ?? 1000)) continue;

    const raw = (r.rawData ?? {}) as Record<string, unknown>;
    const isBIN = raw.isBIN === true;
    const acceptsOffers = raw.acceptsOffers === true;
    const isAuction = raw.isAuction === true;
    const endDate = (raw.itemEndDate as string) ?? null;

    let actionLabel = "BUY";
    let actionColor = "#22c55e";
    let tl: string | null = null;
    if (isAuction && endDate) {
      tl = timeLeft(endDate); if (!tl) continue;
      actionLabel = tl; actionColor = "#ef4444";
    } else if (isBIN && acceptsOffers) {
      actionLabel = "OFFER"; actionColor = "#eab308";
    }

    const product = getProductTier(r.title);
    const card = parseCard(r.title);
    const offer = actionLabel === "OFFER" ? Math.round(r.priceUSD * (r.priceUSD < 50 ? 0.70 : r.priceUSD < 200 ? 0.75 : 0.80)) : null;

    if (!dealsByPlayer[action.player]) {
      dealsByPlayer[action.player] = { action, deals: [] };
    }
    dealsByPlayer[action.player].deals.push({
      title: r.title, price: r.priceUSD, url: r.url,
      product: product.tier, productColor: product.color,
      numbered: card.numbered, isAuto: card.isAuto, grade: card.grade,
      offer, actionLabel, actionColor,
    });
  }

  // Sort deals within each player by price
  for (const p of Object.values(dealsByPlayer)) {
    p.deals.sort((a, b) => a.price - b.price);
  }

  // Assign positions for pitch layout
  const positions: PitchPlayer["position"][] = ["ST", "FW", "MID", "DEF", "GK"];

  // Build 3 pitch squads
  function buildSquad(playerNames: string[]): PitchPlayer[] {
    return playerNames.slice(0, 5).map((name, i) => {
      const data = dealsByPlayer[name];
      return {
        name,
        position: positions[i],
        signal: data?.action.signal ?? "BUY",
        prediction: data ? predict(data.action.lane, data.action.catalyst) : "",
        deals: data?.deals ?? [],
      };
    });
  }

  // Rank players by deal count (most deals = most interesting)
  const rookieNames = actions
    .filter((a) => a.lane === "rookie" && a.signal === "BUY")
    .map((a) => a.player)
    .filter((n) => dealsByPlayer[n]?.deals.length)
    .sort((a, b) => (dealsByPlayer[b]?.deals.length ?? 0) - (dealsByPlayer[a]?.deals.length ?? 0));

  const starNames = actions
    .filter((a) => a.lane === "steal" || (a.lane === "rookie" && a.signal === "HOLD"))
    .map((a) => a.player)
    .filter((n) => dealsByPlayer[n]?.deals.length);

  const legendNames = actions
    .filter((a) => a.lane === "legacy")
    .map((a) => a.player)
    .filter((n) => dealsByPlayer[n]?.deals.length);

  // Fill squads — if a category has fewer than 5, pull from others
  const allBuyPlayers = Object.keys(dealsByPlayer).sort((a, b) => (dealsByPlayer[b]?.deals.length ?? 0) - (dealsByPlayer[a]?.deals.length ?? 0));

  const rookieSquad = buildSquad(rookieNames.length >= 5 ? rookieNames : [...rookieNames, ...allBuyPlayers.filter((n) => !rookieNames.includes(n))]);
  const starSquad = buildSquad(starNames.length >= 5 ? starNames : [...starNames, ...allBuyPlayers.filter((n) => !starNames.includes(n) && !rookieNames.slice(0, 5).includes(n))]);
  const legendSquad = buildSquad(legendNames.length >= 5 ? legendNames : [...legendNames, ...allBuyPlayers.filter((n) => !legendNames.includes(n) && !rookieNames.slice(0, 5).includes(n) && !starNames.slice(0, 5).includes(n))]);

  const totalDeals = Object.values(dealsByPlayer).reduce((sum, p) => sum + p.deals.length, 0);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>Card Radar</h1>
          <p className="mono" style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>
            {totalDeals} deals · {scannedAt}
          </p>
        </div>
        <ScanBtn />
      </div>

      {/* Rookies Pitch */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", letterSpacing: "0.08em", marginBottom: 10 }}>
          ROOKIES
        </h2>
        <Pitch players={rookieSquad} />
      </section>

      {/* Stars Pitch */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.08em", marginBottom: 10 }}>
          STARS
        </h2>
        <Pitch players={starSquad} />
      </section>

      {/* Legends Pitch */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "#eab308", letterSpacing: "0.08em", marginBottom: 10 }}>
          LEGENDS
        </h2>
        <Pitch players={legendSquad} />
      </section>

      {/* Avoid */}
      {sellActions.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", letterSpacing: "0.08em", marginBottom: 10 }}>
            AVOID
          </h2>
          <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, padding: "12px 16px" }}>
            {sellActions.map((a) => (
              <div key={a.id} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0" }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 100, background: "#ef444420", color: "#ef4444" }}>SELL</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{a.player}</span>
                <span style={{ fontSize: 11, color: "#52525b", flex: 1 }}>{a.reasoning.slice(0, 50)}...</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Market notes */}
      <details>
        <summary style={{ fontSize: 11, fontWeight: 600, color: "#3f3f46", cursor: "pointer", padding: "8px 0", letterSpacing: "0.06em" }}>
          MARKET NOTES
        </summary>
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 12, padding: 16, marginTop: 8, fontSize: 12, color: "#52525b", lineHeight: 1.8 }}>
          <p><strong style={{ color: "#71717a" }}>Prizm WC</strong> drops May 22 — older WC prices dip</p>
          <p><strong style={{ color: "#71717a" }}>World Cup</strong> Jun 11 – Jul 19 — buy now, sell group stage</p>
          <p><strong style={{ color: "#71717a" }}>Scan times</strong> — Tue-Thu 10am EST (low comp) · Sun 6pm (auctions)</p>
        </div>
      </details>
    </>
  );
}
