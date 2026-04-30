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

  // PENALTY: non-accredited/unlicensed brands
  if (t.includes("wild card") || t.includes("futera") || t.includes("custom")) score -= 100;

  // PENALTY: non Topps/Panini products that sneak through
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

          // Offer suggestion: use avg sold if available, otherwise 75% of asking
          let suggestedOffer: number | null = null;
          if (card.isBIN && card.acceptsOffers) {
            if (card.avgSoldPrice && card.avgSoldPrice > 0) {
              // Offer 85% of avg sold (you want to pay below market)
              suggestedOffer = Math.round(card.avgSoldPrice * 0.85);
            } else {
              suggestedOffer = Math.round(card.priceUSD * 0.75);
            }
          }

          const hasMarket = typeof card.avgSoldPrice === "number" && card.avgSoldPrice > 0;
          const pctBelow = hasMarket
            ? Math.round(((card.avgSoldPrice! - card.priceUSD) / card.avgSoldPrice!) * 100)
            : null;

          const valueScore = sortMode === "value" ? getValueScore(card) : null;

          return (
            <a
              key={card.id}
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "0.75rem",
                alignItems: "center",
                padding: "0.75rem 1rem",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                textDecoration: "none",
                color: "inherit",
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
                <div style={{ fontSize: "0.7rem", fontWeight: 500, marginBottom: "0.2rem", lineHeight: 1.35, color: "var(--text-primary)" }}>
                  {card.title}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  <span style={{ fontStyle: "italic" }}>{card.reasoning}</span>
                  <span style={{ color: "var(--text-muted)", marginLeft: "0.3rem" }}>
                    {card.catalyst} · {card.timeframe}
                  </span>
                </div>
              </div>

              {/* Right: price + offer + action */}
              <div style={{ textAlign: "right", flexShrink: 0, minWidth: "110px" }}>
                <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "0.15rem" }}>
                  ${card.priceUSD < 1000 ? card.priceUSD.toFixed(2) : card.priceUSD.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                {hasMarket && pctBelow !== null && pctBelow > 0 && (
                  <div style={{ fontSize: "0.55rem", color: "#0d9f4f", fontWeight: 600, marginBottom: "0.1rem" }}>
                    avg sold ${card.avgSoldPrice!.toFixed(0)} · {pctBelow}% below
                  </div>
                )}
                {suggestedOffer && (
                  <div style={{ fontSize: "0.6rem", color: "#c77d15", fontWeight: 700, marginBottom: "0.15rem" }}>
                    Offer ~${suggestedOffer}
                  </div>
                )}
                {valueScore !== null && (
                  <div className="mono" style={{ fontSize: "0.5rem", color: "var(--text-muted)", marginBottom: "0.15rem" }}>
                    Value: {valueScore}
                  </div>
                )}
                <span style={{
                  fontSize: "0.55rem", fontWeight: 700, padding: "3px 8px",
                  borderRadius: "4px", background: actionBg, color: "#fff",
                }}>
                  {actionLabel}
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
