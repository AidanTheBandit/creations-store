import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * HMAC-signed device token for the Creations Store /creation R1 client.
 *
 * Token format: csdt.<b64url(deviceId)>.<b64url(userId)>.<issuedAtMs>.<b64url(hmac)>
 *
 * Store-namespaced (distinct prefix + cookie) so it never collides with
 * rhythm's r1_dt on the shared .boondit.site domain. Bindings live in
 * store_device_links (MANY devices per user) — we never touch users.r1_device_id.
 */

const TOKEN_PREFIX = "csdt";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // refresh if <7 days left
const COOKIE_NAME = "boondit_cs_dt";

function getSecret(): string {
  const secret = process.env.DEVICE_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("DEVICE_TOKEN_SECRET missing or too short (need 32+ chars)");
  }
  return secret;
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}
function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}
function computeHmac(deviceId: string, userId: string, issuedAt: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${deviceId}.${userId}.${issuedAt}`)
    .digest("base64url");
}

export function signDeviceToken(deviceId: string, userId: string): string {
  const issuedAt = Date.now().toString();
  const sig = computeHmac(deviceId, userId, issuedAt);
  return `${TOKEN_PREFIX}.${b64url(deviceId)}.${b64url(userId)}.${issuedAt}.${sig}`;
}

export interface DeviceTokenPayload {
  deviceId: string;
  userId: string;
  issuedAt: number;
  needsRefresh: boolean;
}

export function verifyDeviceToken(token: string): DeviceTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_PREFIX) return null;
  try {
    const deviceId = fromB64url(parts[1]);
    const userId = fromB64url(parts[2]);
    const issuedAtStr = parts[3];
    const providedSig = parts[4];

    const expectedSig = computeHmac(deviceId, userId, issuedAtStr);
    const a = Buffer.from(providedSig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const issuedAt = parseInt(issuedAtStr, 10);
    if (isNaN(issuedAt)) return null;
    const age = Date.now() - issuedAt;
    if (age > TOKEN_TTL_MS || age < 0) return null;

    return { deviceId, userId, issuedAt, needsRefresh: age > TOKEN_TTL_MS - REFRESH_WINDOW_MS };
  } catch {
    return null;
  }
}

export interface DeviceAuthResult {
  userId: string;
  deviceId: string;
  refreshedToken?: string;
}

/**
 * Authenticate the device from the boondit_cs_dt cookie (or X-CS-Device-Token
 * header), verify the HMAC, and confirm the binding still exists in
 * store_device_links (catches unlinked devices / revoked tokens).
 */
export async function authenticateDevice(
  req: NextRequest,
): Promise<DeviceAuthResult | null> {
  const token =
    req.cookies.get(COOKIE_NAME)?.value ??
    req.headers.get("x-cs-device-token") ??
    undefined;
  if (!token) return null;

  const payload = verifyDeviceToken(token);
  if (!payload) return null;

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("store_device_links")
    .select("device_id")
    .eq("device_id", payload.deviceId)
    .eq("user_id", payload.userId)
    .maybeSingle();
  if (!link) return null;

  const result: DeviceAuthResult = {
    userId: payload.userId,
    deviceId: payload.deviceId,
  };
  if (payload.needsRefresh) {
    result.refreshedToken = signDeviceToken(payload.deviceId, payload.userId);
  }
  return result;
}

/** Convenience for routes that just need the authed user/device or null. */
export async function getDeviceUser(
  req: NextRequest,
): Promise<{ userId: string; deviceId: string } | null> {
  const auth = await authenticateDevice(req);
  return auth ? { userId: auth.userId, deviceId: auth.deviceId } : null;
}

export function setDeviceTokenCookie(res: NextResponse, token: string): void {
  const domain = process.env.COOKIE_DOMAIN || ".boondit.site";
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TOKEN_TTL_MS / 1000),
    domain,
  });
}

export function applyTokenUpdates(res: NextResponse, auth: DeviceAuthResult): void {
  if (auth.refreshedToken) setDeviceTokenCookie(res, auth.refreshedToken);
}

export { COOKIE_NAME as DEVICE_COOKIE_NAME };
