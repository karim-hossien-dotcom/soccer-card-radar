import { supabase } from "@soccer-card-radar/db";
import type { Json } from "@soccer-card-radar/db";
import { requireAdmin } from "@/lib/admin";
import { splits, validLines, type Lines } from "@/lib/borders";
import { fixtureMode } from "@/app/collection/load";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** G7: save the centering lines the owner confirmed (or adjusted). Splits are recomputed here from the lines. */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return Response.json({ error: "Send JSON" }, { status: 400 });
  const { cardId, side, imageHash, pxPerMm, measured, confirmed } = b;
  if (cardId != null && !(typeof cardId === "string" && UUID.test(cardId))) return Response.json({ error: "Bad card id" }, { status: 400 });
  if (side !== "front" && side !== "back") return Response.json({ error: "side must be front or back" }, { status: 400 });
  if (typeof imageHash !== "string" || !/^[0-9a-f]{64}$/.test(imageHash)) return Response.json({ error: "Bad image hash" }, { status: 400 });
  if (typeof pxPerMm !== "number" || !(pxPerMm > 0 && pxPerMm < 200)) return Response.json({ error: "Bad px per mm" }, { status: 400 });
  if (!validLines(measured) || !validLines(confirmed)) return Response.json({ error: "Lines out of range" }, { status: 400 });
  const s = splits(confirmed as Lines);
  const row = {
    cardId: (cardId as string | null) ?? null, side, imageHash, pxPerMm, measured: measured as unknown as Json, confirmed: confirmed as unknown as Json,
    adjusted: JSON.stringify(measured) !== JSON.stringify(confirmed),
    lr: s.lr.worst, tb: s.tb.worst, lrMid: s.lr.mid, tbMid: s.tb.mid,
  };
  if (fixtureMode()) return Response.json({ saved: 1, row });
  const { error } = await supabase.from("CenteringCheck").insert(row);
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ saved: 1, row });
}
