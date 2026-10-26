import { NextResponse } from "next/server";
import { supabase } from "@soccer-card-radar/db";
import { requireAdmin } from "@/lib/admin";
import { budgetLeft, refuse, type Bid } from "@/lib/budget";
import { mutateFixture, loadBids } from "@/app/snipe/load";

export const dynamic = "force-dynamic";

/**
 * C3: approve, skip or cancel one auction. Records the decision and max bid; never bids on eBay.
 * Body: { action: "approve" | "skip" | "cancel", externalId, targetId?, title?, url?, endsAt?, maxBid? }
 */
export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const action = b?.action;
  const externalId = typeof b?.externalId === "string" ? b.externalId.trim() : "";
  if (!b || !["approve", "skip", "cancel"].includes(String(action)) || !/^[\w|-]{3,60}$/.test(externalId)) {
    return NextResponse.json({ error: "Send action (approve, skip or cancel) and the eBay item id" }, { status: 400 });
  }
  const now = new Date();
  const maxBid = Math.round(Number(b.maxBid ?? 0) * 100) / 100;
  const endsAt = typeof b.endsAt === "string" && b.endsAt ? b.endsAt : null;

  if (action === "approve") {
    const { bids, budget } = await loadBids();
    const left = budgetLeft(bids, budget, now, externalId).left;
    const bad = refuse(maxBid, endsAt, left, now);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  }

  const status = action === "approve" ? "approved" : action === "skip" ? "skipped" : "cancelled";
  const row = {
    externalId, status, maxBid: action === "approve" ? maxBid : 0, endsAt,
    targetId: typeof b.targetId === "string" && b.targetId ? b.targetId : null,
    title: typeof b.title === "string" ? b.title.slice(0, 300) : null,
    url: typeof b.url === "string" && /^https:\/\/(www\.)?ebay\.com\//.test(b.url) ? b.url : null,
    createdAt: now.toISOString(), updatedAt: now.toISOString(),
  };
  const done = await mutateFixture((rows) => {
    rows.bids = (rows.bids ?? []).filter((x) => x.externalId !== externalId);
    if (action !== "cancel") rows.bids.push({ externalId, status, maxBid: row.maxBid, wonPrice: null, createdAt: row.createdAt } as Bid);
  });
  if (!done) {
    const res = action === "cancel"
      ? await supabase.from("SnipeBid").update({ status, updatedAt: row.updatedAt }).eq("externalId", externalId)
      : await supabase.from("SnipeBid").upsert(row as never, { onConflict: "externalId" });
    if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
