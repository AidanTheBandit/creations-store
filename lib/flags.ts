// Feature flags (env-driven).
//
// Static hosting is gated OFF by default. With open network egress for hosted
// apps, the store's cookie isolation rests solely on the per-response sandbox
// CSP — acceptable, but we want hosted content on a separate COOKIELESS origin
// (a domain the boondit session cookie isn't scoped to) before exposing it
// publicly, so a CSP regression can never leak the session. Until that ships,
// keep the feature hidden. Set NEXT_PUBLIC_STATIC_HOSTING=1 to enable (the
// NEXT_PUBLIC_ prefix makes it readable in both server and client components).
export function staticHostingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STATIC_HOSTING === "1";
}
