import { NextResponse } from "next/server";
import { normalizeGrade } from "@soccer-card-radar/shared";
import { requireAdmin } from "@/lib/admin";
import { saveComps, type NewComp } from "@/app/collection/load";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A4: save manual Card Ladder comps. Body: { rows: NewComp[] } (parsed and previewed client-side, re-validated here). */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { rows?: unknown } | null;
  const rows = Array.isArray(body?.rows) ? (body!.rows as Partial<NewComp>[]) : null;
  if (!rows || rows.length === 0 || rows.length > 1000) return NextResponse.json({ error: "Send 1 to 1000 rows" }, { status: 400 });
  const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const clean: NewComp[] = [];
  for (const [i, r] of rows.entries()) {
    const grade = typeof r.grade === "string" ? normalizeGrade(r.grade) : null;
    const ok =
      typeof r.cardId === "string" && UUID.test(r.cardId) && grade &&
      typeof r.price === "number" && r.price > 0 && r.price < 1_000_000 &&
      Number.isInteger(r.sampleSize) && r.sampleSize! >= 1 &&
      typeof r.asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.asOf) && r.asOf <= tomorrow;
    if (!ok) return NextResponse.json({ error: `Row ${i + 1} is invalid` }, { status: 400 });
    clean.push({ cardId: r.cardId!, grade: grade!, price: Math.round(r.price! * 100) / 100, sampleSize: r.sampleSize!, asOf: r.asOf! });
  }
  try {
    return NextResponse.json({ saved: await saveComps(clean) });
  } catch (e) {
    // Unknown cardId -> foreign key error from Postgres.
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
