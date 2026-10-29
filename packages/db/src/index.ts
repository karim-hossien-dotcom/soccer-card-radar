import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Lazily-instantiated Supabase client.
 *
 * The previous version called `createClient(...)` at module import time. That
 * works locally where `.env.local` is loaded before any code runs, but breaks
 * Next.js's `next build` step on Render: route modules are imported during
 * "Collecting page data" before runtime env vars are available, and the
 * createClient call throws "supabaseKey is required".
 *
 * Pattern: a Proxy that defers client creation to the first property access.
 * Consumers keep the same `supabase.from(...)`, `supabase.rpc(...)` API.
 */

type DBClient = SupabaseClient<Database>;

let cached: DBClient | null = null;

function getClient(): DBClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  // Next.js caches fetch() by default, which served stale rows (snipe board, router.refresh). Always read fresh.
  cached = createClient<Database>(url, key, { global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" } as RequestInit) } });
  return cached;
}

export const supabase = new Proxy({} as DBClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type { Database } from "./database.types";
export { createClient } from "@supabase/supabase-js";
