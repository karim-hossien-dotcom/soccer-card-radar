import { NextRequest, NextResponse } from "next/server";
import { searchListings } from "@soccer-card-radar/mercari-us";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json(
      { error: "Missing ?q= parameter" },
      { status: 400 }
    );
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
  const maxPrice = req.nextUrl.searchParams.get("maxPrice");

  try {
    const listings = await searchListings({
      query,
      limit,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    });

    return NextResponse.json({
      count: listings.length,
      listings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
