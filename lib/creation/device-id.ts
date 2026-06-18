// Device-id resolution for the /creation R1 client. Persisted in a cookie so it
// survives reloads in the R1 WebView and works identically in a desktop browser.
//
// IMPORTANT: this is a per-creation/per-device fingerprint, NOT a credential.
// The actual auth credential is the HMAC-signed `boondit_cs_dt` HttpOnly cookie
// the server sets at link time. We use a store-specific cookie name so we never
// collide with rhythm's r1_device_id on the shared .boondit.site domain.

const KEY = "cs_device_id";
const TEN_YEARS_SECONDS = 10 * 365 * 24 * 60 * 60;

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${TEN_YEARS_SECONDS}; SameSite=Lax; Secure`;
}

// crypto.randomUUID() is unavailable in the R1 WebView (and any non-secure
// context), so fall back to crypto.getRandomValues, then Math.random.
function uuidv4(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40;
      b[8] = (b[8] & 0x3f) | 0x80;
      const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
        .slice(6, 8)
        .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
    }
  } catch {
    // fall through
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get or create the device fingerprint UUID. Used for linking only. */
export function getOrCreateDeviceId(): string {
  const existing = readCookie(KEY);
  if (existing) return existing;
  const id = uuidv4();
  writeCookie(KEY, id);
  return id;
}

/**
 * Headers for an authenticated device request. Sends the fingerprint via
 * X-CS-Device-Id; the real credential is the HttpOnly boondit_cs_dt cookie the
 * browser includes automatically.
 */
export function getAuthHeaders(): Record<string, string> {
  return { "X-CS-Device-Id": getOrCreateDeviceId() };
}
