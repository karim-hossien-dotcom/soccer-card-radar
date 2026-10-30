"use client";
import { useState } from "react";
import { safeNext } from "@/lib/session";
import s from "./login.module.css";

export default function LoginForm({ next }: { next: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr(null);
    const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) }).catch(() => null);
    if (res?.ok) { window.location.assign(safeNext(next)); return; }
    const body = await res?.json().catch(() => null);
    setErr(body?.error ?? "Couldn't reach the site"); setBusy(false);
  };
  return (
    <main className={s.wrap}>
      <form className={s.card} onSubmit={submit}>
        <h1>Card Radar</h1>
        <label>Username<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        {err && <p className={s.err} role="alert">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? "Checking…" : "Log in"}</button>
      </form>
    </main>
  );
}
