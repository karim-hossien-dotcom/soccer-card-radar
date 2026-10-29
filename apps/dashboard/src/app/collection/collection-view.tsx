"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CollectionCard, CollectionData } from "./load";
import Tracker from "./tracker";
import CompsPanel from "./comps-panel";
import s from "./collection.module.css";
import { snipeHref, prefillFromComps } from "@/lib/grading";

type Scenario = "now" | "10" | "9" | "8";
type StatusFilter = "all" | "graded" | "raw" | "at_grader" | "stale";
type SortKey = "value" | "gain" | "upside" | "cost" | "date" | "name";

const STATUS_LABEL: Record<string, string> = { graded: "Graded", raw: "Raw", at_grader: "At PSA", sealed: "Sealed", sold: "Sold" };
const usd = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const signed = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`);
const tone = (n: number | null | undefined) => (n === null || n === undefined ? "" : n >= 0 ? s.pos : s.neg);

function scenarioValue(c: CollectionCard, sc: Scenario): number | null {
  if (sc === "now" || c.status === "graded" || c.status === "sealed") return c.valueNow;
  const v = sc === "10" ? c.psa10 : sc === "9" ? c.psa9 : c.psa8;
  return v ?? c.valueNow;
}
const gain = (c: CollectionCard, sc: Scenario) => {
  const v = scenarioValue(c, sc);
  return v === null || c.cost === null ? null : v - c.cost;
};

export default function CollectionView({ cards, weeks, trends }: CollectionData) {
  const [scen, setScen] = useState<Scenario>("now");
  const [stat, setStat] = useState<StatusFilter>("all");
  const [player, setPlayer] = useState("");
  const [sort, setSort] = useState<SortKey>("value");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CollectionCard | null>(null);
  const [compsOpen, setCompsOpen] = useState(false);
  const [zoom, setZoom] = useState<{ src: string; x: number; y: number } | null>(null);

  const players = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cards) counts.set(c.player, (counts.get(c.player) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [cards]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const L = cards.filter(
      (c) =>
        (stat === "all" || c.status === stat || (stat === "raw" && c.status === "sealed") || (stat === "stale" && c.stale)) &&
        (!player || c.player === player) &&
        (!needle || `${c.item} ${c.cert ?? ""} ${c.player}`.toLowerCase().includes(needle)),
    );
    const key: Record<SortKey, (c: CollectionCard) => number | string> = {
      value: (c) => scenarioValue(c, scen) ?? -1,
      gain: (c) => gain(c, scen) ?? -1e9,
      upside: (c) => (scenarioValue(c, scen) ?? 0) - (c.valueNow ?? 0),
      cost: (c) => c.cost ?? -1,
      date: (c) => c.dateAdded ?? "",
      name: (c) => c.player,
    };
    return L.sort((a, b) => {
      const ka = key[sort](a), kb = key[sort](b);
      if (sort === "name") return String(ka).localeCompare(String(kb));
      return ka < kb ? 1 : ka > kb ? -1 : 0;
    });
  }, [cards, scen, stat, player, sort, q]);

  const totals = useMemo(() => {
    let cost = 0, value = 0, withCost = 0;
    for (const c of list) {
      const v = scenarioValue(c, scen);
      if (v !== null) value += v;
      if (c.cost !== null) { cost += c.cost; if (v !== null) withCost += v - c.cost; }
    }
    return { cost, value, gain: withCost };
  }, [list, scen]);

  useEffect(() => {
    const close = () => setZoom(null);
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, []);

  const movers = useMemo(
    () => cards.flatMap((c) => { const w = trends[c.id]?.wow; return w ? [{ card: c, wow: w }] : []; }),
    [cards, trends],
  );

  const staleCount = useMemo(() => cards.filter((c) => c.stale).length, [cards]);

  return (
    <div className={s.wrap}>
      <header className="page-head" style={{ marginBottom: 0 }}>
        <h1>Vault</h1>
        <p>{cards.length} cards, valued from the latest comps. Raw cards can also be priced as if graded.</p>
      </header>
      <Tracker weeks={weeks} movers={movers} />
      <div className={s.due} role="region" aria-label="Comps">
        <span>{staleCount ? `${staleCount} cards have comps older than 14 days.` : "All comps are current."}</span>
        <button className={s.btn} onClick={() => setCompsOpen(true)}>Update comps</button>
      </div>
      <div className={s.controls}>
        <Seg label="Price as" value={scen} onChange={(v) => setScen(v as Scenario)} options={[["now", "Now"], ["10", "PSA 10"], ["9", "PSA 9"], ["8", "PSA 8"]]} />
        <Seg label="Show" value={stat} onChange={(v) => setStat(v as StatusFilter)} options={[["all", "All"], ["graded", "Graded"], ["raw", "Raw"], ["at_grader", "At PSA"], ["stale", `Stale (${staleCount})`]]} />
        <div className={s.row}>
          <select aria-label="Player" value={player} onChange={(e) => setPlayer(e.target.value)}>
            <option value="">All players</option>
            {players.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="value">Value</option>
            <option value="gain">Gain or loss</option>
            <option value="upside">Upside vs now</option>
            <option value="cost">Cost</option>
            <option value="date">Date added (newest)</option>
            <option value="name">Player A–Z</option>
          </select>
          <input type="search" placeholder="Search set, parallel, cert" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <section className={s.kpis} aria-label="Collection totals">
        <div><span>Cards</span><b>{list.length}</b></div>
        <div><span>Cost</span><b>{usd(totals.cost)}</b></div>
        <div><span>{scen === "now" ? "Value now" : `Value if PSA ${scen}`}</span><b>{usd(totals.value)}</b></div>
        <div><span>Gain or loss</span><b className={tone(totals.gain)}>{signed(totals.gain)}</b></div>
      </section>

      <section className={s.grid} aria-label="Cards">
        {list.map((c) => {
          const v = scenarioValue(c, scen);
          const g = gain(c, scen);
          const est = scen !== "now" && c.estimated && c.status !== "graded";
          return (
            <button key={c.id} className={s.tile} onClick={() => { setZoom(null); setOpen(c); }} aria-label={`${c.player}, ${c.item}`}>
              <div
                className={s.shot}
                onMouseMove={(e) => {
                  if (!c.imagePath || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
                  setZoom({ src: c.imagePath, x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setZoom(null)}
              >
                {c.imagePath ? <img src={c.imagePath} alt="" loading="lazy" /> : <div className={s.ph}><span>{c.player}</span></div>}
              </div>
              <div className={s.tag} data-status={c.status}>{c.status === "graded" ? c.gradeLabel : STATUS_LABEL[c.status]}{c.stale && <span className={s.staleTag}>stale</span>}</div>
              <div className={s.meta}>
                <div className={s.pl}>{c.player}</div>
                <div className={s.it}>{c.item}</div>
                <div className={s.nums}>
                  <span className={s.val}>{usd(v)}{est && <small> est.</small>}</span>
                  <span className={tone(g)}>{signed(g)}</span>
                </div>
                {trends[c.id]?.wow ? <div className={`${s.sub} ${tone(trends[c.id].wow)}`}>{signed(trends[c.id].wow)} this week</div> : null}
                {sort === "date" && <div className={s.sub}>Added {c.dateAdded ?? "date unknown"}</div>}
                {c.status === "raw" && c.decision && <div className={s.sub}>{c.decision}</div>}
              </div>
            </button>
          );
        })}
        {list.length === 0 && <div className={s.empty}>No cards match these filters. Clear the search or pick All.</div>}
      </section>

      {zoom && <Zoom {...zoom} />}
      {compsOpen && <CompsPanel cards={cards} inView={list} onClose={() => setCompsOpen(false)} />}
      {open && <Drawer card={open} series={trends[open.id]?.series ?? []} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Seg({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className={s.seg} role="group" aria-label={label}>
      <span className={s.lbl}>{label}</span>
      {options.map(([v, t]) => (
        <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{t}</button>
      ))}
    </div>
  );
}

function Zoom({ src, x, y }: { src: string; x: number; y: number }) {
  const W = 300, H = 420, pad = 16;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = x + pad + W > vw ? Math.max(pad, x - pad - W) : x + pad;
  const top = Math.min(Math.max(pad, y - H / 2), vh - H - pad);
  return (
    <div className={s.zoom} style={{ left, top, width: W, height: H }} aria-hidden>
      <img src={src} alt="" />
    </div>
  );
}

function Drawer({ card: c, series, onClose }: { card: CollectionCard; series: { week: string; value: number }[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const showScen = c.status === "raw" || c.status === "at_grader";
  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.drawer} role="dialog" aria-modal aria-label={c.item} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button className={s.close} onClick={onClose} aria-label="Close">×</button>
        {c.imagePath && (
          <div className={`${s.dimg} ${zoomed ? s.zoomed : ""}`} onClick={() => setZoomed((z) => !z)}>
            <img src={c.imagePath} alt={c.item} />
          </div>
        )}
        <h2>{c.player}</h2>
        <p className={s.full}>{c.item}</p>
        <table className={s.tbl}><tbody>
          <tr><td>Grade</td><td>{c.gradeLabel}</td></tr>
          {c.cert && <tr><td>Cert</td><td>{c.cert}</td></tr>}
          {c.qty > 1 && <tr><td>Quantity</td><td>{c.qty}</td></tr>}
          {c.submissionId && <tr><td>PSA order</td><td>{c.submissionId}</td></tr>}
          <tr><td>Status</td><td>{STATUS_LABEL[c.status]}</td></tr>
          <tr><td>Date added</td><td>{c.dateAdded ?? "—"}</td></tr>
          <tr><td>Cost basis</td><td>{usd(c.cost, 2)}</td></tr>
          <tr><td>Value now</td><td>{usd(c.valueNow, 2)}</td></tr>
          <tr><td>Priced</td><td className={c.stale ? s.warn : undefined}>{c.compAsOf ? `${c.compGrade} comp, ${c.compAsOf}${c.stale ? " (stale)" : ""}` : "no comp yet"}</td></tr>
          {c.pop && <tr><td>PSA pop</td><td>{c.pop.gem10 ?? "—"} PSA 10 of {c.pop.total ?? "—"} graded{c.pop.gemRate !== null ? ` (${Math.round(c.pop.gemRate * 100)}% gem)` : ""}</td></tr>}
          <tr><td>Gain or loss now</td><td className={tone(c.valueNow !== null && c.cost !== null ? c.valueNow - c.cost : null)}>{c.valueNow !== null && c.cost !== null ? signed(c.valueNow - c.cost) : "—"}</td></tr>
        </tbody></table>
        {series.length >= 2 && <Spark series={series} />}
        {showScen && (
          <table className={s.tbl}>
            <thead><tr><th>If graded</th><th>Value</th><th>Net vs cost{c.status === "raw" ? " + fee" : ""}</th></tr></thead>
            <tbody>
              <tr><td>PSA 10</td><td>{usd(c.psa10)}</td><td className={tone(c.net10)}>{signed(c.net10)}</td></tr>
              <tr><td>PSA 9</td><td>{usd(c.psa9)}</td><td className={tone(c.net9)}>{signed(c.net9)}</td></tr>
              <tr><td>PSA 8</td><td>{usd(c.psa8)}</td><td className={tone(c.net8)}>{signed(c.net8)}</td></tr>
            </tbody>
          </table>
        )}
        {c.decision && <div className={s.dec}>{c.decision}</div>}
        {c.estimated && showScen && <p className={s.note}>No PSA 10/9 sales found: graded values use the {c.band} raw-to-graded multiples.</p>}
        <p className={s.note}>
          {c.maxBid !== null && showScen && <>Snipe max bid for another copy: {usd(c.maxBid)}. </>}
          <a href={snipeHref(prefillFromComps(c.item, c.player, c.cert, c.gradeLabel.split(" ")[0], c.comps))}>Snipe another copy →</a>
        </p>
        <h3>Price records</h3>
        <table className={s.tbl}><tbody>
          {c.comps.map((p, i) => <tr key={i}><td>{p.grade}</td><td>{usd(p.price, 2)}</td><td className={s.muted}>{p.method === "value_used" ? "current value" : p.method}</td><td className={s.muted}>{p.asOf}</td></tr>)}
        </tbody></table>
        {c.ledger.length > 0 && (<>
          <h3>Ledger</h3>
          <table className={s.tbl}><tbody>
            {c.ledger.map((l, i) => <tr key={i}><td>{l.kind.replace("_", " ")}</td><td>{usd(l.amount, 2)}</td><td className={s.muted}>{l.source}</td><td className={s.muted}>{l.occurredOn ?? ""}</td></tr>)}
          </tbody></table>
        </>)}
        {c.notes && <p className={s.note}>{c.notes}</p>}
      </div>
    </div>
  );
}

function Spark({ series }: { series: { week: string; value: number }[] }) {
  const W = 300, H = 56, P = 6;
  const vals = series.map((p) => p.value);
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = series.map((p, i) => [P + (i * (W - 2 * P)) / (series.length - 1), H - P - ((p.value - lo) * (H - 2 * P)) / span]);
  const first = vals[0], last = vals[vals.length - 1];
  return (
    <figure className={s.spark}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={H} role="img" aria-label={`Value over ${series.length} weeks: ${usd(first)} to ${usd(last)}`}>
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--pitch)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4" fill="var(--pitch)" stroke="var(--chalk)" strokeWidth="2" />
      </svg>
      <figcaption className={s.muted}>{series.length} weeks: {usd(first)} → {usd(last)} ({signed(last - first)})</figcaption>
    </figure>
  );
}
