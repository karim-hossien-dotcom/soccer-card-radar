import { NextResponse } from "next/server";
import { syncWatchlist } from "@soccer-card-radar/ebay";

export async function GET() {
  try {
    const items = await syncWatchlist();

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
