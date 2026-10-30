"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import m from "./masthead.module.css";


/** Quick scan: first 25 eBay searches. The full sweep runs daily from GitHub Actions. */
export default function ScanBtn() {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function scan() {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/scan?max=25", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { imported?: number; updated?: number; error?: string };
      setMsg(r.ok ? `${d.imported ?? 0} new, ${d.updated ?? 0} updated` : `Scan failed: ${d.error ?? r.status}`);
      if (r.ok) router.refresh();
    } catch {
      setMsg("Scan failed. Check your connection and try again.");
    }
    setBusy(false);
    setTimeout(() => setMsg(""), 6000);
  }

  if (pathname === "/login") return null;
  return (
    <div className={m.scanWrap}>
      {msg && <span role="status">{msg}</span>}
      <button className={m.scan} onClick={scan} disabled={busy}>{busy ? "Scanning…" : "Scan eBay"}</button>
    </div>
  );
}
