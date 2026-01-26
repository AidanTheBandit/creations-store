import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { creations, creationClicks } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ code: string }>;
}

// Helper function to anonymize IP address (zero out last octet for privacy)
function anonymizeIp(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    parts[3] = "0";
    return parts.join(".");
  }
  // For IPv6 or other formats, return a hash
  return ip.split(":").slice(0, 3).join(":") + ":xxxx";
}

// Helper function to detect device type from user agent
function getDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("iphone") || ua.includes("ipad")) return "iOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("mac")) return "macOS";
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
}

// Helper function to generate session ID
function getSessionId(ip: string, userAgent: string): string {
  // Simple session identifier based on IP and device type
  const device = getDeviceType(userAgent);
  return `${anonymizeIp(ip)}_${device}`;
}

// Rate limiting: check if this session clicked this creation in the last hour
async function shouldCountClick(creationId: number, sessionId: string): Promise<boolean> {
  const oneHourAgo = new Date((Date.now() / 1000 - 3600) * 1000);

  const result = await db
    .select()
    .from(creationClicks)
    .where(
      and(
        eq(creationClicks.creationId, creationId),
        eq(creationClicks.sessionId, sessionId),
        gte(creationClicks.clickedAt, oneHourAgo)
      )
    )
    .limit(1);

  return result.length === 0;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const headersList = await headers();

  // Find creation by proxy code
  const result = await db
    .select()
    .from(creations)
    .where(eq(creations.proxyCode, code))
    .limit(1);

  if (result.length === 0) {
    // Creation not found - redirect to home with error
    return redirect("/?error=invalid-link");
  }

  const creation = result[0];

  // Check if creation is flagged
  if (creation.isFlagged) {
    // Redirect to warning page
    return redirect(`/go/${code}/warning?reason=${encodeURIComponent(creation.flagReason || "This creation has been flagged")}`);
  }

  // Extract tracking information
  const forwarded = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : realIp || "localhost";

  // Normalize local development IPs
  const normalizedIp =
    ip === "::1" || ip === "127.0.0.1" || ip === "localhost"
      ? "local_dev"
      : ip;

  const userAgent = headersList.get("user-agent") || "Unknown";
  const referrer = headersList.get("referer") || null;

  // Generate session ID
  const sessionId = getSessionId(normalizedIp, userAgent);

  // Check if we should count this click (rate limiting)
  const shouldCount = await shouldCountClick(creation.id, sessionId);

  // Always record the click for analytics (even if rate limited)
  const now = Math.floor(Date.now() / 1000);
  await db.insert(creationClicks).values({
    creationId: creation.id,
    sessionId,
    userAgent,
    referrer,
    clickedAt: new Date(now * 1000),
  });

  // Redirect to the actual creation URL
  return redirect(creation.url);
}
