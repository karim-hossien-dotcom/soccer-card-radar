"use client";
/** G7: check the 8 centering lines on the straightened card, nudge any that are off, confirm, save. */
import { useMemo, useRef, useState } from "react";
import { SIDES, NUDGE_MM, initialLines, splits, nudge, linePx, fmtSplit, centeringGrade, type Borders, type Lines, type SideName } from "@/lib/borders";
import s from "./border-confirm.module.css";

type Sel = { side: SideName; kind: "outer" | "inner" };
const label = (x: Sel) => `${x.side[0].toUpperCase()}${x.side.slice(1)} ${x.kind === "outer" ? "cut edge" : "border"}`;
const LOUPE_MM = 5;

async function sha256(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function BorderConfirm({ side, borders, cardId }: { side: "front" | "back"; borders: Borders; cardId?: string }) {
  const measured = useMemo(() => initialLines(borders), [borders]);
  const [lines, setLines] = useState<Lines>(measured);
  const [sel, setSel] = useState<Sel>({ side: "left", kind: "inner" });
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | string>("idle");
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; start: Lines } | null>(null);

  if (borders.status === "refused" || !borders.image || !borders.straight) {
    return (
      <div className={s.box}>
        <p className={s.title}>{side === "front" ? "Front" : "Back"} centering: can&apos;t measure</p>
        <ul className={s.why}>{borders.why.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>
    );
  }
  const R = borders.straight.px_per_mm, M = borders.straight.margin_px;
  const W = Math.round(63.5 * R + 2 * M), H = Math.round(88.9 * R + 2 * M);
  const sp = splits(lines), sp0 = splits(measured);
  const back = side === "back";
  const changed = JSON.stringify(lines) !== JSON.stringify(measured);
  const allLines: Sel[] = SIDES.flatMap((sd) => [{ side: sd, kind: "outer" as const }, { side: sd, kind: "inner" as const }]);

  // + nudge = toward the card's centre; on screen that is down for top, left for right, etc.
  const move = (by: number, end?: 0 | 1) => { setLines((L) => nudge(L, sel.side, sel.kind, by, end)); setSaved("idle"); };

  const toImg = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const nearest = (p: { x: number; y: number }): Sel | null => {
    let best: Sel | null = null, bd = 3 * R; // within 3 mm
    for (const l of allLines) {
      const [x1, y1, x2, y2] = linePx(lines, l.side, l.kind, R, M);
      const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy)));
      const d = Math.hypot(p.x - x1 - t * dx, p.y - y1 - t * dy);
      if (d < bd) { bd = d; best = l; }
    }
    return best;
  };
  const onDown = (e: React.PointerEvent) => {
    const p = toImg(e), n = nearest(p);
    if (!n) return;
    setSel(n);
    drag.current = { ...p, start: lines };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const p = toImg(e), d = drag.current;
    const sign = { top: [0, 1], bottom: [0, -1], left: [1, 0], right: [-1, 0] }[sel.side];
    const mm = ((p.x - d.x) * sign[0] + (p.y - d.y) * sign[1]) / R;
    setLines(nudge(d.start, sel.side, sel.kind, Math.round(mm / NUDGE_MM) * NUDGE_MM));
    setSaved("idle");
  };
  const onUp = () => { drag.current = null; };

  const [x1, y1, x2, y2] = linePx(lines, sel.side, sel.kind, R, M);
  const lv = { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, r: (LOUPE_MM * R) / 2 };
  const drawn = (vb: string, cls: string, events = false) => (
    <svg ref={events ? svg : undefined} className={cls} viewBox={vb} preserveAspectRatio="xMidYMid slice"
      onPointerDown={events ? onDown : undefined} onPointerMove={events ? onMove : undefined} onPointerUp={events ? onUp : undefined} onPointerCancel={events ? onUp : undefined}>
      <image href={borders.image!} x={0} y={0} width={W} height={H} />
      {allLines.map((l) => {
        const [a, b, c, d] = linePx(lines, l.side, l.kind, R, M);
        const on = l.side === sel.side && l.kind === sel.kind;
        return <line key={l.side + l.kind} x1={a} y1={b} x2={c} y2={d} data-kind={l.kind} data-on={on} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );

  const row = (name: string, x: { mid: number; worst: number }, x0: { worst: number }) => {
    const g = centeringGrade(x.worst, back);
    return (
      <tr key={name}>
        <th scope="row">{name}</th>
        <td>{fmtSplit(x.mid)}</td>
        <td><b>{fmtSplit(x.worst)}</b>{Math.abs(x.worst - x0.worst) >= 0.005 && <span className={s.was}> was {fmtSplit(x0.worst)}</span>}</td>
        <td>PSA {g.psa} · BGS {g.bgs}</td>
      </tr>
    );
  };

  const save = async () => {
    setSaved("saving");
    try {
      const res = await fetch("/api/centering", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId, side, imageHash: await sha256(borders.image!), pxPerMm: borders.px_per_mm, measured, confirmed: lines }),
      });
      const body = await res.json().catch(() => null);
      setSaved(res.ok ? "saved" : (body?.error ?? `Save failed (${res.status})`));
    } catch (e) { setSaved((e as Error).message); }
  };

  return (
    <div className={s.box}>
      <p className={s.title}>{side === "front" ? "Front" : "Back"} centering: check the lines</p>
      {borders.status === "needs_manual" && <ul className={s.why}>{borders.why.map((w) => <li key={w}>{w}</li>)}</ul>}
      <p className={s.help}>Blue dashed = cut edge, amber = printed border. Drag a line, or pick one and nudge it {NUDGE_MM} mm at a time. The magnifier shows the selected line.</p>
      <div className={s.grid}>
        <div className={s.stage}>{drawn(`0 0 ${W} ${H}`, s.card, true)}</div>
        <div className={s.side}>
          <div className={s.loupe} aria-label={`Magnified: ${label(sel)}`}>{drawn(`${lv.cx - lv.r} ${lv.cy - lv.r} ${2 * lv.r} ${2 * lv.r}`, s.zoom)}</div>
          <p className={s.sel}>{label(sel)}{sel.kind === "inner" && <> · {(((lines.inner[sel.side][0] + lines.inner[sel.side][1]) / 2) - lines.outer[sel.side]).toFixed(2)} mm</>}</p>
          <div className={s.pick}>
            {allLines.map((l) => (
              <button key={l.side + l.kind} type="button" data-kind={l.kind} data-on={l.side === sel.side && l.kind === sel.kind} onClick={() => setSel(l)}>
                {l.side[0].toUpperCase()}{l.kind === "outer" ? " edge" : ""}
              </button>
            ))}
          </div>
          <div className={s.nudge}>
            <button type="button" onClick={() => move(-NUDGE_MM)} aria-label="Move toward the cut edge">← out</button>
            <button type="button" onClick={() => move(NUDGE_MM)} aria-label="Move toward the centre">in →</button>
          </div>
          {sel.kind === "inner" && (
            <div className={s.nudge}>
              <span>Tilt</span>
              <button type="button" onClick={() => move(-NUDGE_MM, 0)}>{sel.side === "left" || sel.side === "right" ? "top" : "left"} out</button>
              <button type="button" onClick={() => move(NUDGE_MM, 0)}>{sel.side === "left" || sel.side === "right" ? "top" : "left"} in</button>
            </div>
          )}
        </div>
      </div>
      <table className={s.table}>
        <thead><tr><th scope="col" /><th scope="col">Mid</th><th scope="col">Worst point</th><th scope="col">Allows</th></tr></thead>
        <tbody>{row("L/R", sp.lr, sp0.lr)}{row("T/B", sp.tb, sp0.tb)}</tbody>
      </table>
      <div className={s.actions}>
        <button type="button" className={s.primary} onClick={save} disabled={saved === "saving" || saved === "saved"}>
          {saved === "saved" ? "Saved" : saved === "saving" ? "Saving…" : changed ? "Save adjusted lines" : "Lines look right: save"}
        </button>
        {changed && <button type="button" className={s.ghost} onClick={() => { setLines(measured); setSaved("idle"); }}>Reset</button>}
        {saved !== "idle" && saved !== "saving" && saved !== "saved" && <span className={s.err}>{saved}</span>}
      </div>
    </div>
  );
}
