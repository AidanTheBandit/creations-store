import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { recordInstall } from "@/lib/analytics";

export const runtime = "nodejs";

interface InstallRequest {
  proxyCode: string;
  sessionId?: string;
}

// Helper function to get session ID from request
async function getSessionId(): Promise<string> {
  const headersList = await headers();
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

  // Simple session identifier based on IP and device type
  const device = getDeviceType(userAgent);
  return `${normalizedIp}_${device}`;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InstallRequest;
    const { proxyCode, sessionId: providedSessionId } = body;

    if (!proxyCode) {
      return NextResponse.json(
        { error: "proxyCode is required" },
        { status: 400 }
      );
    }

    // Get session ID from request if not provided
    const sessionId =
      providedSessionId || (await getSessionId());

    // Get user agent for device tracking
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;

    // Record the install
    const success = await recordInstall(proxyCode, sessionId, userAgent);

    if (!success) {
      return NextResponse.json(
        { error: "Invalid proxy code" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Install recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
