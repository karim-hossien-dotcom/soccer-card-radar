"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compTemplate, parseCompPaste } from "@soccer-card-radar/shared";
import type { CollectionCard } from "./load";
import s from "./collection.module.css";

const TOKEN_KEY = "scr.adminToken";
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const store = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; } },
  set: (v: string) => { try { localStorage.setItem(TOKEN_KEY, v); } catch { /* private mode: keep in memory only */ } },
};

/** A4: weekly Card Ladder entry (copy template -> fill prices -> paste -> save) and PSA pop refresh. */
export default function CompsPanel({ cards, inView, onClose }: { cards: CollectionCard[]; inView: CollectionCard[]; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setToken(store.get());
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const lastComp = (id: string, grade: string) => {
    const c = byId.get(id)?.comps.find((p) => p.grade === grade);
    return c ? { price: c.price, asOf: c.asOf } : null;
  };
  const parsed = useMemo(() => (text.trim() ? parseCompPaste(text, cards, today) : null), [text, cards, today]);

  const copyTemplate = async () => {
    const rows = inView.filter((c) => c.status !== "sealed").map((c) => ({
      id: c.id, cert: c.cert, item: c.item, player: c.player, grade: c.compGrade,
      extraGrades: c.compGrade === "raw" ? ["PSA 10", "PSA 9"] : [],
    }));
    const tsv = compTemplate(rows, lastComp);
    try { await navigator.clipboard.writeText(tsv); setMsg({ ok: true, text: `Copied ${tsv.split("\n").length - 1} rows for the ${rows.length} cards in view. Paste into a sheet, fill "new price", paste back here.` }); }
    catch { setText(tsv); setMsg({ ok: false, text: "Clipboard blocked: template placed in the box below instead." }); }
  };

  const call = async (url: string, body?: unknown) => {
    store.set(token);
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
    return json;
  };

  const save = async () => {
    if (!parsed?.rows.length) return;
    setBusy(true); setMsg(null);
    try {
      const { saved } = await call("/api/comps", { rows: parsed.rows.map(({ line, ...r }) => r) });
      setMsg({ ok: true, text: `Saved ${saved} comps. Values updated.` });
      setText("");
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: `Not saved: ${(e as Error).message}` }); }
    setBusy(false);
  };

  const refreshPsa = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await call("/api/psa-refresh");
      setMsg({ ok: !r.stopped || r.stopped === "call budget used", text:
        `PSA: ${r.pops} pops and ${r.images} photos updated (${r.calls} calls); ${r.upToDate} already current` +
        (r.pending ? `, ${r.pending} left for next run` : "") + (r.stopped ? `. Stopped: ${r.stopped}` : "") +
        (r.errors.length ? `. ${r.errors.length} certs failed (${r.errors.slice(0, 3).map((e: { cert: string }) => e.cert).join(", ")})` : "") });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: `PSA refresh failed: ${(e as Error).message}` }); }
    setBusy(false);
  };

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={`${s.drawer} ${s.wide}`} role="dialog" aria-modal aria-label="Update comps" tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button className={s.close} onClick={onClose} aria-label="Close">×</button>
        <h2>Update comps</h2>
        <p className={s.note}>Copy the template for the cards in view, add this week&apos;s Card Ladder prices in the &quot;new price&quot; column, then paste the sheet back. Rows without a new price are ignored.</p>
        <div className={s.row}>
          <button className={s.btn} onClick={copyTemplate}>Copy template ({inView.filter((c) => c.status !== "sealed").length} cards)</button>
          <button className={s.btn} onClick={refreshPsa} disabled={busy || !token}>Refresh PSA pop</button>
        </div>
        <textarea className={s.paste} aria-label="Paste comps" placeholder={"Paste the filled template, or lines like:\nref, grade, price[, sales][, YYYY-MM-DD]\n6f1c2a9e, PSA 10, 250, 4"} value={text} onChange={(e) => setText(e.target.value)} rows={8} spellCheck={false} />
        {parsed && (
          <>
            <p className={s.note}>{parsed.rows.length} ready{parsed.errors.length ? `, ${parsed.errors.length} need fixing` : ""}.</p>
            {parsed.rows.length > 0 && (
              <table className={s.tbl}>
                <thead><tr><th>Card</th><th>New</th><th>Was</th></tr></thead>
                <tbody>
                  {parsed.rows.map((r) => {
                    const c = byId.get(r.cardId)!;
                    const was = lastComp(r.cardId, r.grade)?.price ?? null;
                    const chg = was ? (r.price - was) / was : null;
                    return (
                      <tr key={r.line}>
                        <td><div className={s.cell}>{c.player} · {r.grade}</div><div className={`${s.cell} ${s.muted}`}>{c.item}</div></td>
                        <td>{usd(r.price)}{r.sampleSize > 1 ? <span className={s.muted}> n={r.sampleSize}</span> : null}</td>
                        <td className={chg !== null && Math.abs(chg) >= 0.5 ? s.warn : s.muted}>{was !== null ? `${usd(was)} (${chg! >= 0 ? "+" : ""}${Math.round(chg! * 100)}%)` : "first comp"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {parsed.errors.length > 0 && (
              <ul className={s.errs}>{parsed.errors.map((e) => <li key={e.line}>Line {e.line}: {e.reason} <span className={s.muted}>{e.text.slice(0, 60)}</span></li>)}</ul>
            )}
          </>
        )}
        <label className={s.tok}>Admin token <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ADMIN_TOKEN from Render" /></label>
        <button className={`${s.btn} ${s.primary}`} onClick={save} disabled={busy || !token || !parsed?.rows.length}>
          {busy ? "Working…" : `Save ${parsed?.rows.length ?? 0} comps`}
        </button>
        {msg && <p role="status" className={msg.ok ? s.okMsg : s.errMsg}>{msg.text}</p>}
      </div>
    </div>
  );
}
