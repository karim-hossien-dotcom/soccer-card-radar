"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Scanner as ScanicScanner } from "scanic";
import { parseReport, type ConditionReport } from "@/lib/condition-report";
import { shape, pixels, moved, judge, signature, change, NEEDS_CHANGE, LIMITS, CARD_RATIO, type Quad } from "@/lib/scan-checks";
import { shrink, ReportView } from "./check-panel";
import s from "./scanner.module.css";

type Shot = "front" | "light" | "back";
type Step = Shot | "checking" | "done" | "error";
const SHOTS: { step: Shot; tag: string; intro: string; skip?: string; grace: number }[] = [
  { step: "front", tag: "1 of 3 · Front", intro: "Put the card on a dark, plain surface inside the frame", grace: 0 },
  { step: "light", tag: "2 of 3 · Side light", intro: "Now light it from the side: hold a lamp or a second phone's flashlight low, beside the card, so the light skims across it", skip: "Skip side light", grace: -16 },
  { step: "back", tag: "3 of 3 · Back", intro: "Flip the card over", skip: "Skip back", grace: -8 },
];
const isShot = (x: Step): x is Shot => x === "front" || x === "light" || x === "back";
const UPLOAD_LONG_SIDE = 2400; // three photos must fit Vercel's 4.5 MB request limit; still ~25 px/mm on a card filling the frame

/** Re-encode to a fixed long side so front, side-light and back always fit one request. */
async function fit(b: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(b).catch(() => null);
  if (!bmp) return shrink(b);
  const k = Math.min(1, UPLOAD_LONG_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return new Promise((res) => c.toBlob((x) => res(x ?? b), "image/jpeg", 0.9));
}
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

/** G5: live phone scan. The camera preview finds the card, says what to fix, and auto-captures front then back. */
export default function Scan() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={s.launch} onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><rect x="8.5" y="7" width="7" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
        Scan a card with your camera
      </button>
      {open && <ScanView onClose={() => setOpen(false)} />}
    </>
  );
}

function ScanView({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const scanner = useRef<ScanicScanner | null>(null);
  const prev = useRef<Quad | null>(null);
  const steady = useRef(0);
  const sigNow = useRef<Float32Array | null>(null);   // card brightness grid in the latest frame
  const sigShot = useRef<Float32Array | null>(null);  // ... when the last photo was taken
  const busy = useRef(false);
  const shots = useRef<Partial<Record<Shot, Blob>>>({});
  const [step, setStep] = useState<Step>("front");
  const stepRef = useRef<Step>("front");
  const [hint, setHint] = useState("Starting the camera…");
  const [quad, setQuad] = useState<{ q: Quad; w: number; h: number; ok: boolean } | null>(null);
  const [flash, setFlash] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<ConditionReport | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);

  const go = (x: Step) => { stepRef.current = x; setStep(x); };

  const submit = useCallback(async () => {
    go("checking");
    try {
      const fd = new FormData();
      fd.append("front", await fit(shots.current.front!), "front.jpg");
      if (shots.current.light) fd.append("front_raking", await fit(shots.current.light), "front-side-light.jpg");
      if (shots.current.back) fd.append("back", await fit(shots.current.back), "back.jpg");
      fd.append("holder", "0");
      const res = await fetch("/api/condition", { method: "POST", body: fd });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error((body && typeof body.error === "string" && body.error) || `Check failed (${res.status})`);
      setReport(parseReport(body));
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
    go(nx.step); setHint(nx.intro);
    steady.current = nx.grace; // time to flip the card or set up the light before the next auto-capture
  }, [submit]);

  const capture = useCallback(async () => {
    const v = video.current;
    if (!v || busy.current) return;
    busy.current = true;
    setFlash(true); setTimeout(() => setFlash(false), 180);
    try {
      const blob = await still(v, stream.current?.getVideoTracks()[0] ?? null);
      setThumbs((t) => [...t, URL.createObjectURL(blob)]);
      const cur = stepRef.current;
      if (!isShot(cur)) return;
      shots.current[cur] = blob;
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
        const q = r?.success && r.corners ? (r.corners as Quad) : null;
        const gray = new Uint8ClampedArray(w * h);
        if (q) for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (img.data[j] * 77 + img.data[j + 1] * 150 + img.data[j + 2] * 29) >> 8;
        const px = q ? pixels(gray, w, h, q) : null;
        if (px && stepRef.current === "light") px.glare = 0; // side light is meant to make highlights
        let verdict = q ? judge(q, shape(q, w, h), px) : judge(null, null, null);
        sigNow.current = q ? signature(gray, w, h, q) : null;
        // Don't re-shoot the same scene: the side-light shot needs the light changed, the back shot needs the card flipped.
        const cur = stepRef.current;
        if (verdict.ok && (cur === "light" || cur === "back") && sigNow.current && sigShot.current && change(sigNow.current, sigShot.current) < NEEDS_CHANGE[cur])
          verdict = { ok: false, hint: cur === "light" ? "Turn the side light on: it should look different from the first photo" : "Flip the card over" };
        const still = !!q && (!prev.current || moved(prev.current, q, w, h) < LIMITS.steadyMove);
        prev.current = q;
        if (!live) return;
        setQuad(q ? { q, w, h, ok: verdict.ok } : null);
        if (steady.current < 0) steady.current++; // grace period after a shot, while the card is flipped or lit
        else { steady.current = verdict.ok && still ? steady.current + 1 : 0; setHint(verdict.hint); }
        if (steady.current >= LIMITS.steadyFrames) { steady.current = 0; await capture(); }
      }
      timer = window.setTimeout(tick, 120);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser can't open the camera. Use Safari or Chrome on your phone.");
        const ms = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 } },
        });
        if (!live) { ms.getTracks().forEach((t) => t.stop()); return; }
        stream.current = ms;
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
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, [capture]);

  const thumbsRef = useRef<string[]>([]);
  thumbsRef.current = thumbs;
  useEffect(() => () => thumbsRef.current.forEach((u) => URL.revokeObjectURL(u)), []); // free photos when the scanner closes

  const close = () => { stream.current?.getTracks().forEach((t) => t.stop()); onClose(); };
  const restart = () => { thumbs.forEach((u) => URL.revokeObjectURL(u)); sigShot.current = null; shots.current = {}; setThumbs([]); setReport(null); setErr(null); steady.current = 0; go("front"); setHint(SHOTS[0].intro); };
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
          <button type="button" className={s.x} onClick={close} aria-label="Close the scanner">✕</button>
        </div>
        <div className={s.bottom}>
          <p className={s.hint} data-ok={quad?.ok ?? false} aria-live="polite">{hint}</p>
          <div className={s.controls}>
            {shot?.skip ? <button type="button" className={s.ghost} onClick={() => next(shot.step)}>{shot.skip}</button> : <span />}
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
          {report && <ReportView report={report} />}
          {step !== "checking" && <button type="button" className={s.again} onClick={restart}>Scan another card</button>}
        </div>
      )}
    </div>
  );
}
