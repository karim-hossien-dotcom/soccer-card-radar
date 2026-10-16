"use client";

import { useState } from "react";
import type { PitchPlayerData } from "./helpers";
import p from "./pitch.module.css";

const TIER_CLASS = { S: p.tierS, A: p.tierA, B: p.tierB } as const;

const money = (n: number) => `$${n >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n)}`;
const initials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
const lastName = (name: string) => name.split(" ").filter(Boolean).pop()!;

// Map player names to local image files in /players/
function playerImageUrl(name: string): string | null {
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace("eli junior ", "eli-").replace("neymar jr", "neymar-jr");
  const known = [
    "cristiano-ronaldo", "lionel-messi", "kylian-mbappe", "erling-haaland",
    "jude-bellingham", "vinicius-junior", "lamine-yamal", "cole-palmer",
    "florian-wirtz", "mohamed-salah", "neymar-jr", "robert-lewandowski",
    "kobbie-mainoo", "viktor-gyokeres", "geovany-quenda", "senny-mayulu",
    "mateus-mane", "shea-lacey", "endrick", "eli-kroupi",
    "santiago-castro", "nico-paz", "claudio-echeverri",
  ];
  return known.includes(slug) ? `/players/${slug}.png` : null;
}

export default function PitchView({ players }: { players: PitchPlayerData[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activePlayer = players.find((pl) => pl.name === active) ?? null;

  return (
    <div className={p.layout}>
      <div className={p.pitch}>
        <div className={p.field}>
        <Lines h={66} className={p.linesWide} />
        <Lines h={92} className={p.linesTall} />

        {players.map((pl) => {
          const isActive = active === pl.name;
          const showTip = hovered === pl.name && !isActive;
          const img = playerImageUrl(pl.name);
          return (
            <button
              key={pl.name}
              className={`${p.token} ${TIER_CLASS[pl.tier]}`}
              style={{ left: `${pl.position.x}%`, top: `${pl.position.y}%` }}
              aria-expanded={isActive}
              aria-label={`${pl.name}, tier ${pl.tier}, ${pl.deals.length} deals`}
              onClick={() => setActive(isActive ? null : pl.name)}
              onMouseEnter={() => setHovered(pl.name)}
              onMouseLeave={() => setHovered((h) => (h === pl.name ? null : h))}
              onFocus={() => setHovered(pl.name)}
              onBlur={() => setHovered((h) => (h === pl.name ? null : h))}
            >
              {showTip && <Tip player={pl} below={pl.position.y < 25} />}
              <span className={p.photo}>{img ? <img src={img} alt="" /> : <span className={p.initials}>{initials(pl.name)}</span>}</span>
              <span className={p.name}>{lastName(pl.name)}</span>
              <span className={p.pred}>{pl.prediction}</span>
            </button>
          );
        })}
        </div>
        <div className={p.key} aria-label="Ring colour shows tier">
          <span className={p.tierS}><i className={p.dot} />Tier S</span>
          <span className={p.tierA}><i className={p.dot} />Tier A</span>
          <span className={p.tierB}><i className={p.dot} />Tier B</span>
        </div>
      </div>

      <div className={p.side}>
      {!activePlayer && <p className={p.hint}>Tap a player to see their cheapest live deals.</p>}
      {activePlayer && (
        <section className={p.panel} aria-label={`${activePlayer.name} deals`}>
          <div className={p.panelHead}>
            <h2>{activePlayer.name} <span className="muted" style={{ fontWeight: 500, fontSize: 15 }}>Tier {activePlayer.tier}</span></h2>
            <button className={p.close} onClick={() => setActive(null)} aria-label="Close deals">×</button>
          </div>
          {activePlayer.deals.length === 0 ? (
            <p className={p.empty}>No live deals for {activePlayer.name}. Run a scan to look again.</p>
          ) : (
            <table className="sheet">
              <tbody>
                {activePlayer.deals.slice(0, 3).map((d, i) => <DealRow key={i} deal={d} />)}
              </tbody>
            </table>
          )}
          <p className={p.foot}>
            <a href={`https://130point.com/cards/?search=${encodeURIComponent(activePlayer.name + " auto")}`} target="_blank" rel="noopener noreferrer">
              Sold comps on 130point
            </a>
          </p>
        </section>
      )}
      </div>
    </div>
  );
}

/** Pitch markings in a 100 x h box, so the field can be wider (desktop) or taller (phone) without stretching the circle. */
function Lines({ h, className }: { h: number; className: string }) {
  const band = h / 8;
  return (
    <svg className={`${p.lines} ${className}`} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" aria-hidden>
      {[0, 2, 4, 6].map((i) => <rect key={i} x="0" y={i * band} width="100" height={band} fill="var(--pitch-2)" />)}
      <g fill="none" stroke="rgba(244,241,234,0.55)" strokeWidth="0.35" vectorEffect="non-scaling-stroke">
        <rect x="4" y="3" width="92" height={h - 6} />
        <line x1="4" y1={h / 2} x2="96" y2={h / 2} />
        <circle cx="50" cy={h / 2} r="9" />
        <rect x="28" y="3" width="44" height="14" />
        <rect x="38" y="3" width="24" height="5.5" />
        <rect x="28" y={h - 17} width="44" height="14" />
        <rect x="38" y={h - 8.5} width="24" height="5.5" />
      </g>
      <g fill="rgba(244,241,234,0.7)"><circle cx="50" cy={h / 2} r="0.6" /><circle cx="50" cy="12" r="0.5" /><circle cx="50" cy={h - 12} r="0.5" /></g>
    </svg>
  );
}

function Tip({ player: pl, below }: { player: PitchPlayerData; below: boolean }) {
  const s = pl.stats && pl.stats.sample_size > 0 ? pl.stats : null;
  return (
    <span className={`${p.tip} ${below ? p.tipBelow : p.tipAbove}`} role="tooltip">
      <b>{pl.name}</b>
      <span>Tier {pl.tier}, {pl.prediction}</span>
      <span className={pl.deals.length ? "gain" : "muted"}>{pl.deals.length} live {pl.deals.length === 1 ? "deal" : "deals"}</span>
      {s && (
        <>
          {s.fair_value_mid !== null && <span>Fair value {money(s.fair_value_mid)}</span>}
          {s.last_5_avg !== null && <span>Last 5 sales {money(s.last_5_avg)}</span>}
          <span className="muted">
            {s.sample_size} sold in 30 days
            {s.trend_7d_pct !== null && <>, <span className={s.trend_7d_pct >= 0 ? "gain" : "loss"}>{s.trend_7d_pct >= 0 ? "+" : "−"}{Math.abs(s.trend_7d_pct).toFixed(0)}% this week</span></>}
          </span>
        </>
      )}
    </span>
  );
}

function DealRow({ deal }: { deal: PitchPlayerData["deals"][0] }) {
  const price = deal.price < 1000 ? deal.price.toFixed(deal.price < 10 ? 2 : 0) : deal.price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const act =
    deal.actionLabel === "BUY" ? { text: "Buy it now", cls: "" }
    : deal.actionLabel === "OFFER" ? { text: `Offer $${deal.offer}`, cls: "" }
    : { text: `Ends in ${deal.actionLabel}`, cls: "loss" };
  return (
    <tr className={p.deal}>
      <td>
        <a className={p.dealTitle} href={deal.url} target="_blank" rel="noopener noreferrer">{deal.title}</a>
        <div className={p.facts}>
          {deal.product && <span>{deal.product}</span>}
          {deal.numbered && <span>Numbered {deal.numbered}</span>}
          {deal.isAuto && <span>Auto</span>}
          {deal.grade && <span>{deal.grade}</span>}
        </div>
      </td>
      <td className={`num ${p.price}`}>${price}</td>
      <td className="num"><a className={`${p.act} ${act.cls}`} href={deal.url} target="_blank" rel="noopener noreferrer">{act.text}</a></td>
    </tr>
  );
}
