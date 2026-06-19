import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getPlatformAnalytics, getAllCreationsAnalytics } from "@/lib/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/analytics — platform totals + per-creation analytics rows.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const [platform, creations] = await Promise.all([
      getPlatformAnalytics(),
      getAllCreationsAnalytics(),
    ]);
    return NextResponse.json({ platform, creations });
  } catch (error) {
    console.error("[admin/analytics] error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
