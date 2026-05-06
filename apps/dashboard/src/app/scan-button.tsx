"use client";

import { useState } from "react";

export default function ScanButton() {
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const [result, setResult] = useState<string>("");

  async function runScan() {
    setStatus("scanning");
    setResult("Scanning top players on eBay...");

    try {
      const res = await fetch("/api/quick-scan");
      const data = await res.json();
      setStatus("done");
      setResult(`${data.imported ?? 0} new, ${data.updated ?? 0} updated (${data.elapsed})`);

      // Auto-reset after 5s
      setTimeout(() => { setStatus("idle"); setResult(""); }, 5000);
    } catch {
      setStatus("error");
      setResult("Scan failed. Try again.");
      setTimeout(() => { setStatus("idle"); setResult(""); }, 3000);
    }
  }

  const colors = {
    idle: { bg: "var(--accent)", text: "#fff" },
    scanning: { bg: "#c77d15", text: "#fff" },
    done: { bg: "#0d9f4f", text: "#fff" },
    error: { bg: "#dc2626", text: "#fff" },
  };

  const c = colors[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <button
        onClick={runScan}
        disabled={status === "scanning"}
        style={{
          fontSize: "0.7rem", fontWeight: 600, padding: "6px 14px",
          borderRadius: "6px", background: c.bg, color: c.text,
          border: "none", cursor: status === "scanning" ? "wait" : "pointer",
          transition: "all 0.2s ease",
        }}
      >
        {status === "idle" && "Scan Now"}
        {status === "scanning" && "Scanning..."}
        {status === "done" && "Done!"}
        {status === "error" && "Failed"}
      </button>
      {result && (
        <span style={{ fontSize: "0.65rem", color: status === "done" ? "var(--buy-now)" : status === "error" ? "#dc2626" : "var(--text-muted)" }}>
          {result}
        </span>
      )}
    </div>
  );
}
