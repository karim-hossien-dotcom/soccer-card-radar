"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Target } from "./load";
import c from "../collection/collection.module.css";

const TOKEN_KEY = "scr.adminToken";
const today = () => new Date().toISOString().slice(0, 10);
type Field = { key: keyof Target; label: string; hint?: string; type?: "number" | "text" | "date" };
const FIELDS: Field[] = [
  { key: "card", label: "Card", hint: "e.g. 2014 Panini Prizm World Cup #161 Cristiano Ronaldo Silver" },
  { key: "query", label: "eBay search", hint: "what the daily scan searches for this card" },
  { key: "mustInclude", label: "Title must contain", hint: "comma separated; a|b means either" },
  { key: "exclude", label: "Title must not contain", hint: "comma separated: parallels, graded, lots" },
  { key: "raw", label: "Raw comp ($)", type: "number" },
  { key: "psa9", label: "PSA 9 comp ($)", type: "number" },
  { key: "psa10", label: "PSA 10 comp ($)", type: "number" },
  { key: "compsAsOf", label: "Comps as of", type: "date" },
  { key: "psaCert", label: "Any PSA cert of this card", hint: "lets the weekly PSA refresh pull its population" },
  { key: "popTotal", label: "PSA pop total", type: "number" },
  { key: "pop9", label: "PSA pop 9", type: "number" },
  { key: "pop10", label: "PSA pop 10", type: "number" },
  { key: "printRun", label: "Print run (/N)", type: "number" },
  { key: "notes", label: "Notes" },
];

export default function TargetPanel({ target, prefill = null, actions, onClose }: { target: Target | null; prefill?: Partial<Target> | null; actions: { id: string; player: string }[]; onClose: () => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState<Record<string, string | boolean>>(() => {
    const t = (target ?? prefill) as Record<string, unknown> | null;
    const init: Record<string, string | boolean> = { actionId: (t?.actionId as string) || actions[0]?.id || "", ssp: !!t?.ssp, active: t ? t.active !== false : true };
    for (const f of FIELDS) {
      const x = t?.[f.key];
      init[f.key] = Array.isArray(x) ? x.join(", ") : x === null || x === undefined ? (f.key === "compsAsOf" ? today() : "") : String(x);
    }
    return init;
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const pricesChanged = !!target && (["raw", "psa9", "psa10"] as const).some((k) => String(target[k] ?? "") !== v[k]);

  const save = async () => {
    let token = "";
    try { token = localStorage.getItem(TOKEN_KEY) ?? ""; } catch { /* blocked */ }
    if (!token) { setMsg("Add your admin token in Vault, Update comps, first."); return; }
    setBusy(true); setMsg(null);
    // New prices without a new date would keep the old "as of": stamp today unless the date was edited too.
    const compsAsOf = pricesChanged && v.compsAsOf === (target?.compsAsOf ?? "") ? today() : v.compsAsOf;
    const body = { ...v, compsAsOf, id: target?.id };
    const res = await fetch("/api/snipe/targets", { method: "POST", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(`Not saved: ${j.error ?? res.status}`); return; }
    router.refresh();
    onClose();
  };

  return (
    <div className={c.backdrop} onClick={onClose}>
      <div className={`${c.drawer} ${c.wide}`} role="dialog" aria-modal aria-label={target ? "Edit target" : "Add target"} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <button className={c.close} onClick={onClose} aria-label="Close">×</button>
        <h2>{target ? "Edit target" : "Add target"}</h2>
        <label className={c.tok}>Player
          <select value={v.actionId as string} onChange={(e) => setV({ ...v, actionId: e.target.value })}>
            {actions.map((a) => <option key={a.id} value={a.id}>{a.player}</option>)}
          </select>
        </label>
        {FIELDS.map((f) => (
          <label key={f.key} className={c.tok}>
            {f.label}{f.hint && <span className={c.muted}> {f.hint}</span>}
            <input type={f.type ?? "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={v[f.key] as string} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          </label>
        ))}
        <label className={c.tok} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={v.ssp as boolean} onChange={(e) => setV({ ...v, ssp: e.target.checked })} /> SSP / case hit
        </label>
        {target && (
          <label className={c.tok} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={!(v.active as boolean)} onChange={(e) => setV({ ...v, active: !e.target.checked })} /> Retire this target
          </label>
        )}
        {pricesChanged && <p className={c.note}>New prices will be dated today unless you change the date.</p>}
        <button className={`${c.btn} ${c.primary}`} onClick={save} disabled={busy}>{busy ? "Saving…" : target ? "Save changes" : "Add target"}</button>
        {msg && <p role="status" className={c.errMsg}>{msg}</p>}
      </div>
    </div>
  );
}
