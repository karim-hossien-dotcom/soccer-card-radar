import { NextRequest, NextResponse } from "next/server";

// eBay Marketplace Account Deletion compliance endpoint
// Required for API access — validates the verification token on GET,
// accepts deletion notifications on POST

const VERIFICATION_TOKEN = process.env.EBAY_DELETION_TOKEN ?? "soccercardradar2026soccercardradar2026";

export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");

  if (challengeCode) {
    // eBay sends a challenge to verify the endpoint
    const crypto = await import("crypto");
    const hash = crypto
      .createHash("sha256")
      .update(challengeCode)
      .update(VERIFICATION_TOKEN)
      .update("https://electroneutral-mariella-subhorizontally.ngrok-free.dev/api/ebay/account-deletion")
      .digest("hex");

    return NextResponse.json({ challengeResponse: hash });
  }

  return NextResponse.json({ status: "ok" });
}

export async function POST() {
  // Accept deletion notifications — we don't store eBay user data
  // so there's nothing to delete, just acknowledge
  return NextResponse.json({ status: "accepted" }, { status: 200 });
}
