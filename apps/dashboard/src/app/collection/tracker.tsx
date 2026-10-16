"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { WeekTotal } from "./snapshot";
import type { CollectionCard } from "./load";
import s from "./collection.module.css";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`;
const short = (w: string) => new Date(w + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export type Mover = { card: CollectionCard; wow: number };

export default function Tracker({ weeks, movers }: { weeks: WeekTotal[]; movers: Mover[] }) {
  const last = weeks[weeks.length - 1];
  const prev = weeks.length >= 2 ? weeks[weeks.length - 2] : null;
  const delta = prev && last ? last.total - prev.total : null;
  const pct = prev && delta !== null && prev.total ? (delta / prev.total) * 100 : null;
  const data = weeks.slice(-12).map((w) => ({ week: short(w.week), total: Math.round(w.total) }));
  const risers = movers.filter((m) => m.wow > 0).sort((a, b) => b.wow - a.wow).slice(0, 5);
  const fallers = movers.filter((m) => m.wow < 0).sort((a, b) => a.wow - b.wow).slice(0, 5);

  return (
    <section className={s.tracker} aria-label="Value tracker">
      <div className={s.trackHead}>
        <h2>
          Form{" "}
          {delta === null ? (
            <span className={`${s.trackVal} ${s.base}`}>Baseline week</span>
          ) : (
            <span className={`${s.trackVal} ${delta >= 0 ? s.pos : s.neg}`}>{signed(delta)} this week{pct !== null && <small> ({pct >= 0 ? "+" : ""}{pct.toFixed(1)}%)</small>}</span>
          )}
        </h2>
        {last && <span className={s.note}>Week of {short(last.week)}: graded {usd(last.graded)}, raw {usd(last.raw)}, at PSA {usd(last.atGrader)}</span>}
      </div>

      {weeks.length >= 2 ? (
        <div className={s.chart} role="img" aria-label={`Collection value over the last ${data.length} weeks, from ${usd(data[0].total)} to ${usd(data[data.length - 1].total)}`}>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--rule)" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "var(--ink-3)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--ink-3)", fontSize: 12 }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} tickCount={4} domain={["auto", "auto"]} />
              <Tooltip
                cursor={{ stroke: "var(--ink-3)", strokeDasharray: "3 3" }}
                contentStyle={{ background: "var(--chalk)", border: "1px solid var(--ink)", borderRadius: 4, color: "var(--ink)", fontSize: 13 }}
                formatter={(v) => [usd(Number(v)), "Value"]}
              />
              <Line type="monotone" dataKey="total" stroke="var(--pitch)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--pitch)", stroke: "var(--chalk)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={s.note}>This is the first saved week. The chart and week-on-week changes start once next week&apos;s prices are in.</p>
      )}

      {(risers.length > 0 || fallers.length > 0) && (
        <div className={s.movers}>
          <MoverList title="Rising" items={risers} />
          <MoverList title="Falling" items={fallers} />
        </div>
      )}
    </section>
  );
}

function MoverList({ title, items }: { title: string; items: Mover[] }) {
  return (
    <div>
      <h3>{title}</h3>
      {items.length === 0 ? <p className={s.muted}>None this week</p> : (
        <ol>
          {items.map((m) => (
            <li key={m.card.id}><span className={s.moverName}>{m.card.player}, {m.card.gradeLabel}</span><b className={m.wow >= 0 ? s.pos : s.neg}>{signed(m.wow)}</b></li>
          ))}
        </ol>
      )}
    </div>
  );
}
