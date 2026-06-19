import { getRabbitHoleToken } from "@/lib/experiments";

// Server-side proxy to the user's rabbit hole account (the "Rabbit Hole API"
// experiment). The user's appSession token is decrypted in-memory here, used to
// call hole.rabbit.tech, and never returned to any client.
//
// Auth model (from the rabbit hole web app): the `appSession` cookie authorizes
// `/api/auth/me`, which returns an `accessToken` JWT. The data endpoints under
// `/apis/*` are POSTs that take that `accessToken` in the body.

const HOST = "https://hole.rabbit.tech";

export type RabbitResource = "profile" | "journal" | "sessions" | "device";

export const RESOURCES: RabbitResource[] = [
  "profile",
  "journal",
  "sessions",
  "device",
];

export function isRabbitResource(v: string): v is RabbitResource {
  return (RESOURCES as string[]).includes(v);
}

export type RabbitHoleError =
  | "no_token" // experiment off or no token stored
  | "upstream_auth" // token rejected by rabbit hole (401/403)
  | "upstream_error"; // any other upstream failure

export type RabbitHoleResult =
  | { ok: true; data: unknown }
  | { ok: false; error: RabbitHoleError; status: number };

interface MeResponse {
  accessToken?: string;
  [k: string]: unknown;
}

async function rhFetch(
  path: string,
  appSession: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${HOST}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      // The appSession is the session cookie the web app sends.
      Cookie: `appSession=${appSession}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

// /api/auth/me both authenticates the session AND yields the accessToken JWT
// the /apis/* endpoints require.
async function getMe(appSession: string): Promise<MeResponse | null> {
  const res = await rhFetch("/api/auth/me", appSession);
  if (!res.ok) return null;
  try {
    return (await res.json()) as MeResponse;
  } catch {
    return null;
  }
}

async function postApi(
  path: string,
  appSession: string,
  accessToken: string,
  extra?: Record<string, unknown>,
): Promise<Response> {
  return rhFetch(path, appSession, {
    method: "POST",
    body: JSON.stringify({ accessToken, ...(extra || {}) }),
  });
}

/**
 * Fetch a rabbit hole resource for a boondit user. Decrypts their stored token,
 * calls the upstream, and returns parsed JSON. Never leaks the token.
 */
export async function fetchRabbitHole(
  userId: string,
  resource: RabbitResource,
  opts?: { days?: number },
): Promise<RabbitHoleResult> {
  const appSession = await getRabbitHoleToken(userId);
  if (!appSession) return { ok: false, error: "no_token", status: 400 };

  try {
    const me = await getMe(appSession);
    if (!me) return { ok: false, error: "upstream_auth", status: 401 };

    // Profile is served directly by /api/auth/me (+ richer profile endpoint).
    if (resource === "profile") {
      const accessToken = me.accessToken;
      if (accessToken) {
        const res = await postApi("/apis/fetchUserProfile", appSession, accessToken);
        if (res.ok) return { ok: true, data: await res.json() };
      }
      // Fall back to the /me payload itself (minus the raw accessToken).
      const { accessToken: _omit, ...safe } = me;
      return { ok: true, data: safe };
    }

    const accessToken = me.accessToken;
    if (!accessToken) return { ok: false, error: "upstream_auth", status: 401 };

    const path =
      resource === "journal"
        ? "/apis/fetchUserJournal"
        : resource === "sessions"
          ? "/apis/fetchHooverSessionsLastNDays"
          : "/apis/fetchDeviceState";

    const extra =
      resource === "sessions" ? { days: opts?.days ?? 7 } : undefined;

    const res = await postApi(path, appSession, accessToken, extra);
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "upstream_auth", status: 401 };
    if (!res.ok) return { ok: false, error: "upstream_error", status: 502 };
    return { ok: true, data: await res.json() };
  } catch (e) {
    console.error("[rabbit-hole] proxy error:", e);
    return { ok: false, error: "upstream_error", status: 502 };
  }
}
