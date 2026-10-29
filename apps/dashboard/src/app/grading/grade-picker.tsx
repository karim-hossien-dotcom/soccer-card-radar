"use client";

import { useMemo, useState } from "react";
import type { GradePick } from "./load";
import { parseReport, ceilingLine, centeringRows, wearFindings } from "@/lib/condition-report";
import s from "./grade-picker.module.css";

type Result = { status: "running" } | { status: "done"; verdict: string; summary: string; detail: Detail | null } | { status: "error"; message: string };
type Detail = { headline: string; reasons: string[]; centering: { side: string; split: string; psa: string; bgs: string }[]; wear: string[] };

const usd = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `$${n >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(n % 1 ? 2 : 0)}`);

/** Runs one photo through POST /api/condition by URL (photo screen first, then the measurement). */
async function gradeOne(p: GradePick): Promise<Result> {
  const res = await fetch("/api/condition", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageUrl: p.imageUrl }) });
  const body = await res.json().catch(() => null);
  if (!res.ok) return { status: "error", message: (body && typeof body.error === "string" && body.error) || `Check failed (${res.status})` };
  const verdict = String(body?.verdict ?? "cant_judge"), summary = String(body?.summary ?? "");
  if (!body?.measured) return { status: "done", verdict, summary, detail: null };
  try {
    const r = parseReport(body);
    const c = ceilingLine(r);
    return { status: "done", verdict, summary, detail: { headline: c.headline, reasons: c.reasons, centering: centeringRows(r), wear: wearFindings(r).flatMap((w) => w.lines.map((l) => `${w.side}: ${l}`)) } };
  } catch {
    return { status: "done", verdict, summary, detail: null };
  }
}

/** G4: pick Vault raw cards or live Snipe listings, press Grade, read the verdict on each tile. */
export default function GradePicker({ vault, listings }: { vault: GradePick[]; listings: GradePick[] }) {
  const [tab, setTab] = useState<"vault" | "listing">(vault.length ? "vault" : "listing");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, Result>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = tab === "vault" ? vault : listings;
  const all = useMemo(() => [...vault, ...listings], [vault, listings]);
  const chosen = all.filter((p) => picked.has(p.key));

  const toggle = (k: string) => setPicked((x) => { const n = new Set(x); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const grade = async () => {
    setBusy(true);
    for (const p of chosen) {
      setResults((r) => ({ ...r, [p.key]: { status: "running" } }));
      const out = await gradeOne(p).catch((e) => ({ status: "error", message: (e as Error).message || "Check failed" }) as Result);
      setResults((r) => ({ ...r, [p.key]: out }));
    }
    setPicked(new Set());
    setBusy(false);
  };

  return (
    <div className={s.wrap}>
      <div className={s.bar}>
        <div className={s.tabs} role="tablist" aria-label="What to grade">
          <button role="tab" aria-selected={tab === "vault"} onClick={() => setTab("vault")}>My raw cards <span>{vault.length}</span></button>
          <button role="tab" aria-selected={tab === "listing"} onClick={() => setTab("listing")}>Snipe listings <span>{listings.length}</span></button>
        </div>
        <div className={s.actions}>
          {picked.size > 0 && <button className={s.clear} onClick={() => setPicked(new Set())} disabled={busy}>Clear</button>}
          <button className={s.go} onClick={grade} disabled={busy || picked.size === 0}>
            {busy ? "Grading…" : picked.size ? `Grade ${picked.size} selected` : "Select cards to grade"}
          </button>
        </div>
      </div>

      {list.length === 0 && <p className={s.empty}>{tab === "vault" ? "No raw cards with a photo in the Vault." : "No live listings with a photo for your raw targets right now."}</p>}

      <div className={s.grid}>
        {list.map((p) => {
          const r = results[p.key];
          const on = picked.has(p.key);
          const verdict = r?.status === "done" ? r.verdict : p.prior?.verdict ?? null;
          const summary = r?.status === "done" ? r.summary : p.prior?.summary ?? null;
          return (
            <article key={p.key} className={s.tile} data-picked={on}>
              <button className={s.pick} onClick={() => toggle(p.key)} aria-pressed={on} disabled={busy} aria-label={`${on ? "Unselect" : "Select"} ${p.player}, ${p.title}`}>
                <span className={s.shot}><img src={p.imageUrl} alt="" loading="lazy" /></span>
                <span className={s.box} aria-hidden="true">{on ? "✓" : ""}</span>
              </button>
              <div className={s.meta}>
                <b className={s.player}>{p.player}</b>
                <span className={s.title}>{p.title}</span>
                <span className={s.nums}>
                  {p.kind === "vault" ? <>Value {usd(p.value)}{p.cost !== null && <> · cost {usd(p.cost)}</>}</> : <>{usd(p.price)} · max bid {usd(p.maxBid)}</>}
                </span>
                {p.hint && p.kind === "vault" && <span className={s.hint}>{p.hint}</span>}
                {r?.status === "running" && <span className={s.verdict} data-verdict="running">Checking the photo…</span>}
                {r?.status === "error" && <span className={s.verdict} data-verdict="error">{r.message}</span>}
                {summary && r?.status !== "running" && (
                  <button className={s.verdict} data-verdict={verdict ?? ""} onClick={() => r?.status === "done" && r.detail && setOpen(open === p.key ? null : p.key)}>
                    {summary}{r?.status === "done" && r.detail ? (open === p.key ? " ▴" : " ▾") : ""}
                  </button>
                )}
                {open === p.key && r?.status === "done" && r.detail && (
                  <div className={s.detail}>
                    <b>{r.detail.headline}</b>
                    {r.detail.centering.filter((c) => c.split !== "—").map((c) => <span key={c.side}>{c.side} centering {c.split}: {c.psa}</span>)}
                    {r.detail.wear.slice(0, 6).map((w) => <span key={w}>{w}</span>)}
                  </div>
                )}
                {p.url && <a className={s.link} href={p.url} target="_blank" rel="noopener noreferrer">Open on eBay</a>}
              </div>
            </article>
          );
        })}
      </div>
      <p className={s.foot}>A reject filter, not a grade promise: it can only rule grades out. Each photo is checked first (one raw card, flat, straight-on, all edges visible); photos in toploaders or at an angle get “can&apos;t judge”.</p>
    </div>
  );
}
