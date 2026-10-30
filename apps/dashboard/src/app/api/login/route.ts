import { COOKIE, MAX_AGE_S, checkLogin, sign } from "@/lib/session";

export const dynamic = "force-dynamic";

/** POST {username, password}: sets the session cookie. Wrong credentials wait a second (slows guessing). */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const user = typeof b?.username === "string" ? b.username.trim().toLowerCase() : "";
  const pass = typeof b?.password === "string" ? b.password : "";
  const want = process.env.AUTH_PASSWORD;
  if (!want) return Response.json({ error: "The site password isn't set yet (AUTH_PASSWORD in Vercel)" }, { status: 503 });
  if (!(await checkLogin(user, pass, want))) {
    await new Promise((r) => setTimeout(r, 1000));
    return Response.json({ error: "Wrong username or password" }, { status: 401 });
  }
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json", "set-cookie": `${COOKIE}=${await sign(want)}; Path=/; Max-Age=${MAX_AGE_S}; HttpOnly; SameSite=Lax${secure}` },
  });
}
