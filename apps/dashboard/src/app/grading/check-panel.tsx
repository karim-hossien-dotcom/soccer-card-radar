"use client";

import { useState } from "react";
import { parseReport, ceilingLine, centeringRows, wearFindings, surfaceLines, checkFile, downscaleSize, type ConditionReport } from "@/lib/condition-report";
import s from "./check-panel.module.css";
import BorderConfirm from "./border-confirm";

/** Vercel caps a request at 4.5 MB: re-encode big photos as JPEG with the long side at 3000 px (still ~30 px/mm on a card). */
export async function shrink(f: Blob): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return f;
  const bmp = await createImageBitmap(f).catch(() => null);
  if (!bmp) return f;
  const size = downscaleSize(bmp.width, bmp.height, f.size);
  if (!size) { bmp.close(); return f; }
  const cv = document.createElement("canvas");
  cv.width = size.w; cv.height = size.h;
  cv.getContext("2d")?.drawImage(bmp, 0, 0, size.w, size.h);
  bmp.close();
  return new Promise((res) => cv.toBlob((b) => res(b ?? f), "image/jpeg", 0.92));
}

/** G2: run the photo condition check (tools/grade-screen/condition.py) from the Grading tab. */
export default function CheckPanel({ initialReport = null }: { initialReport?: ConditionReport | null }) {
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [raking, setRaking] = useState<File | null>(null);
  const [holder, setHolder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<ConditionReport | null>(initialReport);

  const pick = (label: "Front" | "Back", set: (f: File | null) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    const bad = f ? checkFile(f, label) : null;
    if (bad) { e.target.value = ""; set(null); setErr(bad); return; }
    setErr(null); set(f);
  };

  const run = async () => {
    if (!front) { setErr("Add a front photo"); return; }
    setBusy(true); setErr(null); setReport(null);
    try {
      const fd = new FormData();
      fd.append("front", await shrink(front), front.name);
      if (back) fd.append("back", await shrink(back), back.name);
      if (raking) fd.append("front_raking", await shrink(raking), raking.name);
      fd.append("holder", holder ? "1" : "0");
      const res = await fetch("/api/condition", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error((body && typeof body.error === "string" && body.error) || (res.status === 413 ? "Photos too large for upload" : `Check failed (${res.status})`));
      setReport(parseReport(body));
    } catch (e) {
      setErr((e as Error).message || "Check failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.panel}>
      <p className={s.disclaimer}>
        A reject filter, not a grade promise: it can only rule grades out. It never says a card will get a 10. Thresholds are provisional until the PSA order 26913695 grades come back.
      </p>
      <p className={s.tip}>Best photo: card out of its sleeve, flat on a dark plain backdrop, shot straight from above, filling most of the frame, no glare.</p>

      <div className={s.form}>
        <label className={s.field}>
          <span>Front photo <em>(required)</em></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick("Front", setFront)} disabled={busy} />
        </label>
        <label className={s.field}>
          <span>Back photo <em>(optional)</em></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick("Back", setBack)} disabled={busy} />
        </label>
        <label className={s.field}>
          <span>Front, side light <em>(optional: lamp low at the side, for dents and creases)</em></span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick("Front", setRaking)} disabled={busy} />
        </label>
        <label className={s.check}>
          <input type="checkbox" checked={holder} onChange={(e) => setHolder(e.target.checked)} disabled={busy} />
          <span>Card is in a sleeve, toploader or slab</span>
        </label>
        <div>
          <button type="button" className={s.run} onClick={run} disabled={busy || !front}>{busy ? "Checking…" : "Run check"}</button>
          <span className={s.hint}>jpg, png or webp, up to 8 MB each</span>
        </div>
      </div>

      <div aria-live="polite">
        {busy && <p className={s.status}>Checking the photo… this takes a few seconds.</p>}
        {err && <p className={s.error} role="alert">{err}</p>}
      </div>

      {report && <ReportView report={report} />}
    </div>
  );
}

/** The condition report: grade ceiling first, then centering, wear, look flags and what a photo can't show. */
export function ReportView({ report, cardId }: { report: ConditionReport; cardId?: string }) {
  const ceil = ceilingLine(report);
  return (
        <div className={s.report}>
          <h3 className={s.h}>Grade ceiling</h3>
          <p className={s.ceiling} data-capped={ceil.capped}>{ceil.headline}</p>
          {ceil.reasons.length > 0 && <ul className={s.list}>{ceil.reasons.map((w) => <li key={w}>{w}</li>)}</ul>}

          <h3 className={s.h}>Centering</h3>
          <p className={s.muted}>Measured from the printed border lines, at the worst point along each side.</p>
          <table className={s.table}>
            <thead><tr><th scope="col">Side</th><th scope="col">Split</th><th scope="col">PSA</th><th scope="col">BGS</th></tr></thead>
            <tbody>
              {centeringRows(report).map((r) => (
                <tr key={r.side}><th scope="row">{r.side}</th><td>{r.split}</td><td>{r.psa}</td><td>{r.bgs}</td></tr>
              ))}
            </tbody>
          </table>
          {(["front", "back"] as const).map((sd) => {
            const b = report[sd]?.borders;
            return b ? <BorderConfirm key={sd} side={sd} borders={b} cardId={cardId} repeats={sd === "front" ? report.repeats : undefined} /> : null;
          })}

          <h3 className={s.h}>Edges and corners</h3>
          {wearFindings(report).map((w) => (
            <div key={w.side}>
              <p className={s.sub}>{w.side}</p>
              <ul className={s.list}>{w.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          ))}
          {!report.front && !report.back && <p className={s.muted}>No usable photo.</p>}

          {report.surface.length > 0 && (
            <>
              <h3 className={s.h}>Surface (side light)</h3>
              <p className={s.muted}>Dents, creases and scratches from the side-light photos (a fold running the same way as the light barely shows, so each direction catches different things). Not yet counted in the grade ceiling: check each by eye.</p>
              {report.surface.map((sc) => (
                <div key={sc.side} className={s.surface}>
                  {sc.overlay && <img src={sc.overlay} alt={`${sc.side} under side light, findings circled`} />}
                  <div>
                    <p className={s.sub}>{sc.side}{sc.lights?.length ? ` · light from ${sc.lights.join(", ")}` : ""}{sc.ai ? "" : " (Claude second look off)"}</p>
                    {sc.status !== "measured" ? <p className={s.muted}>Not judged: {sc.why}</p>
                      : sc.findings.length === 0 ? <p className={s.muted}>Nothing found.</p>
                      : <ul className={s.list}>{surfaceLines(sc).map((l) => <li key={l.text} data-source={l.source}>{l.n !== null && <b className={s.num}>{l.n}</b>}{l.text}</li>)}</ul>}
                    {sc.status === "measured" && sc.why && <p className={s.muted}>{sc.why}</p>}
                  </div>
                </div>
              ))}
            </>
          )}

          <h3 className={s.h}>Look flags</h3>
          {report.ceiling.look.length
            ? <><p className={s.muted}>Measured, not yet allowed to lower the ceiling: check these by eye.</p><ul className={s.list}>{report.ceiling.look.map((l) => <li key={l}>{l}</li>)}</ul></>
            : <p className={s.muted}>None.</p>}

          <h3 className={s.h}>Can&apos;t judge from a photo</h3>
          <ul className={s.list}>
            {report.cant_judge.map((c) => <li key={c.point}><b>{c.point}</b> <span className={s.muted}>({c.graders})</span>: {c.why}</li>)}
          </ul>
          <p className={s.muted}>{report.note}</p>
        </div>
  );
}
