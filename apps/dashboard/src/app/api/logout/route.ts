import { COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST: clears the session cookie. */
export async function POST(req: Request) {
  const login = new URL("/login", req.url);
  return new Response(null, { status: 303, headers: { location: login.pathname, "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax` } });
}
