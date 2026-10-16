import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Write routes are behind ADMIN_TOKEN: the app has no login and the Render URL is public.
 * Returns an error response, or null when the request carries the right token.
 */
export function requireAdmin(req: Request): NextResponse | null {
  const want = process.env.ADMIN_TOKEN;
  if (!want) return NextResponse.json({ error: "ADMIN_TOKEN is not set on the server" }, { status: 503 });
  const got = req.headers.get("x-admin-token") ?? "";
  const a = Buffer.from(got), b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Wrong admin token" }, { status: 401 });
  return null;
}
