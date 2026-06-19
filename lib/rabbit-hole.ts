import { getRabbitHoleToken } from "@/lib/experiments";

// Server-side proxy to the user's rabbit hole account (the "Rabbit Hole API"
// experiment). The user's appSession token is decrypted in-memory here, used to
// call hole.rabbit.tech, and never returned to any client.
//
// Auth model (observed from the rabbit hole web app): the `appSession` cookie
// authorizes GET /api/auth/me, which returns an `accessToken` JWT. The data
// endpoints under /apis/* then take that accessToken either as a `?accessToken=`
// query param (GET reads) or inside the JSON body (POST/PATCH).

const HOST = "https://hole.rabbit.tech";

type RhMethod = "GET" | "POST" | "PATCH";
type RhTokenIn = "query" | "body";
type RhKind = "read" | "write";

interface RhSpec {
  path: string; // upstream /apis/<name>
  method: RhMethod; // upstream HTTP method
  tokenIn: RhTokenIn; // how the accessToken is passed
  kind: RhKind; // read = GET on our route, write = POST on our route
  // Builds the non-token portion of the body from caller-supplied input.
  buildBody?: (input: Record<string, unknown>) => Record<string, unknown>;
}

function bool(v: unknown, dflt: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return dflt;
}

// The full mapped surface. Resource keys are the kebab path segment used by our
// routes (/api/v1/rabbithole/<key>, /api/creation/rabbit-hole/<key>).
export const RH_SPECS: Record<string, RhSpec> = {
  // ── reads ──
  profile: { path: "/apis/fetchUserProfile", method: "GET", tokenIn: "query", kind: "read" },
  "voice-slots": { path: "/apis/fetchVoiceSlots", method: "GET", tokenIn: "query", kind: "read" },
  "voice-prompt": {
    path: "/apis/fetchCustomVoiceCustomPrompt",
    method: "GET",
    tokenIn: "query",
    kind: "read",
  },
  journal: { path: "/apis/fetchUserJournal", method: "POST", tokenIn: "body", kind: "read" },
  sessions: {
    path: "/apis/fetchHooverSessionsLastNDays",
    method: "POST",
    tokenIn: "body",
    kind: "read",
    buildBody: (i) => ({
      nDays: Number(i.nDays ?? i.days ?? 7) || 7,
      maxResults: Number(i.maxResults ?? 1000) || 1000,
    }),
  },
  device: { path: "/apis/fetchDeviceState", method: "POST", tokenIn: "body", kind: "read" },

  // ── writes ──
  "update-profile": {
    path: "/apis/updateUserProfile",
    method: "PATCH",
    tokenIn: "body",
    kind: "write",
    buildBody: (i) => ({ profile: i.profile ?? {} }),
  },
  "genui-enrolled": {
    path: "/apis/setGenUIEnrolled",
    method: "PATCH",
    tokenIn: "body",
    kind: "write",
    buildBody: (i) => ({ enrolled: bool(i.enrolled, true) }),
  },
  "genui-prompt": {
    path: "/apis/setGenUICustomPrompt",
    method: "POST",
    tokenIn: "body",
    kind: "write",
    buildBody: (i) => ({ customPrompt: String(i.customPrompt ?? "") }),
  },
  "voice-enrolled": {
    path: "/apis/setCustomVoiceEnrolled",
    method: "PATCH",
    tokenIn: "body",
    kind: "write",
    buildBody: (i) => ({ enrolled: bool(i.enrolled, true) }),
  },
  "voice-set-prompt": {
    path: "/apis/setCustomVoiceCustomPrompt",
    method: "POST",
    tokenIn: "body",
    kind: "write",
    buildBody: (i) => ({ customPrompt: String(i.customPrompt ?? "") }),
  },
  "magic-gallery": {
    path: "/apis/setMagicGalleryEnabled",
    method: "PATCH",
    tokenIn: "body",
    kind: "write",
    buildBody: (i) => ({ enabled: bool(i.enabled, true) }),
  },
};

export type RabbitResource = keyof typeof RH_SPECS;

export const READ_RESOURCES = Object.keys(RH_SPECS).filter(
  (k) => RH_SPECS[k].kind === "read",
);
export const WRITE_RESOURCES = Object.keys(RH_SPECS).filter(
  (k) => RH_SPECS[k].kind === "write",
);

export function isRabbitResource(v: string): v is RabbitResource {
  return Object.prototype.hasOwnProperty.call(RH_SPECS, v);
}

export type RabbitHoleError =
  | "no_token" // experiment off or no token stored
  | "wrong_method" // read resource called as write or vice-versa
  | "upstream_auth" // token rejected by rabbit hole (401/403)
  | "upstream_error"; // any other upstream failure

export type RabbitHoleResult =
  | { ok: true; data: unknown }
  | { ok: false; error: RabbitHoleError; status: number };

interface MeResponse {
  accessToken?: string;
  [k: string]: unknown;
}

function baseHeaders(appSession: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    // The appSession is the session cookie the rabbit hole web app sends.
    Cookie: `appSession=${appSession}`,
  };
}

// GET /api/auth/me authenticates the session AND yields the accessToken JWT the
// /apis/* endpoints require.
async function getAccessToken(appSession: string): Promise<string | null> {
  const res = await fetch(`${HOST}/api/auth/me`, {
    headers: baseHeaders(appSession),
    cache: "no-store",
  });
  if (!res.ok) return null;
  try {
    const me = (await res.json()) as MeResponse;
    return me.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Call a rabbit hole resource for a boondit user. Decrypts their stored token,
 * exchanges it for an accessToken, then issues the mapped upstream request.
 * `expectKind` guards GET routes from triggering writes. Never leaks the token.
 */
export async function callRabbitHole(
  userId: string,
  resource: RabbitResource,
  input: Record<string, unknown> = {},
  expectKind?: RhKind,
): Promise<RabbitHoleResult> {
  const spec = RH_SPECS[resource];
  if (expectKind && spec.kind !== expectKind)
    return { ok: false, error: "wrong_method", status: 405 };

  const appSession = await getRabbitHoleToken(userId);
  if (!appSession) return { ok: false, error: "no_token", status: 400 };

  try {
    const accessToken = await getAccessToken(appSession);
    if (!accessToken) return { ok: false, error: "upstream_auth", status: 401 };

    let url = `${HOST}${spec.path}`;
    const init: RequestInit = {
      method: spec.method,
      headers: baseHeaders(appSession),
      cache: "no-store",
    };

    if (spec.tokenIn === "query") {
      url += `?accessToken=${encodeURIComponent(accessToken)}`;
    } else {
      const extra = spec.buildBody ? spec.buildBody(input) : {};
      init.body = JSON.stringify({ accessToken, ...extra });
    }

    const res = await fetch(url, init);
    if (res.status === 401 || res.status === 403)
      return { ok: false, error: "upstream_auth", status: 401 };
    if (!res.ok) return { ok: false, error: "upstream_error", status: 502 };

    // Some mutations return empty bodies; tolerate that.
    const text = await res.text();
    const data = text ? safeJson(text) : { ok: true };
    return { ok: true, data };
  } catch (e) {
    console.error("[rabbit-hole] proxy error:", e);
    return { ok: false, error: "upstream_error", status: 502 };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
