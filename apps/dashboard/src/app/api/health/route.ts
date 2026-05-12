import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Health probe for Render's healthCheckPath.
 *
 * Returns 200 with a minimal payload as long as the Next.js server is up
 * and can read its own deployment metadata. We deliberately don't hit
 * Supabase here — a transient DB blip should not bounce the service.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "soccer-card-radar",
    region: process.env.RENDER_REGION ?? null,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    now: new Date().toISOString(),
  });
}
