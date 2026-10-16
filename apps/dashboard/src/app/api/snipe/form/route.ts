import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { requireAdmin } from "@/lib/admin";
import { mutateFixture } from "@/app/snipe/load";

export const dynamic = "force-dynamic";

/** C1: approve (or un-approve) a researcher form row so it counts in the snipe score. Body: { actionId, asOf, approved }. */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as { actionId?: unknown; asOf?: unknown; approved?: unknown } | null;
  if (typeof b?.actionId !== "string" || typeof b.asOf !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.asOf) || typeof b.approved !== "boolean")
    return NextResponse.json({ error: "Send actionId, asOf (YYYY-MM-DD) and approved (true/false)" }, { status: 400 });
  const patch = { approved: b.approved, approvedAt: b.approved ? new Date().toISOString() : null };
  const done = await mutateFixture((rows) => {
    for (const f of rows.forms) if (f.actionId === b.actionId && f.asOf === b.asOf) Object.assign(f, patch);
  });
  if (!done) {
    const { error, count } = await supabase.from("PlayerForm").update(patch, { count: "exact" }).eq("actionId", b.actionId).eq("asOf", b.asOf);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!count) return NextResponse.json({ error: "No form row for that player and date" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
