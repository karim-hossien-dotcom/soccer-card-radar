"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import m from "./masthead.module.css";

const TOKEN_KEY = "scr.adminToken"; // saved from Vault › Update comps

/** Quick scan: first 25 eBay searches. The full sweep runs daily from GitHub Actions. */
export default function ScanBtn() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function scan() {
    let token = "";
    try { token = localStorage.getItem(TOKEN_KEY) ?? ""; } catch { /* storage blocked */ }
    if (!token) { setMsg("Add your admin token in Vault, Update comps, first."); return; }
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/scan?max=25", { method: "POST", headers: { "x-admin-token": token } });
      const d = (await r.json().catch(() => ({}))) as { imported?: number; updated?: number; error?: string };
      setMsg(r.ok ? `${d.imported ?? 0} new, ${d.updated ?? 0} updated` : `Scan failed: ${d.error ?? r.status}`);
      if (r.ok) router.refresh();
    } catch {
      setMsg("Scan failed. Check your connection and try again.");
    }
    setBusy(false);
    setTimeout(() => setMsg(""), 6000);
  }

  return (
    <div className={m.scanWrap}>
      {msg && <span role="status">{msg}</span>}
      <button className={m.scan} onClick={scan} disabled={busy}>{busy ? "Scanning…" : "Scan eBay"}</button>
    </div>
  );
}
