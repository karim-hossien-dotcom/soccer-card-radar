"use client";
import { useState } from "react";

export default function ScanBtn() {
  const [s, setS] = useState<"idle" | "go" | "done" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function scan() {
    setS("go"); setMsg("");
    try {
      const r = await fetch("/api/quick-scan");
      const d = await r.json();
      setS("done");
      setMsg(`${d.imported ?? 0} new · ${d.updated ?? 0} updated`);
      setTimeout(() => { setS("idle"); setMsg(""); }, 4000);
    } catch {
      setS("err"); setMsg("failed");
      setTimeout(() => { setS("idle"); setMsg(""); }, 2000);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <button onClick={scan} disabled={s === "go"} style={{
        fontSize: "0.65rem", fontWeight: 600, padding: "4px 10px", borderRadius: "4px",
        border: "1px solid var(--border)", cursor: s === "go" ? "wait" : "pointer",
        background: s === "done" ? "var(--green)" : s === "err" ? "var(--red)" : "var(--surface-2)",
        color: s === "done" || s === "err" ? "#fff" : "var(--text-2)",
      }}>
        {s === "idle" ? "Scan" : s === "go" ? "..." : s === "done" ? "Done" : "Err"}
      </button>
      {msg && <span className="mono" style={{ fontSize: "0.6rem", color: "var(--text-3)" }}>{msg}</span>}
    </div>
  );
}
