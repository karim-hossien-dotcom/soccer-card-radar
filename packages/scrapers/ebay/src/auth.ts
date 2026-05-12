/**
 * eBay OAuth2 authentication.
 * - App token (client credentials): for Browse API search
 * - User token: for Trading API watchlist (manually provided, with refresh)
 */

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AppTokenCache {
  token: string;
  expiresAt: number;
}

let appTokenCache: AppTokenCache | null = null;

function getCredentials() {
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error("EBAY_APP_ID and EBAY_CERT_ID are required");
  }
  return { appId, certId };
}

/**
 * Get an application-level OAuth token (client_credentials grant).
 * Used for Browse API search — no user context needed.
 * Caches until 5 min before expiry.
 */
export async function getAppToken(): Promise<string> {
  if (appTokenCache && Date.now() < appTokenCache.expiresAt) {
    return appTokenCache.token;
  }

  const { appId, certId } = getCredentials();
  const credentials = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay app token failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as TokenResponse;

  appTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000, // 5 min buffer
  };

  return data.access_token;
}

/**
 * Get the user token for Trading API (watchlist access).
 * For v1, this is manually set via EBAY_USER_TOKEN env var.
 * TODO: Implement refresh token flow for production use.
 */
export function getUserToken(): string {
  const token = process.env.EBAY_USER_TOKEN;
  if (!token) {
    throw new Error(
      "EBAY_USER_TOKEN is required for watchlist access. " +
        "Generate one at https://developer.ebay.com/my/keys_and_tokens"
    );
  }
  return token;
}
