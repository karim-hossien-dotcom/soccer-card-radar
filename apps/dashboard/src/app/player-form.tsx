"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SnipeData } from "./snipe/load";
import s from "./snipe/snipe.module.css";

/** Player form (real-life stats), refreshed weekly by the researcher; approving a row makes it count in the Snipe score. */
export default function PlayerFormTable({ players }: { players: SnipeData["players"] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const decide = async (actionId: string, asOf: string, approved: boolean) => {
    const res = await fetch("/api/snipe/form", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ actionId, asOf, approved }) });
    const j = await res.json().catch(() => ({}));
    setMsg(res.ok ? "" : `Not saved: ${j.error ?? res.status}`);
    if (res.ok) router.refresh();
  };
  const list = players.filter((p) => !p.legend);
  const pending = list.filter((p) => p.latest && !p.latest.approved).length;
  const newest = list.map((p) => p.latest?.asOf).filter(Boolean).sort().pop() ?? null;
  const days = newest ? Math.floor((Date.now() - new Date(newest + "T12:00:00Z").getTime()) / 86_400_000) : null;
  return (
    <section aria-labelledby="form-h">
      <h2 className="section" id="form-h">Player form</h2>
      <p className={s.basis}>
        Real-life stats from the researcher, this season, refreshed weekly. They only count in the Snipe score once you approve them{pending ? `; ${pending} waiting` : ""}. Legends (Ronaldo, Messi, Salah, Neymar, Lewandowski) are scored on signal and tier only.
        {newest && <> Last update: {newest}{days !== null && days > 7 ? <strong className="loss"> ({days} days old: weekly refresh is overdue)</strong> : null}.</>}
      </p>
      {msg && <p className="notice" role="status">{msg}</p>}
      <div className="sheet-wrap">
        <table className={`sheet ${s.form}`}>
          <thead>
            <tr><th>Player</th><th className="num">Apps</th><th className="num">Min</th><th className="num">G</th><th className="num">A</th><th className="num">Rating</th><th className="num">Age</th><th>Status</th></tr>
          </thead>
          <tbody>
            {list.map(({ action: a, latest: f }) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.player}</strong> <span className="muted">{a.signal}</span>
                  {f && <div className="serif muted" style={{ fontSize: 13 }}>{f.club}{f.note ? `. ${f.note}` : ""} {f.sources[0] && <a href={f.sources[0]} target="_blank" rel="noopener noreferrer">Source</a>}</div>}
                </td>
                <td className="num">{f?.apps ?? "—"}</td>
                <td className="num">{f?.minutes ?? "—"}</td>
                <td className="num">{f?.goals ?? "—"}</td>
                <td className="num">{f?.assists ?? "—"}</td>
                <td className="num">{f?.avgRating ?? "—"}</td>
                <td className="num">{f?.age ?? "—"}</td>
                <td>
                  {!f ? <span className="muted">No stats yet</span> : f.approved ? (
                    <>Approved <button className="btn" style={{ padding: "2px 8px", marginLeft: 6 }} onClick={() => decide(a.id, f.asOf, false)}>Undo</button></>
                  ) : (
                    <button className="btn btn-primary" style={{ padding: "3px 10px" }} onClick={() => decide(a.id, f.asOf, true)}>Approve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
