"use client";
import { useState } from "react";
import m from "./masthead.module.css";

export default function ScanBtn() {
  const [s, setS] = useState<"idle" | "go" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function scan() {
    setS("go"); setMsg("");
    try {
      const r = await fetch("/api/quick-scan");
      const d = (await r.json()) as { imported?: number; updated?: number };
      setS("done");
      setMsg(`${d.imported ?? 0} new, ${d.updated ?? 0} updated`);
      setTimeout(() => { setS("idle"); setMsg(""); }, 4000);
    } catch {
      setS("err"); setMsg("Scan failed. Try again.");
      setTimeout(() => { setS("idle"); setMsg(""); }, 3000);
    }
  }

  return (
    <div className={m.scanWrap}>
      {msg && <span role="status">{msg}</span>}
      <button className={m.scan} onClick={scan} disabled={s === "go"}>
        {s === "go" ? "Scanning…" : "Scan eBay"}
      </button>
    </div>
  );
}
