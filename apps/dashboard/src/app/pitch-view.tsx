"use client";

import { useState } from "react";
import type { PitchPlayerData } from "./helpers";

const TIER_STYLE: Record<"S" | "A" | "B", { border: string; glow: string; badge: string; badgeBg: string }> = {
  S: { border: "var(--gold)", glow: "var(--gold-glow)", badge: "#fbbf24", badgeBg: "rgba(251,191,36,0.15)" },
  A: { border: "var(--silver)", glow: "var(--silver-glow)", badge: "#94a3b8", badgeBg: "rgba(148,163,184,0.15)" },
  B: { border: "var(--bronze)", glow: "var(--bronze-glow)", badge: "#b45309", badgeBg: "rgba(180,83,9,0.15)" },
};

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function lastName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts[parts.length - 1].toUpperCase();
}

// Map player names to local image files in /players/
function playerImageUrl(name: string): string | null {
  const slug = name.toLowerCase()
    .replace(/\s+/g, "-")
    .replace("eli junior ", "eli-")
    .replace("neymar jr", "neymar-jr");
  // Check known slugs
  const known = [
    "cristiano-ronaldo", "lionel-messi", "kylian-mbappe", "erling-haaland",
    "jude-bellingham", "vinicius-junior", "lamine-yamal", "cole-palmer",
    "florian-wirtz", "mohamed-salah", "neymar-jr", "robert-lewandowski",
    "kobbie-mainoo", "viktor-gyokeres", "geovany-quenda", "senny-mayulu",
    "mateus-mane", "shea-lacey", "endrick", "eli-kroupi",
    "santiago-castro", "nico-paz", "claudio-echeverri",
  ];
  if (known.includes(slug)) return `/players/${slug}.png`;
  return null;
}

export default function PitchView({ players }: { players: PitchPlayerData[] }) {
  const [active, setActive] = useState<string | null>(null);
  const activePlayer = players.find((p) => p.name === active) ?? null;

  return (
    <div>
      {/* Pitch */}
      <div style={{
        position: "relative",
        width: "100%",
        paddingBottom: "66%",
        background: "linear-gradient(180deg, var(--pitch-light) 0%, var(--pitch) 30%, var(--pitch-light) 50%, var(--pitch) 70%, var(--pitch-light) 100%)",
        borderRadius: 16,
        overflow: "hidden",
        border: "2px solid #1e4a2a",
      }}>
        {/* Field SVG lines */}
        <svg
          viewBox="0 0 100 66"
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          preserveAspectRatio="none"
        >
          {/* Grass stripes */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect
              key={i}
              x="0" y={i * 8.25} width="100" height={8.25}
              fill={i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent"}
            />
          ))}
          {/* Touchlines */}
          <rect x="4" y="3" width="92" height="60" fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="0.35" />
          {/* Center line */}
          <line x1="4" y1="33" x2="96" y2="33" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          {/* Center circle */}
          <circle cx="50" cy="33" r="9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          <circle cx="50" cy="33" r="0.6" fill="rgba(255,255,255,0.25)" />
          {/* Top penalty box */}
          <rect x="28" y="3" width="44" height="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          {/* Top 6-yard box */}
          <rect x="38" y="3" width="24" height="5.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
          {/* Bottom penalty box */}
          <rect x="28" y="49" width="44" height="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.3" />
          {/* Bottom 6-yard box */}
          <rect x="38" y="57.5" width="24" height="5.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />
          {/* Penalty spots */}
          <circle cx="50" cy="12" r="0.5" fill="rgba(255,255,255,0.2)" />
          <circle cx="50" cy="54" r="0.5" fill="rgba(255,255,255,0.2)" />
        </svg>

        {/* Players */}
        {players.map((player) => {
          const ts = TIER_STYLE[player.tier];
          const isActive = active === player.name;

          return (
            <button
              key={player.name}
              onClick={() => setActive(isActive ? null : player.name)}
              style={{
                position: "absolute",
                left: `${player.position.x}%`,
                top: `${player.position.y}%`,
                transform: "translate(-50%, -50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                zIndex: isActive ? 10 : 2,
                padding: 0,
              }}
            >
              {/* Player avatar — photo if available, initials fallback */}
              {(() => {
                const imgUrl = playerImageUrl(player.name);
                const size = isActive ? 64 : 52;
                return (
                  <div style={{
                    width: size, height: size, borderRadius: "50%",
                    border: `2.5px solid ${ts.border}`,
                    overflow: "hidden",
                    background: imgUrl ? "#0d1a12" : (isActive
                      ? `radial-gradient(circle at 35% 35%, ${ts.border}33, #0d1f14)`
                      : "radial-gradient(circle at 35% 35%, #1a3a22, #0d1a12)"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: isActive
                      ? `0 0 24px ${ts.glow}, 0 4px 16px rgba(0,0,0,0.5)`
                      : "0 2px 8px rgba(0,0,0,0.45)",
                    transition: "all 0.2s ease",
                  }}>
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={player.name}
                        style={{
                          width: "100%", height: "100%",
                          objectFit: "cover",
                          objectPosition: "top center",
                          filter: isActive ? "none" : "brightness(0.85)",
                          transition: "filter 0.2s",
                        }}
                      />
                    ) : (
                      <span style={{
                        fontSize: 15, fontWeight: 700,
                        color: isActive ? ts.border : "var(--text)",
                        fontFamily: "'Bebas Neue', sans-serif",
                        letterSpacing: "0.04em",
                      }}>
                        {initials(player.name)}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Last name */}
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 11,
                letterSpacing: "0.06em",
                color: isActive ? ts.border : "rgba(232,239,232,0.92)",
                textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}>
                {lastName(player.name)}
              </span>

              {/* Tier badge */}
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 9,
                letterSpacing: "0.04em",
                color: ts.badge,
                background: ts.badgeBg,
                border: `1px solid ${ts.badge}40`,
                padding: "1px 5px",
                borderRadius: 4,
                lineHeight: 1.4,
              }}>
                {player.tier}
              </span>

              {/* Prediction */}
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 8,
                color: "rgba(143,168,152,0.75)",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}>
                {player.prediction}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deal panel */}
      {activePlayer && (
        <div style={{
          marginTop: 12,
          background: "var(--surface)",
          border: `1px solid ${TIER_STYLE[activePlayer.tier].border}30`,
          borderRadius: 14,
          overflow: "hidden",
          animation: "slideIn 0.18s ease-out",
        }}>
          {/* Header */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="bebas"
                style={{ fontSize: 22, letterSpacing: "0.04em", color: "var(--text)", lineHeight: 1 }}
              >
                {activePlayer.name}
              </span>
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 13,
                letterSpacing: "0.06em",
                color: TIER_STYLE[activePlayer.tier].badge,
                background: TIER_STYLE[activePlayer.tier].badgeBg,
                border: `1px solid ${TIER_STYLE[activePlayer.tier].badge}40`,
                padding: "2px 8px",
                borderRadius: 6,
              }}>
                {activePlayer.tier} TIER
              </span>
            </div>
            <button
              onClick={() => setActive(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-3)",
                cursor: "pointer",
                fontSize: 20,
                lineHeight: 1,
                padding: "0 4px",
              }}
            >
              ×
            </button>
          </div>

          {/* Deals */}
          {activePlayer.deals.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No deals found yet — run a scan to populate
            </div>
          ) : (
            activePlayer.deals.slice(0, 3).map((deal, i) => (
              <DealRow key={i} deal={deal} isLast={i === Math.min(activePlayer.deals.length, 3) - 1} />
            ))
          )}

          {/* Comps link */}
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border)",
            background: "var(--surface-2)",
          }}>
            <a
              href={`https://130point.com/cards/?search=${encodeURIComponent(activePlayer.name + " auto")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}
            >
              View comps on 130point →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function DealRow({ deal, isLast }: { deal: PitchPlayerData["deals"][0]; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        background: hovered ? "var(--surface-2)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      {/* Row 1: product + numbering + AUTO + Grade */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
        {deal.product && (
          <span className="mono" style={{ fontSize: 10, color: deal.productColor, fontWeight: 500 }}>
            {deal.product}
          </span>
        )}
        {deal.numbered && (
          <span className="mono" style={{ fontSize: 10, color: "var(--text-2)", fontWeight: 600 }}>
            {deal.numbered}
          </span>
        )}
        {deal.isAuto && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100,
            background: "rgba(34,197,94,0.15)", color: "var(--green)",
            border: "1px solid rgba(34,197,94,0.25)",
          }}>
            AUTO
          </span>
        )}
        {deal.grade && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 100,
            background: "rgba(234,179,8,0.15)", color: "var(--amber)",
            border: "1px solid rgba(234,179,8,0.25)",
          }}>
            {deal.grade}
          </span>
        )}
      </div>

      {/* Row 2: Title as link */}
      <div style={{ marginBottom: 7 }}>
        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: "var(--text-2)",
            lineHeight: 1.4,
            display: "block",
          }}
        >
          {deal.title}
        </a>
      </div>

      {/* Row 3: Price + offer + action */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="bebas" style={{ fontSize: 26, color: "var(--text)", lineHeight: 1 }}>
          ${deal.price < 1000
            ? deal.price.toFixed(deal.price < 10 ? 2 : 0)
            : deal.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        </span>
        {deal.offer && (
          <span className="mono" style={{ fontSize: 10, color: "var(--amber)", fontWeight: 600 }}>
            offer ${deal.offer}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span className="mono" style={{
          fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
          background: deal.actionColor,
          color: deal.actionColor === "#eab308" ? "#000" : "#fff",
        }}>
          {deal.actionLabel}
        </span>
      </div>
    </div>
  );
}
