import { timingSafeEqual } from "node:crypto";

/** True when the browser says the request came from this site's own pages (Origin, else Referer, host = Host). */
export function sameSite(req: Request): boolean {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  const src = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
  try {
    return !!host && new URL(src).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

/**
 * Write routes. The app has no login, so they accept the site's own pages (same-site Origin, like the condition
 * check) or a script carrying ADMIN_TOKEN. Not a substitute for a login: it stops other sites and casual scripts.
 * Returns an error response, or null when allowed.
 */
export function requireAdmin(req: Request): Response | null {
  if (sameSite(req)) return null;
  const want = process.env.ADMIN_TOKEN;
  const got = req.headers.get("x-admin-token") ?? "";
  if (want && got) {
    const a = Buffer.from(got), b = Buffer.from(want);
    if (a.length === b.length && timingSafeEqual(a, b)) return null;
  }
  return Response.json({ error: "Run this from the Card Radar site" }, { status: 403 });
}
