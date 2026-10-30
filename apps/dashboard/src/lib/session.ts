/** Site lock: one user, password from the AUTH_PASSWORD env var (set in Vercel, never in git). The session cookie is
 * `user.expiry.signature`, HMAC-SHA256 with a key derived from the password, so changing the password logs every
 * session out. Web Crypto only: runs in the edge middleware and in node route handlers. Mirrored in
 * api/_grade_screen/session.py for the Python functions. */

export const USER = "karimhossien";
export const COOKIE = "cr_session";
export const MAX_AGE_S = 30 * 24 * 3600;

const enc = new TextEncoder();
const b64url = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function key(password: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`card-radar-session-v1:${password}`));
  return crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function sign(password: string, now = Date.now()): Promise<string> {
  const body = `${USER}.${Math.floor(now / 1000) + MAX_AGE_S}`;
  return `${body}.${b64url(await crypto.subtle.sign("HMAC", await key(password), enc.encode(body)))}`;
}

/** True when the token was signed with this password, is for USER and has not expired. */
export async function verify(token: string | undefined, password: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token || !password) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== USER || !/^\d+$/.test(parts[1]) || Number(parts[1]) * 1000 < now) return false;
  try {
    return await crypto.subtle.verify("HMAC", await key(password), fromB64url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}

/** Constant-time check of the typed credentials (compares SHA-256 digests, so lengths don't leak). */
export async function checkLogin(user: string, given: string, password: string | undefined): Promise<boolean> {
  if (!password) return false;
  const [a, b] = await Promise.all([given, password].map((x) => crypto.subtle.digest("SHA-256", enc.encode(x))));
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = user === USER ? 0 : 1;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Only same-site paths after login: "/grading" yes, "//evil.com" or "https://..." no. */
export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : "/");
