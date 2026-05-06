"use client";

import { useState } from "react";

export interface PitchPlayer {
  name: string;
  position: "GK" | "DEF" | "MID" | "FW" | "ST";
  signal: string;
  prediction: string;
  deals: {
    title: string;
    price: number;
    url: string;
    product: string;
    productColor: string;
    numbered: string | null;
    isAuto: boolean;
    grade: string | null;
    offer: number | null;
    actionLabel: string;
    actionColor: string;
  }[];
}

// Position coordinates on the pitch (percentage based)
const positionCoords: Record<string, { x: number; y: number }> = {
  ST:  { x: 50, y: 12 },
  FW:  { x: 25, y: 28 },
  MID: { x: 75, y: 28 },
  DEF: { x: 35, y: 52 },
  GK:  { x: 65, y: 52 },
};

export default function Pitch({ players }: { players: PitchPlayer[] }) {
  const [active, setActive] = useState<string | null>(null);
  const activePlayer = players.find((p) => p.name === active);

  return (
    <div style={{ position: "relative" }}>
      {/* Pitch */}
      <div style={{
        position: "relative",
        width: "100%",
        paddingBottom: "70%",
        background: "linear-gradient(180deg, #0d4a1c 0%, #0a3d17 40%, #0d4a1c 60%, #0a3d17 100%)",
        borderRadius: 16,
        overflow: "hidden",
        border: "2px solid #1a5c2a",
      }}>
        {/* Field lines */}
        <svg viewBox="0 0 100 70" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
          {/* Outer border */}
          <rect x="5" y="3" width="90" height="64" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
          {/* Center line */}
          <line x1="5" y1="35" x2="95" y2="35" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          {/* Center circle */}
          <circle cx="50" cy="35" r="8" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          <circle cx="50" cy="35" r="0.5" fill="rgba(255,255,255,0.2)" />
          {/* Top box */}
          <rect x="30" y="3" width="40" height="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          {/* Bottom box */}
          <rect x="30" y="55" width="40" height="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.3" />
          {/* Subtle grass stripes */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x="5" y={3 + i * 9.14} width="90" height={9.14} fill={i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent"} />
          ))}
        </svg>

        {/* Players */}
        {players.map((player, i) => {
          const pos = Object.values(positionCoords)[i] ?? { x: 50, y: 50 };
          const isActive = active === player.name;

          return (
            <button
              key={player.name}
              onClick={() => setActive(isActive ? null : player.name)}
              style={{
                position: "absolute",
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                zIndex: isActive ? 10 : 1,
                transition: "transform 0.15s",
              }}
            >
              {/* Jersey circle */}
              <div style={{
                width: isActive ? 44 : 36,
                height: isActive ? 44 : 36,
                borderRadius: "50%",
                background: isActive
                  ? "radial-gradient(circle, #22c55e 0%, #16a34a 100%)"
                  : "radial-gradient(circle, #fafafa 0%, #d4d4d8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isActive ? 14 : 12,
                fontWeight: 800,
                color: isActive ? "#fff" : "#09090b",
                boxShadow: isActive
                  ? "0 0 20px rgba(34,197,94,0.5), 0 4px 12px rgba(0,0,0,0.4)"
                  : "0 2px 8px rgba(0,0,0,0.4)",
                transition: "all 0.15s",
                fontFamily: "'Instrument Sans', sans-serif",
                letterSpacing: "-0.02em",
              }}>
                {player.deals.length}
              </div>

              {/* Name */}
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: isActive ? "#22c55e" : "rgba(255,255,255,0.9)",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                whiteSpace: "nowrap",
                letterSpacing: "0.01em",
                fontFamily: "'Instrument Sans', sans-serif",
              }}>
                {player.name.split(" ").pop()}
              </span>

              {/* Prediction */}
              <span style={{
                fontSize: 8,
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {player.prediction}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deal panel — shows when a player is clicked */}
      {activePlayer && (
        <div style={{
          marginTop: 12,
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          overflow: "hidden",
          animation: "fadeIn 0.15s ease-out",
        }}>
          {/* Player header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #27272a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{activePlayer.name}</span>
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 600,
                padding: "2px 8px", borderRadius: 100,
                background: "#22c55e20", color: "#22c55e",
              }}>
                {activePlayer.signal}
              </span>
            </div>
            <button
              onClick={() => setActive(null)}
              style={{
                background: "none", border: "none", color: "#52525b",
                cursor: "pointer", fontSize: 18, lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Top 3 deals */}
          {activePlayer.deals.slice(0, 3).map((deal, i) => (
            <a
              key={i}
              href={deal.url}
              target="_blank"
              rel="noopener"
              style={{
                display: "block",
                padding: "12px 16px",
                borderBottom: i < 2 ? "1px solid #1e1e22" : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#1c1c20"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {/* Product + numbering + badges */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                {deal.product && (
                  <span style={{ fontSize: 10, color: deal.productColor, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                    {deal.product}
                  </span>
                )}
                {deal.numbered && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
                    {deal.numbered}
                  </span>
                )}
                {deal.isAuto && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 100, background: "#22c55e20", color: "#22c55e" }}>AUTO</span>
                )}
                {deal.grade && (
                  <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 100, background: "#eab30820", color: "#eab308" }}>{deal.grade}</span>
                )}
              </div>

              {/* Title */}
              <div style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 6, lineHeight: 1.4 }}>
                {deal.title}
              </div>

              {/* Price + offer + action */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  ${deal.price < 1000 ? deal.price.toFixed(2) : deal.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                {deal.offer && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#eab308", fontFamily: "'JetBrains Mono', monospace" }}>
                    offer ${deal.offer}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                  background: deal.actionColor, color: "#000",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {deal.actionLabel}
                </span>
              </div>
            </a>
          ))}

          {/* Comps link */}
          <div style={{ padding: "8px 16px", borderTop: "1px solid #27272a" }}>
            <a
              href={`https://130point.com/cards/?search=${encodeURIComponent(activePlayer.name + " auto")}`}
              target="_blank"
              rel="noopener"
              style={{ fontSize: 10, color: "#52525b", fontWeight: 500 }}
            >
              View sold comps on 130point →
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
