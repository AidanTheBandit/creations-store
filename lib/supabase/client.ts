import { createBrowserClient as createSSRClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client for Client Components.
 * Uses the anon key, respects RLS.
 * No cookie domain override — the PKCE code verifier must stay on the
 * current subdomain so the callback can read it. Session cookies get
 * .boondit.site domain in the callback route instead.
 *
 * SINGLETON: @supabase/ssr's GoTrueClient runs an auto-refresh timer and
 * rotates the single-use refresh token. Instantiating more than one client
 * per tab makes the timers race on that one cookie — each rotation invalidates
 * the others, which then hammer /token?grant_type=refresh_token until the
 * server returns 429 (the "self-DDoS" loop). Reuse one instance per tab.
 */
let browserClient: SupabaseClient | undefined;

export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  browserClient = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return browserClient;
}
