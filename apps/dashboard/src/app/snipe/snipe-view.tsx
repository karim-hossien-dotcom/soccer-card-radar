"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SnipeData, BoardRow, Target, LiveListing, Decision } from "./load";
import type { Budget } from "@/lib/budget";
import TargetPanel from "./target-panel";
import { findTarget, type SnipePrefill } from "@/lib/grading";
import s from "./snipe.module.css";

const usd = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${n >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(n % 1 ? 2 : 0)}`);
/** C2: a live price above the engine's max bid is shown but greyed out. */
const over = (price: number | null, max: number | null) => price !== null && max !== null && price > max;
const short = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const agoShort = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z").getTime()) / 3600_000);
  return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};
const endsIn = (iso: string | null) => {
  if (!iso) return "";
  const m = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  return m < 60 ? `${m}m` : m < 2880 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`;
};

export default function SnipeView({ budget: serverBudget, decisions: serverDecisions, rows, players, actions, gemHaircut, psa9Haircut, maxBidRule: m, own, prefill = null, listingsAt = null }: SnipeData & { prefill?: SnipePrefill | null; listingsAt?: string | null }) {
  const [open, setOpen] = useState<string | null>(null);
  // C3: apply a decision on screen as soon as the server accepts it; the next server render replaces this.
  const [local, setLocal] = useState<{ decisions: Record<string, Decision>; spent: number }>({ decisions: {}, spent: 0 });
  useEffect(() => setLocal({ decisions: {}, spent: 0 }), [serverBudget.left, serverDecisions]);
  const decisions = { ...serverDecisions, ...local.decisions };
  const budget = { ...serverBudget, left: Math.round((serverBudget.left - local.spent) * 100) / 100 };
  const onDecided = (id: string, d: Decision) => {
    const prev = decisions[id];
    const delta = (d.status === "approved" ? d.maxBid : 0) - (prev?.status === "approved" ? prev.maxBid : 0);
    setLocal((x) => ({ decisions: { ...x.decisions, [id]: d }, spent: x.spent + delta }));
  };
  const [editing, setEditing] = useState<Target | "new" | null>(null);
  const [draft, setDraft] = useState<Partial<Target> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // G1: arriving from the Vault ("Snipe another copy"): open the existing target, or the add form prefilled.
  useEffect(() => {
    if (!prefill) return;
    const hit = findTarget(rows.map((r) => r.target), prefill.card, prefill.cert);
    if (hit) {
      setOpen(hit.id);
      setNotice(`Already a target: ${hit.card}`);
      requestAnimationFrame(() => document.getElementById(`t-${hit.id}`)?.scrollIntoView({ block: "center" }));
    } else {
      const who = prefill.player.toLowerCase();
      const action = actions.find((a) => a.player.toLowerCase() === who) ?? actions.find((a) => who && (a.player.toLowerCase().includes(who) || who.includes(a.player.toLowerCase())));
      setDraft({ card: prefill.card, query: prefill.card, actionId: action?.id ?? "", raw: prefill.raw ?? null, psa9: prefill.psa9 ?? null, psa10: prefill.psa10 ?? null, compsAsOf: prefill.asOf ?? null, psaCert: prefill.cert ?? null, notes: "Added from the Vault." });
      setNotice(action ? null : `No player on the board matches “${prefill.player}”: pick one in the form.`);
      setEditing("new");
    }
    window.history.replaceState(null, "", "/snipe");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className={s.strip}>
        <div className={s.stats}>
          <div><span>Budget left</span><b>{usd(budget.left)}</b><small>of {usd(budget.budget)} · {short(budget.start)}–{short(budget.end)}</small></div>
          <div><span>Live listings</span><b>{rows.filter((r) => r.live.length).length}</b><small>of {rows.length} targets</small></div>
          {own.graded > 0 && <div><span>Your PSA 10 rate</span><b>{own.psa10} of {own.graded}</b><small>cards you graded</small></div>}
          {listingsAt && <div><span>eBay checked</span><b>{agoShort(listingsAt)}</b><small>daily scan</small></div>}
        </div>
        <button className="btn btn-primary" onClick={() => { setDraft(null); setEditing("new"); }}>Add target</button>
      </div>
      <details className={s.how}>
        <summary>How scoring and max bid work</summary>
        <ul>
          <li><b>Score</b> weighs what the card is worth graded, how cheap the live listing is, how rare it is, and how the player is doing.</li>
          <li><b>Max bid</b> = expected value if graded, less {Math.round(m.sellFee * 100)}% selling fees and the {usd(m.gradingFee)} grading fee, ÷ {m.targetMultiple} (so the graded card, after fees, pays back the grading fee plus {m.targetMultiple}× your bid), capped at {Math.round(m.rawCap * 100)}% of the raw price. No max bid without raw, PSA 9 and PSA 10 comps. Slab targets set their own max.</li>
          <li><b>Grading odds</b> come from the PSA population report (PSA 10s and 9s ÷ total graded). Pop only counts cards people chose to submit, so a raw buy gets {Math.round(gemHaircut * 100)}% of the PSA 10 rate and {Math.round(psa9Haircut * 100)}% of the PSA 9 rate; the rest is valued at raw. Low-confidence comps count for less.</li>
          <li><b>Budget:</b> approved bids count at their max until the auction ends. Approving records your max; it never bids on eBay.</li>
          <li><b>Photo badges</b> come from the grade screen of each listing photo: a warning only, never a grade promise.</li>
        </ul>
      </details>

      <div className="sheet-wrap">
        <table className="sheet" aria-label="Snipe targets">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th>Card</th>
              <th className="num">Score</th>
              <th className="num">Max bid</th>
              <th className="num">Live</th>
              <th className={`num ${s.hideM}`}>If graded</th>
              <th className={s.hideM}>Player</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <Fragment key={r.target.id}>
                {!r.live.length && (i === 0 || rows[i - 1].live.length > 0) && (
                  <tr><td colSpan={7} className={s.divider}>Watching: no live listing for these right now</td></tr>
                )}
                <tr id={`t-${r.target.id}`} className={s.row} aria-expanded={open === r.target.id} onClick={() => setOpen(open === r.target.id ? null : r.target.id)}>
                  <td className="rank">{i + 1}</td>
                  <td>
                    <div className={s.player}>{r.player}</div>
                    <div className={s.card}>{r.target.card}</div>
                    {r.staleComps && <span className={s.flag}>Comps from {r.target.compsAsOf ?? "unknown date"}: re-price before bidding</span>}
                    {r.rawDrift !== null && (r.rawDrift < 0.7 || r.rawDrift > 1.4) && (
                      <span className={s.flag}>Raw comp {usd(r.target.raw)} vs {usd(r.askMedian)} median live ask: check the comp</span>
                    )}
                  </td>
                  <td className="num"><span className={s.score}>{r.result.score ?? "—"}</span></td>
                  <td className="num">{usd(r.result.maxBid)}</td>
                  <td className="num">
                    {r.live.length ? (
                      <>
                        <span className={over(r.livePrice, r.result.maxBid) ? "muted" : undefined}>{usd(r.livePrice)}</span>
                        {r.live[0].screen && r.live[0].screen.verdict !== "error" && <span className={s.screenMini} data-verdict={r.live[0].screen.verdict}>{r.live[0].screen.verdict === "ceiling" ? r.live[0].screen.summary.split(":")[0] : r.live[0].screen.verdict === "no_issue" ? "No visible issue" : "Photo: can't judge"}</span>}
                        <span className={s.small}>{over(r.livePrice, r.result.maxBid) ? "over your max, " : ""}{r.live[0].kind === "auction" ? `auction, ends in ${endsIn(r.live[0].endsAt)}` : "Buy It Now"}{r.live.length > 1 ? `, +${r.live.length - 1} more` : ""}</span>
                      </>
                    ) : <span className="muted">none live</span>}
                  </td>
                  <td className={`num ${s.hideM}`}>
                    <span className={r.result.profit !== null && r.result.profit >= 0 ? "gain" : "loss"}>{r.result.profit === null ? "—" : `${r.result.profit >= 0 ? "+" : "−"}${usd(Math.abs(r.result.profit))}`}</span>
                    <span className={s.small}>expected, after fee</span>
                  </td>
                  <td className={s.hideM}>
                    {r.signal}, tier {r.tier}
                    <span className={s.small}>{r.legend ? "Legend: stats ignored" : r.form ? `Rating ${r.form.avgRating ?? "—"}, ${r.form.goals ?? "—"}G ${r.form.assists ?? "—"}A` : "Stats pending your review"}</span>
                  </td>
                </tr>
                {open === r.target.id && <Detail row={r} budget={budget} decisions={decisions} onDecided={onDecided} onEdit={() => setEditing(r.target)} />}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="serif">No targets yet. Add the first card you want to snipe.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <TargetPanel target={editing === "new" ? null : editing} prefill={editing === "new" ? draft : null} actions={actions} onClose={() => { setEditing(null); setDraft(null); }} />}
    </>
  );
}

function Detail({ row: r, budget, decisions, onDecided, onEdit }: { row: BoardRow; budget: Budget; decisions: Record<string, Decision>; onDecided: (id: string, d: Decision) => void; onEdit: () => void }) {
  const t = r.target;
  return (
    <tr className={s.detail}>
      <td colSpan={7}>
        <div className={s.detailGrid}>
          <div>
            <h3>How the score is built</h3>
            <table className={s.parts}>
              <tbody>
                {r.result.parts.map((p) => (
                  <tr key={p.key}>
                    <td>{p.label}<div className={s.note}>{p.note}</div></td>
                    <td className={p.value === null || !p.weight ? s.off : undefined}>{p.value === null || !p.weight ? "left out" : `${Math.round(p.value * 100)}/100`}</td>
                    <td className={s.off}>weight {p.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Comps</h3>
            <p className={s.note}>
              Raw {usd(t.raw)}, PSA 9 {usd(t.psa9)}, PSA 10 {usd(t.psa10)} as of {t.compsAsOf ?? "unknown"}.{" "}
              {t.popTotal ? `PSA pop ${t.pop10} PSA 10 and ${t.pop9} PSA 9 of ${t.popTotal}${t.popAsOf ? ` (updated ${t.popAsOf})` : " (from the Grade Screen)"}.` : "No PSA pop yet: add a PSA cert of this card so the weekly PSA refresh can pull it."}
              {t.confidence ? ` Confidence ${t.confidence.toLowerCase()}.` : ""} {t.notes}
            </p>
          </div>
          <div>
            <h3>Live listings for this exact card</h3>
            {r.live.length ? (
              <ul className={s.live}>
                {r.live.slice(0, 6).map((l, i) => (
                  <li key={i} className={over(l.price, r.result.maxBid) ? "muted" : undefined}>
                    <strong>{usd(l.price)}</strong> {l.kind === "auction" ? `auction${l.bids !== null ? `, ${l.bids} bid${l.bids === 1 ? "" : "s"}` : ""}, ends in ${endsIn(l.endsAt)}` : "Buy It Now"}{over(l.price, r.result.maxBid) ? ", over your max" : ""}
                    <br /><a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
                    {l.screen && <ScreenBadge s={l.screen} />}
                    <BidControls listing={l} row={r} left={budget.left} decision={decisions[l.externalId]} onDecided={onDecided} skipOnly={l.kind !== "auction"} />
                  </li>
                ))}
              </ul>
            ) : <p className={s.note}>None in the last scan. The daily scan searches “{t.query}”.</p>}
            {r.skipped.length > 0 && (
              <>
                <h3>Skipped</h3>
                <ul className={s.live}>
                  {r.skipped.map((l, i) => (
                    <li key={i} className="muted">
                      <strong>{usd(l.price)}</strong> <a href={l.url} target="_blank" rel="noopener noreferrer">{l.title}</a>
                      <BidControls listing={l} row={r} left={budget.left} decision={decisions[l.externalId] ?? { status: "skipped", maxBid: 0 }} onDecided={onDecided} skipOnly />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {r.form && (
              <>
                <h3>Player form</h3>
                <p className={s.note}>{r.form.club}, {r.form.apps ?? "—"} apps, {r.form.minutes ?? "—"} min, rating {r.form.avgRating ?? "—"}. {r.form.note}</p>
              </>
            )}
            <div className={s.actions}><button className="btn" onClick={onEdit}>Edit target</button></div>
          </div>
        </div>
      </td>
    </tr>
  );
}

/** G3: grade screen of the listing photo. A warning only: it never hides a listing or changes the score. */
function ScreenBadge({ s: x }: { s: NonNullable<LiveListing["screen"]> }) {
  if (x.verdict === "error") return null;
  return (
    <span className={s.screen} data-verdict={x.verdict} title={x.gated ? "Photo checked by the photo screen, then measured" : "Measured without the photo screen"}>
      {x.summary}
    </span>
  );
}

/** C3: approve (with a max), skip, or cancel one auction. Records the decision only; nothing bids on eBay. */
function BidControls({ listing: l, row: r, left, decision, onDecided, skipOnly = false }: { listing: LiveListing; row: BoardRow; left: number; decision?: Decision; onDecided: (id: string, d: Decision) => void; skipOnly?: boolean }) {
  const router = useRouter();
  const suggested = Math.max(0, Math.min(r.result.maxBid ?? 0, left + (decision?.status === "approved" ? decision.maxBid : 0)));
  const [max, setMax] = useState(String(Math.floor(suggested)));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!l.externalId) return null;

  const send = async (action: "approve" | "skip" | "cancel") => {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/snipe/bids", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, externalId: l.externalId, targetId: r.target.id, title: l.title, url: l.url, endsAt: l.endsAt, maxBid: Number(max) }),
    }).catch(() => null);
    setBusy(false);
    const d = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) { setMsg(d.error ?? "Couldn't save"); return; }
    onDecided(l.externalId, { status: action === "approve" ? "approved" : action === "skip" ? "skipped" : "cancelled", maxBid: action === "approve" ? Number(max) : 0 });
    router.refresh();
  };

  if (decision && decision.status !== "cancelled") {
    return (
      <span className={s.bid} onClick={(e) => e.stopPropagation()}>
        {decision.status === "approved" ? <>Approved, max {usd(decision.maxBid)}. Enter it in Gixen or bid by hand. </> : <>{decision.status[0].toUpperCase() + decision.status.slice(1)}. </>}
        {decision.status === "approved" || decision.status === "skipped" ? <button className="btn" disabled={busy} onClick={() => send("cancel")}>Undo</button> : null}
        {msg && <span className="loss"> {msg}</span>}
      </span>
    );
  }
  return (
    <span className={s.bid} onClick={(e) => e.stopPropagation()}>
      {!skipOnly && <label>Max $<input type="number" min={1} step={1} value={max} onChange={(e) => setMax(e.target.value)} aria-label="Max bid in dollars" /></label>}
      {!skipOnly && <button className="btn" disabled={busy || over(l.price, Number(max))} onClick={() => send("approve")}>Approve</button>}
      <button className="btn" disabled={busy} onClick={() => send("skip")}>Skip</button>
      {!skipOnly && over(l.price, Number(max)) && <span className="muted"> current bid is above this max</span>}
      {msg && <span className="loss"> {msg}</span>}
    </span>
  );
}
