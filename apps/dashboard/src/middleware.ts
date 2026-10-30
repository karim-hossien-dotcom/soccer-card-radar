import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/lib/session";

/** Site lock: every page and API needs the session cookie, except the login itself, the health check and Vercel's
 * cron calls (Bearer CRON_SECRET). In production with no AUTH_PASSWORD set, nobody gets in (fails closed); in local
 * dev with no password the lock is off. */
const OPEN = ["/login", "/api/login", "/api/logout", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (OPEN.some((p) => pathname === p)) return NextResponse.next();
  const password = process.env.AUTH_PASSWORD;
  if (!password && process.env.NODE_ENV !== "production") return NextResponse.next();
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return NextResponse.next();
  if (await verify(req.cookies.get(COOKIE)?.value, password)) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
