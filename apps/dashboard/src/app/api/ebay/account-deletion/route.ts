import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

/**
 * eBay Marketplace Account Deletion compliance endpoint.
 *
 * eBay requires every API consumer to register a publicly-reachable URL that
 * receives user-data-deletion notifications. Before notifications start
 * flowing, eBay verifies the endpoint by issuing a GET with a `challenge_code`
 * query parameter. We must respond with the SHA-256 hash of the
 * concatenation of three values, in this exact order:
 *
 *     challenge_code  +  verification_token  +  endpoint_url
 *
 * The verification_token is set BOTH in eBay's developer portal AND in our
 * env (must match byte-for-byte). The endpoint_url is the public URL we
 * registered in eBay's portal (also must match byte-for-byte — even trailing
 * slash, scheme, casing matter).
 *
 * Previously this file had the ngrok URL hardcoded into the hash. Now we
 * compute the URL deterministically from env (preferred) or from the request
 * (fallback when env is unset).
 */

const VERIFICATION_TOKEN =
  process.env.EBAY_DELETION_TOKEN ?? "soccercardradar2026soccercardradar2026";

function resolveEndpointUrl(req: NextRequest): string {
  // Preferred: explicit env var. Must match the URL registered in eBay's
  // developer portal exactly. Easiest source of truth.
  const explicit = process.env.EBAY_DELETION_ENDPOINT_URL;
  if (explicit) return explicit.trim();

  // Fallback: reconstruct from the request. Render sets X-Forwarded-Proto
  // and Host correctly, so nextUrl.origin reflects the public HTTPS URL.
  return `${req.nextUrl.origin}${req.nextUrl.pathname}`;
}

export async function GET(req: NextRequest) {
  const challengeCode = req.nextUrl.searchParams.get("challenge_code");

  if (!challengeCode) {
    return NextResponse.json({ status: "ok" });
  }

  const endpointUrl = resolveEndpointUrl(req);
  const hash = createHash("sha256")
    .update(challengeCode)
    .update(VERIFICATION_TOKEN)
    .update(endpointUrl)
    .digest("hex");

  return NextResponse.json({ challengeResponse: hash });
}

export async function POST() {
  // We don't store eBay user data, so deletion is a no-op. Just acknowledge.
  return NextResponse.json({ status: "accepted" }, { status: 200 });
}
