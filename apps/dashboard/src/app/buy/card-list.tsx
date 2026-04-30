"use client";

import { useState } from "react";
import { PlayerAvatar } from "../player-avatar";
import type { SortMode } from "./sort-toggle";
import SortToggle from "./sort-toggle";

interface BuyCard {
  id: string;
  title: string;
  priceUSD: number;
  url: string;
  imageUrl: string | null;
  avgSoldPrice: number | null;
  pctBelowMarket: number | null;
  // from rawData
  isBIN: boolean;
  acceptsOffers: boolean;
  isAuction: boolean;
  itemEndDate: string | null;
  // from research action
  playerName: string;
  signal: string;
  signalBg: string;
  signalColor: string;
  reasoning: string;
  catalyst: string;
  timeframe: string;
  lane: string;
}

// Predictive multiplier based on player stage + catalyst proximity
// Returns estimated price multiplier over next 3-6 months
function getPrediction(card: BuyCard): { multiplier: number; label: string; color: string } {
  const t = card.timeframe.toLowerCase();
  const c = card.catalyst.toLowerCase();
  const lane = card.lane;

  // World Cup catalyst (June 11 - July 19) — ~6 weeks away
  const hasWCCatalyst = c.includes("world cup") || c.includes("wc 2026") || c.includes("june");

  // Transfer catalyst
  const hasTransferCatalyst = c.includes("transfer") || c.includes("buy-back") || c.includes("move");

  // Retirement / last tournament
  const hasRetirementCatalyst = c.includes("last") || c.includes("retirement") || c.includes("final");

  // Breakout / pre-breakout
  const hasBreakoutCatalyst = c.includes("breakout") || c.includes("pre-breakout") || c.includes("broke") || c.includes("record");

  if (lane === "legacy" && hasRetirementCatalyst) {
    return { multiplier: 2.0, label: "2x (retirement premium)", color: "#7c3aed" };
  }

  if (lane === "rookie" && hasBreakoutCatalyst && hasWCCatalyst) {
    return { multiplier: 3.0, label: "3x (breakout + WC)", color: "#0d9f4f" };
  }

  if (lane === "rookie" && hasWCCatalyst) {
    return { multiplier: 2.5, label: "2.5x (WC hype)", color: "#0d9f4f" };
  }

  if (lane === "rookie" && hasTransferCatalyst) {
    return { multiplier: 3.0, label: "3x (transfer spike)", color: "#0d9f4f" };
  }

  if (lane === "rookie" && hasBreakoutCatalyst) {
    return { multiplier: 2.0, label: "2x (pre-breakout)", color: "#0d9f4f" };
  }

  if (lane === "steal" && hasWCCatalyst) {
    return { multiplier: 1.5, label: "1.5x (WC bounce)", color: "#c77d15" };
  }

  if (lane === "steal") {
    return { multiplier: 1.3, label: "1.3x (dip recovery)", color: "#c77d15" };
  }

  if (lane === "legacy") {
    return { multiplier: 1.5, label: "1.5x (legacy appreciation)", color: "#7c3aed" };
  }

  if (t.includes("long-term") || t.includes("12+")) {
    return { multiplier: 2.0, label: "2x (long-term)", color: "#2563eb" };
  }

  return { multiplier: 1.2, label: "1.2x (hold)", color: "var(--text-muted)" };
}

function getTimeRemaining(endDate: string): { label: string; hours: number } {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { label: "Ended", hours: -1 };
  const hours = diff / (1000 * 60 * 60);
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return { label: h > 0 ? `${h}h ${m}m` : `${m}m`, hours };
}

function getValueScore(card: BuyCard): number {
  const t = card.title.toLowerCase();
  let score = 0;

  // Use REAL sold data if available
  if (card.avgSoldPrice && card.avgSoldPrice > 0) {
    const pctBelow = ((card.avgSoldPrice - card.priceUSD) / card.avgSoldPrice) * 100;

    if (pctBelow >= 40) score += 60;       // 40%+ below avg sold = steal
    else if (pctBelow >= 25) score += 45;  // 25-40% below = great deal
    else if (pctBelow >= 10) score += 30;  // 10-25% below = good deal
    else if (pctBelow >= 0) score += 15;   // at market = fair
    else if (pctBelow >= -15) score += 0;  // slightly above = meh
    else score -= 30;                       // 15%+ above avg sold = bad deal
  } else {
    // No sold data — use price tiers as rough proxy
    if (card.priceUSD < 25) score += 40;
    else if (card.priceUSD < 50) score += 25;
    else if (card.priceUSD < 100) score += 15;
    else if (card.priceUSD < 250) score += 5;
    // $250+ without sold data = risky, no bonus
  }

  // Auto = higher value
  if (t.includes("auto")) score += 25;

  // Lower numbered = rarer = better
  const numMatch = t.match(/\/(\d{1,2})\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num <= 5) score += 35;
    else if (num <= 10) score += 25;
    else if (num <= 25) score += 15;
    else if (num <= 50) score += 8;
  }

  // Graded PSA 10 = premium
  if (t.includes("psa 10")) score += 20;
  else if (t.includes("psa 9")) score += 10;

  // Below market = deal
  if (card.pctBelowMarket && card.pctBelowMarket > 0) {
    score += Math.min(card.pctBelowMarket, 30); // cap at 30 bonus
  }

  // Accepts offers = opportunity to negotiate lower
  if (card.acceptsOffers) score += 8;

  // SSP / case hit = rare
  if (t.includes("ssp") || t.includes("case hit")) score += 15;

  // PREDICTIVE BONUS: higher multiplier = more upside = better value
  const prediction = getPrediction(card);
  if (prediction.multiplier >= 3) score += 30;
  else if (prediction.multiplier >= 2) score += 20;
  else if (prediction.multiplier >= 1.5) score += 10;

  // ROI projection: if we know avg sold AND prediction, calculate potential return
  if (card.avgSoldPrice && card.avgSoldPrice > 0) {
    const projectedValue = card.avgSoldPrice * prediction.multiplier;
    const potentialReturn = ((projectedValue - card.priceUSD) / card.priceUSD) * 100;
    if (potentialReturn > 200) score += 25;
    else if (potentialReturn > 100) score += 15;
    else if (potentialReturn > 50) score += 8;
  }

  // PENALTY: non-accredited/unlicensed brands
  if (t.includes("wild card") || t.includes("futera") || t.includes("custom")) score -= 100;

  const hasLicensedBrand = t.includes("topps") || t.includes("panini") || t.includes("bowman") ||
    t.includes("prizm") || t.includes("select") || t.includes("chrome") || t.includes("merlin") ||
    t.includes("obsidian") || t.includes("finest") || t.includes("museum") || t.includes("donruss") ||
    t.includes("immaculate") || t.includes("impeccable") || t.includes("inception") || t.includes("deco");
  if (!hasLicensedBrand) score -= 50;

  return score;
}

export default function CardList({ cards }: { cards: BuyCard[] }) {
  const [sortMode, setSortMode] = useState<SortMode>("urgency");

  // Filter out cards with negative value scores (unlicensed, overpriced)
  const filtered = sortMode === "value"
    ? cards.filter((c) => getValueScore(c) > 0)
    : cards;

  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "cheapest") {
      return a.priceUSD - b.priceUSD;
    }

    if (sortMode === "value") {
      return getValueScore(b) - getValueScore(a);
    }

    // urgency: auctions ending soonest, then offers, then BIN
    const aUrgency = a.isAuction && a.itemEndDate ? new Date(a.itemEndDate).getTime() : Infinity;
    const bUrgency = b.isAuction && b.itemEndDate ? new Date(b.itemEndDate).getTime() : Infinity;

    // Auctions ending within 24h come first
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const aEndingSoon = aUrgency < now + day;
    const bEndingSoon = bUrgency < now + day;

    if (aEndingSoon && !bEndingSoon) return -1;
    if (!aEndingSoon && bEndingSoon) return 1;
    if (aEndingSoon && bEndingSoon) return aUrgency - bUrgency;

    // Then offers
    if (a.acceptsOffers && !b.acceptsOffers) return -1;
    if (!a.acceptsOffers && b.acceptsOffers) return 1;

    return a.priceUSD - b.priceUSD;
  });

  return (
    <>
      <SortToggle onChange={setSortMode} />

      {sorted.length === 0 && (
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "12px", padding: "2rem", textAlign: "center",
          boxShadow: "var(--shadow-sm)", color: "var(--text-muted)", fontSize: "0.85rem",
        }}>
          No deals found. Run a scan to find new listings.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {sorted.map((card) => {
          // Action badge
          let actionLabel = "BUY NOW";
          let actionBg = "#0d9f4f";
          if (card.isAuction && card.itemEndDate) {
            const { label, hours } = getTimeRemaining(card.itemEndDate);
            if (hours < 0) return null; // ended
            if (hours > 48) return null; // too far out
            actionLabel = `AUCTION ${label}`;
            actionBg = "#dc2626";
          } else if (card.isBIN && card.acceptsOffers) {
            actionLabel = "SEND OFFER";
            actionBg = "#c77d15";
          }

          // Offer suggestion: use real sold avg when available, else % of asking
          let suggestedOffer: number | null = null;
          if (card.isBIN && card.acceptsOffers) {
            if (card.avgSoldPrice && card.avgSoldPrice > 0) {
              // Offer 85% of what cards actually sell for
              suggestedOffer = Math.round(card.avgSoldPrice * 0.85);
            } else if (card.priceUSD < 50) {
              suggestedOffer = Math.round(card.priceUSD * 0.70);
            } else if (card.priceUSD < 200) {
              suggestedOffer = Math.round(card.priceUSD * 0.75);
            } else {
              suggestedOffer = Math.round(card.priceUSD * 0.80);
            }
          }

          const valueScore = sortMode === "value" ? getValueScore(card) : null;
          const prediction = getPrediction(card);
          const projectedValue = Math.round(card.priceUSD * prediction.multiplier);
          const potentialROI = Math.round(((projectedValue - card.priceUSD) / card.priceUSD) * 100);

          return (
            <div
              key={card.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "0.75rem",
                alignItems: "center",
                padding: "0.75rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {/* Left: avatar + signal */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", minWidth: "48px" }}>
                <PlayerAvatar name={card.playerName} size={28} />
                <span style={{
                  fontSize: "0.5rem", fontWeight: 700, padding: "2px 6px",
                  borderRadius: "4px", background: card.signalBg, color: card.signalColor,
                }}>
                  {card.signal}
                </span>
              </div>

              {/* Middle: player + title + reasoning */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "0.78rem", marginBottom: "0.15rem" }}>
                  {card.playerName}
                </div>
                <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", fontWeight: 500, marginBottom: "0.2rem", lineHeight: 1.35, color: "var(--text-primary)", textDecoration: "none", display: "block" }}>
                  {card.title}
                </a>
                <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ fontStyle: "italic" }}>{card.reasoning}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.3rem" }}>
                    {card.catalyst} · {card.timeframe}
                  </span>
                </div>
              </div>

              {/* Right: price + sold comp + offer + action */}
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: "120px" }}>
                <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.15rem" }}>
                  ${card.priceUSD < 1000 ? card.priceUSD.toFixed(2) : card.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                {/* Real sold comp from eBay Playwright scrape */}
                {card.avgSoldPrice && card.avgSoldPrice > 0 && (
                  <div className="mono" style={{ fontSize: "0.55rem", marginBottom: "0.1rem" }}>
                    <span style={{ color: "var(--text-muted)" }}>Sold avg </span>
                    <span style={{ fontWeight: 700 }}>${card.avgSoldPrice < 1000 ? card.avgSoldPrice.toFixed(0) : card.avgSoldPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    {card.pctBelowMarket !== null && card.pctBelowMarket > 0 && (
                      <span style={{ color: "#0d9f4f", fontWeight: 700, marginLeft: "0.25rem" }}>
                        {card.pctBelowMarket}% below
                      </span>
                    )}
                    {card.pctBelowMarket !== null && card.pctBelowMarket < 0 && (
                      <span style={{ color: "#dc2626", fontWeight: 700, marginLeft: "0.25rem" }}>
                        {Math.abs(card.pctBelowMarket)}% above
                      </span>
                    )}
                  </div>
                )}
                {suggestedOffer && (
                  <div style={{ fontSize: "0.6rem", color: "#c77d15", fontWeight: 700, marginBottom: "0.15rem" }}>
                    Offer ~${suggestedOffer}
                  </div>
                )}
                {/* Prediction */}
                <div style={{ fontSize: "0.55rem", marginBottom: "0.15rem" }}>
                  <span style={{ color: prediction.color, fontWeight: 600 }}>
                    {prediction.label}
                  </span>
                  {potentialROI > 0 && (
                    <span className="mono" style={{ color: "#0d9f4f", fontWeight: 700, marginLeft: "0.3rem" }}>
                      +{potentialROI}% ROI
                    </span>
                  )}
                </div>
                {projectedValue > card.priceUSD && (
                  <div className="mono" style={{ fontSize: "0.5rem", color: "var(--text-muted)" }}>
                    Buy ${card.priceUSD < 100 ? card.priceUSD.toFixed(0) : card.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })} → Proj ${projectedValue < 100 ? projectedValue : projectedValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", justifyContent: "flex-end" }}>
                  <span style={{
                    fontSize: "0.55rem", fontWeight: 700, padding: "3px 8px",
                    borderRadius: "4px", background: actionBg, color: "#fff",
                  }}>
                    {actionLabel}
                  </span>
                  <a
                    href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(card.playerName + " " + (card.title.match(/\/\d+/) ? card.title.match(/\/\d+/)?.[0] : "auto"))}&_sacat=212&LH_Sold=1&LH_Complete=1`}
                    target="_blank"
                    rel="noopener"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      fontSize: "0.5rem", fontWeight: 600, padding: "3px 6px",
                      borderRadius: "4px", background: "var(--bg-surface)",
                      color: "var(--text-muted)", border: "1px solid var(--border)",
                      textDecoration: "none",
                    }}
                  >
                    Sold?
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
