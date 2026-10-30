"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scanner as ScanicScanner } from "scanic";
import { parseReport, type ConditionReport } from "@/lib/condition-report";
import { hasTorch, torchWanted, setTorch, lightIntro, forTilt, lightField } from "@/lib/torch";
import { shape, pixels, moved, judge, signature, change, smooth, toFractions, cropBox, NEEDS_CHANGE, LIMITS, CARD_RATIO, type Quad } from "@/lib/scan-checks";
import { shrink, ReportView } from "./check-panel";
import s from "./scanner.module.css";

type Light = "lightL" | "lightT" | "lightR" | "lightB";
type Shot = "front" | Light | "back";
type Step = Shot | "checking" | "done" | "error";
const LIGHT_SIDE: Record<Light, string> = { lightL: "left", lightT: "top", lightR: "right", lightB: "bottom" };
const SHOTS: { step: Shot; tag: string; intro: string; skip?: string; grace: number }[] = [
  { step: "front", tag: "1 of 6 · Front", intro: "Put the card on a dark, plain surface inside the frame", grace: 0 },
  ...(Object.keys(LIGHT_SIDE) as Light[]).map((l, i) => ({
    step: l, tag: `${i + 2} of 6 · Light from the ${LIGHT_SIDE[l]}`, intro: lightIntro(LIGHT_SIDE[l], i === 0, false),
    skip: i === 0 ? "Skip side lights" : "Skip this light", grace: i === 0 ? -16 : -10,
  })),
  { step: "back", tag: "6 of 6 · Back", intro: "Flip the card over", skip: "Skip back", grace: -8 },
];
const isLight = (x: Step): x is Light => x in LIGHT_SIDE;
const isShot = (x: Step): x is Shot => x === "front" || x === "back" || isLight(x);
/** G9b: light steps tell you to tilt the phone when its flash is lit, else to hold a lamp (wording unchanged). */
const introOf = (x: { step: Shot; intro: string }, flash: boolean) => (isLight(x.step) ? lightIntro(LIGHT_SIDE[x.step], x.step === "lightL", flash) : x.intro);
// Vercel caps a request at 4.5 MB: front and back cropped to the card at up to 2400 px (~24 px/mm, enough to measure
// centering), each side light at 1200 px (the surface check works at 12 px/mm). ~3.8 MB for all six.
const UPLOAD_LONG_SIDE = (shot: Shot) => (isLight(shot) ? 1200 : 2400);

/** Crop to the card (keeping full resolution) when its corners are known, else shrink the whole photo.
 * Returns the JPEG and the corners as fractions of what was sent. */
async function fit(b: Blob, shot: Shot, quad?: number[][]): Promise<{ blob: Blob; quad?: number[][] }> {
  const bmp = await createImageBitmap(b).catch(() => null);
  if (!bmp) return { blob: await shrink(b), quad: undefined };
  const box = quad ? cropBox(quad, bmp.width, bmp.height) : { x: 0, y: 0, w: bmp.width, h: bmp.height, quad };
  const k = Math.min(1, UPLOAD_LONG_SIDE(shot) / Math.max(box.w, box.h));
  const c = document.createElement("canvas");
  c.width = Math.round(box.w * k); c.height = Math.round(box.h * k);
  c.getContext("2d")!.drawImage(bmp, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
  bmp.close();
  const out = await new Promise<Blob>((res) => c.toBlob((x) => res(x ?? b), "image/jpeg", 0.88));
  return { blob: out, quad: box.quad };
}
const EXTRA_STILLS = 2; // front is photographed 3 times; centering must agree within 1.5 points
const PREVIEW = 640; // long side of the frame the browser analyses; the captured photo is full resolution

/** Full-resolution still: ImageCapture.takePhoto where the browser has it (Chrome Android, Safari 18.4+), else the video frame. */
async function still(video: HTMLVideoElement, track: MediaStreamTrack | null): Promise<Blob> {
  const IC = (globalThis as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto(): Promise<Blob> } }).ImageCapture;
  if (IC && track) {
    try { return await new IC(track).takePhoto(); } catch { /* fall back to the frame */ }
  }
  const c = document.createElement("canvas");
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext("2d")!.drawImage(video, 0, 0);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Capture failed"))), "image/jpeg", 0.95));
}

/** The card's corners in the captured photo, as fractions: found again on the still (it can differ from the video
 * frame in size and crop), else the smoothed preview outline when the still has the video's shape. */
async function cornersOf(blob: Blob, sc: ScanicScanner | null, v: HTMLVideoElement, preview: { q: Quad; w: number; h: number } | null): Promise<number[][] | undefined> {
  const bmp = await createImageBitmap(blob).catch(() => null);
  if (bmp && sc) {
    const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const r = await sc.scan(c, { mode: "detect", maxProcessingDimension: 1280 }).catch(() => null);
    const aspect = bmp.width / bmp.height;
    bmp.close();
    if (r?.success && r.corners) {
      const q = r.corners as Quad, s = shape(q, c.width, c.height);
      if (s.fill > 0.08 && s.ratioErr < 0.2) return toFractions(q, c.width, c.height);
    }
    if (preview && Math.abs(aspect - v.videoWidth / v.videoHeight) < 0.02) return toFractions(preview.q, preview.w, preview.h);
    return undefined;
  }
  return preview ? toFractions(preview.q, preview.w, preview.h) : undefined;
}

/** G5: live phone scan. The camera preview finds the card, says what to fix, and auto-captures front then back. */
/** cardId: the Vault card being scanned (from its tile), so confirmed centering lines are saved against it.
 * compact: the small per-tile button. */
export default function Scan({ cardId, compact = false }: { cardId?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={compact ? s.tileScan : s.launch} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="8.5" y="7" width="7" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        {compact ? "Scan" : "Scan a card that isn't in the Vault"}
      </button>
      {open && <ScanView cardId={cardId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ScanView({ onClose, cardId }: { onClose: () => void; cardId?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanner = useRef<ScanicScanner | null>(null);
  const prev = useRef<Quad | null>(null);
  const steady = useRef(0);
  const bad = useRef(0);       // consecutive frames that failed a check (a couple are forgiven)
  const missing = useRef(0);   // consecutive frames with no card found
  const quads = useRef<Partial<Record<Shot, number[][]>>>({}); // corners in each photo, fractions
  const debug = useRef(false);
  const [dbg, setDbg] = useState("");
  const sigNow = useRef<Float32Array | null>(null);   // card brightness grid in the latest frame
  const sigShot = useRef<Float32Array | null>(null);  // ... when the last photo was taken
  const busy = useRef(false);
  const shots = useRef<Partial<Record<Shot, Blob>>>({});
  const extras = useRef<{ blob: Blob; quad?: number[][] }[]>([]); // 2 more front stills: 3-shot repeatability check
  const [step, setStep] = useState<Step>("front");
  const stepRef = useRef<Step>("front");
  const [hint, setHint] = useState("Starting the camera…");
  const [quad, setQuad] = useState<{ q: Quad; w: number; h: number; ok: boolean } | null>(null);
  const [flash, setFlash] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<ConditionReport | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  // G9b: phone flash for the side-light steps. torchOk = camera has one; torchOn = the Flash toggle.
  const [torchOk, setTorchOk] = useState(false);
  const [torchOn, setTorchOn] = useState(true);
  const lit = useRef(false);                                     // torch is lit right now
  const litShots = useRef<Partial<Record<Light, boolean>>>({});  // which light shots were taken with it
  const flashFor = useRef(false);                                // light-step wording: flash available and on
  flashFor.current = torchOk && torchOn;
  const track = () => stream.current?.getVideoTracks()[0] ?? null;

  const go = (x: Step) => { stepRef.current = x; setStep(x); };

  const submit = useCallback(async () => {
    go("checking");
    try {
      const fd = new FormData();
      // left light keeps the original field name (front_raking); the others add their side
      const lf = (l: Light) => (l === "lightL" ? "front_raking" : `front_raking_${LIGHT_SIDE[l]}`);
      const field = (k: Shot): [string, string, string] =>
        isLight(k) ? [lf(k), `front-light-${LIGHT_SIDE[k]}.jpg`, `${lf(k)}_quad`] : [k, `${k}.jpg`, `${k}_quad`];
      for (const k of SHOTS.map((x) => x.step)) {
        const b = shots.current[k];
        if (!b) continue;
        const f = await fit(b, k, quads.current[k]);
        const [name, file, qname] = field(k);
        fd.append(name, f.blob, file);
        if (f.quad) fd.append(qname, JSON.stringify(f.quad));
      }
      fd.append("holder", "0");
      const light = lightField(Object.values(litShots.current).some(Boolean));
      if (light) fd.append("light", light); // flash-lit findings stay look-only on the server
      const repeatJobs = extras.current.map(async (x) => {
        const f = await fit(x.blob, "front", x.quad), r = new FormData();
        r.append("front", f.blob, "front-repeat.jpg");
        if (f.quad) r.append("front_quad", JSON.stringify(f.quad));
        r.append("only", "centering");
        const res = await fetch("/api/condition", { method: "POST", body: r }).catch(() => null);
        const b = res?.ok ? await res.json().catch(() => null) : null;
        const c = b?.borders?.status !== "refused" ? b?.borders?.centering : null;
        return { lr: c?.lr?.worst ?? null, tb: c?.tb?.worst ?? null };
      });
      const res = await fetch("/api/condition", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error((body && typeof body.error === "string" && body.error) || `Check failed (${res.status})`);
      const rep = parseReport(body), extra = await Promise.all(repeatJobs);
      const main = rep.front?.borders?.status !== "refused" ? rep.front?.borders?.centering : undefined;
      if (extra.length) rep.repeats = { lr: [main?.lr?.worst ?? null, ...extra.map((e) => e.lr)], tb: [main?.tb?.worst ?? null, ...extra.map((e) => e.tb)] };
      setReport(rep);
      go("done");
    } catch (e) {
      setErr((e as Error).message || "Check failed"); go("error");
    }
  }, []);

  /** Move to the shot after `cur`, or check the photos when there is none. */
  const next = useCallback(async (cur: Shot) => {
    const i = SHOTS.findIndex((x) => x.step === cur);
    const nx = SHOTS[i + 1];
    if (!nx) { await submit(); return; }
    go(nx.step); setHint(introOf(nx, flashFor.current));
    steady.current = nx.grace; // time to flip the card or set up the light before the next auto-capture
  }, [submit]);

  const capture = useCallback(async () => {
    const v = video.current;
    if (!v || busy.current) return;
    busy.current = true;
    setFlash(true); setTimeout(() => setFlash(false), 180);
    try {
      const preview = prev.current && v.videoWidth ? { q: prev.current, w: Math.round(v.videoWidth * PREVIEW / Math.max(v.videoWidth, v.videoHeight)), h: Math.round(v.videoHeight * PREVIEW / Math.max(v.videoWidth, v.videoHeight)) } : null;
      const blob = await still(v, stream.current?.getVideoTracks()[0] ?? null);
      setThumbs((t) => [...t, URL.createObjectURL(blob)]);
      const cur = stepRef.current;
      if (!isShot(cur)) return;
      shots.current[cur] = blob;
      if (isLight(cur)) litShots.current[cur] = lit.current;
      quads.current[cur] = await cornersOf(blob, scanner.current, v, preview);
      if (cur === "front") {
        extras.current = [];
        for (let k = 0; k < EXTRA_STILLS; k++) {
          setHint(`Hold still: ${EXTRA_STILLS - k} more`);
          await new Promise((r) => setTimeout(r, 400));
          const b = await still(v, stream.current?.getVideoTracks()[0] ?? null).catch(() => null);
          if (b) extras.current.push({ blob: b, quad: await cornersOf(b, scanner.current, v, preview) });
        }
      }
      sigShot.current = sigNow.current;
      await next(cur);
    } catch (e) {
      setErr((e as Error).message); go("error");
    } finally {
      busy.current = false;
    }
  }, [next]);

  useEffect(() => {
    let live = true, timer = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    const tick = async () => {
      if (!live) return;
      const v = video.current;
      if (v && v.readyState >= 2 && scanner.current && !busy.current && isShot(stepRef.current)) {
        const k = PREVIEW / Math.max(v.videoWidth, v.videoHeight);
        const w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
        canvas.width = w; canvas.height = h;
        ctx.drawImage(v, 0, 0, w, h);
        const img = ctx.getImageData(0, 0, w, h);
        const r = await scanner.current.scan(img, { mode: "detect", maxProcessingDimension: PREVIEW }).catch(() => null);
        const raw = r?.success && r.corners ? (r.corners as Quad) : null;
        // Smooth the corners; if the card drops out for a frame or two, keep the last outline instead of flickering.
        missing.current = raw ? 0 : missing.current + 1;
        const q = raw ? smooth(prev.current, raw) : missing.current <= LIMITS.forgive ? prev.current : null;
        const gray = new Uint8ClampedArray(w * h);
        if (q) for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (img.data[j] * 77 + img.data[j + 1] * 150 + img.data[j + 2] * 29) >> 8;
        const px = q ? pixels(gray, w, h, q) : null;
        if (px && isLight(stepRef.current)) px.glare = 0; // side light is meant to make highlights
        const sh0 = q ? shape(q, w, h) : null;
        const sh = sh0 && isLight(stepRef.current) && lit.current ? forTilt(sh0) : sh0; // the flash shot is taken tilted
        let verdict = q ? judge(q, sh, px) : judge(null, null, null);
        sigNow.current = q ? signature(gray, w, h, q) : null;
        // Don't re-shoot the same scene: the side-light shot needs the light changed, the back shot needs the card flipped.
        const cur = stepRef.current;
        if (verdict.ok && cur !== "front" && sigNow.current && sigShot.current && change(sigNow.current, sigShot.current) < NEEDS_CHANGE[isLight(cur) ? "light" : "back"])
          verdict = { ok: false, hint: isLight(cur) ? `${lit.current ? "Tilt the phone over" : "Move the light to"} the card's ${LIGHT_SIDE[cur]} ${lit.current ? "edge" : "side"}: it should look different from the last photo` : "Flip the card over" };
        const mv = q && prev.current ? moved(prev.current, q, w, h) : 0;
        const still = !!q && mv < LIMITS.steadyMove;
        prev.current = q;
        if (!live) return;
        setQuad(q ? { q, w, h, ok: verdict.ok } : null);
        if (steady.current < 0) steady.current++; // grace period after a shot, while the card is flipped or lit
        else if (verdict.ok && still) { steady.current++; bad.current = 0; setHint(verdict.hint); }
        else if (++bad.current > LIMITS.forgive) { steady.current = 0; setHint(verdict.ok ? "Hold still…" : verdict.hint); }
        if (debug.current) {
          const f = (x: number | undefined, d = 2) => (x === undefined ? "–" : x.toFixed(d));
          setDbg(q && sh ? `fill ${f(sh.fill)} ratio±${f(sh.ratioErr)} angle ${f(sh.angleDev, 1)}° skew ${f(sh.skew)} in:${sh.inside ? "y" : "n"} sharp ${f(px?.sharp, 0)} glare ${f(px?.glare)} move ${f(mv, 3)} steady ${steady.current}/${LIMITS.steadyFrames} bad ${bad.current} video ${v.videoWidth}x${v.videoHeight}` : `no card · video ${v.videoWidth}x${v.videoHeight}`);
        }
        if (steady.current >= LIMITS.steadyFrames) { steady.current = 0; await capture(); }
      }
      timer = window.setTimeout(tick, 120);
    };

    debug.current = new URLSearchParams(window.location.search).has("debug");
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't open the camera. Use Safari or Chrome on your phone.");
        const ms = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (!live) { ms.getTracks().forEach((t) => t.stop()); return; }
        stream.current = ms;
        setTorchOk(hasTorch(ms.getVideoTracks()[0]));
        if (video.current) { video.current.srcObject = ms; await video.current.play().catch(() => {}); }
        const { Scanner } = await import("scanic");
        const sc = new Scanner();
        await sc.initialize();
        scanner.current = sc;
        setHint(SHOTS[0].intro);
        tick();
      } catch (e) {
        const m = (e as Error).name === "NotAllowedError" ? "Camera access was blocked. Allow it in the browser settings and try again." : (e as Error).message;
        setErr(m); go("error");
      }
    })();

    return () => {
      live = false; window.clearTimeout(timer);
      void setTorch(stream.current?.getVideoTracks()[0], false);
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [capture]);

  const thumbsRef = useRef<string[]>([]);
  thumbsRef.current = thumbs;
  useEffect(() => () => thumbsRef.current.forEach((u) => URL.revokeObjectURL(u)), []); // free photos when the scanner closes

  // Flash on during the light steps (if the camera has one and the toggle is on), off for front, back and results.
  useEffect(() => {
    const want = torchWanted(isLight(step), torchOk, torchOn);
    if (!torchOk) { lit.current = false; return; }
    let cur = true;
    setTorch(track(), want).then((ok) => { if (cur) lit.current = want && ok; });
    return () => { cur = false; };
  }, [step, torchOk, torchOn]);
  const toggleTorch = () => {
    const on = !torchOn;
    setTorchOn(on);
    const sh = SHOTS.find((x) => x.step === stepRef.current);
    if (sh) setHint(introOf(sh, on && torchOk));
  };

  const close = () => { void setTorch(track(), false); stream.current?.getTracks().forEach((t) => t.stop()); onClose(); };
  const restart = () => { thumbs.forEach((u) => URL.revokeObjectURL(u)); sigShot.current = null; shots.current = {}; litShots.current = {}; quads.current = {}; setThumbs([]); setReport(null); setErr(null); steady.current = 0; go("front"); setHint(SHOTS[0].intro); };
  const shooting = isShot(step);
  const shot = SHOTS.find((x) => x.step === step);

  return (
    <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Scan a card">
      <div className={s.stage} data-hidden={!shooting}>
        <video ref={video} className={s.video} playsInline muted autoPlay />
        {quad ? (
          <svg className={s.overlay} viewBox={`0 0 ${quad.w} ${quad.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <polygon points={[quad.q.topLeft, quad.q.topRight, quad.q.bottomRight, quad.q.bottomLeft].map((p) => `${p.x},${p.y}`).join(" ")} data-ok={quad.ok} />
          </svg>
        ) : (
          <div className={s.guide} style={{ aspectRatio: `${CARD_RATIO}` }} aria-hidden="true" />
        )}
        {flash && <div className={s.flash} />}
        <div className={s.top}>
          <span className={s.stepTag}>{shot?.tag}</span>
          {torchOk && isLight(step) && (
            <button type="button" className={s.ghost} onClick={toggleTorch} aria-pressed={torchOn}>Flash {torchOn ? "on" : "off"}</button>
          )}
          <button type="button" className={s.x} onClick={close} aria-label="Close the scanner">✕</button>
        </div>
        <div className={s.bottom}>
          <p className={s.hint} data-ok={quad?.ok ?? false} aria-live="polite">{hint}</p>
          {dbg && <p className={s.debug}>{dbg}</p>}
          <div className={s.controls}>
            {shot?.skip ? <button type="button" className={s.ghost} onClick={() => next(shot.step === "lightL" ? "lightB" : shot.step)}>{shot.skip}</button> : <span />}
            <button type="button" className={s.shutter} onClick={capture} aria-label="Take the photo now" />
            <span className={s.thumbs}>{thumbs.map((u) => <img key={u} src={u} alt="" />)}</span>
          </div>
        </div>
      </div>

      {!shooting && (
        <div className={s.result}>
          <div className={s.resultHead}>
            <b>{step === "checking" ? "Checking the photos…" : step === "error" ? "Couldn't check that" : "Scan result"}</b>
            <button type="button" className={s.x} onClick={close} aria-label="Close the scanner">✕</button>
          </div>
          {thumbs.length > 0 && <div className={s.shots}>{thumbs.map((u, i) => <img key={u} src={u} alt={`Photo ${i + 1}`} />)}</div>}
          {step === "checking" && <p className={s.wait}>Measuring centering, edges and corners. This takes a few seconds.</p>}
          {step === "error" && <p className={s.err} role="alert">{err}</p>}
          {report && <ReportView report={report} cardId={cardId} />}
          {step !== "checking" && <button type="button" className={s.again} onClick={restart}>Scan another card</button>}
        </div>
      )}
    </div>
  );
}
