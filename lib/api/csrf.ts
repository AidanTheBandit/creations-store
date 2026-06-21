// Lightweight CSRF defense for cookie-authenticated, state-changing routes.
//
// The Supabase session cookie is scoped to `.boondit.site`, so a sibling
// subdomain is "same-site" and SameSite=Lax alone won't stop a forged
// state-changing request from one. We additionally require the request's Origin
// (or, as a fallback, Referer) to be the canonical app origin. Same-origin fetch
// always sends a matching Origin; cross-origin/cross-subdomain forgeries don't.

function allowedOrigins(): string[] {
  const out = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) {
    try {
      out.add(new URL(site).origin);
    } catch {
      /* ignore malformed env */
    }
  }
  // Canonical prod origin (covers deployments where the env var isn't set).
  out.add("https://creations.boondit.site");
  if (process.env.NODE_ENV !== "production") {
    out.add("http://localhost:3245");
    out.add("http://localhost:3000");
  }
  return [...out];
}

/**
 * Returns true if the request's Origin/Referer is an allowed same-origin caller.
 * Use on cookie-authed POST/PUT/PATCH/DELETE handlers.
 */
export function sameOrigin(req: Request): boolean {
  const allowed = allowedOrigins();
  const origin = req.headers.get("origin");
  if (origin) return allowed.includes(origin);
  // Some browsers omit Origin on same-origin requests; fall back to Referer.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowed.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  // No Origin and no Referer — reject state-changing requests.
  return false;
}
