import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  getCreationAnalytics,
  getCreationDailyStats,
  getTopReferrers,
  getDeviceBreakdown,
} from "@/lib/analytics";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/analytics/[creationId] — per-creation drill-down bundle.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ creationId: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { creationId } = await params;

  try {
    const admin = createAdminClient();
    const { data: creation } = await admin
      .from("store_creations")
      .select("id, title, author, theme_color, url, views, status")
      .eq("id", creationId)
      .maybeSingle();
    if (!creation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [analytics, daily, referrers, devices] = await Promise.all([
      getCreationAnalytics(creationId),
      getCreationDailyStats(creationId, 30),
      getTopReferrers(creationId, 10),
      getDeviceBreakdown(creationId),
    ]);

    return NextResponse.json({
      creation: {
        id: creation.id,
        title: creation.title,
        author: creation.author,
        themeColor: creation.theme_color,
        url: creation.url,
        views: creation.views || 0,
        status: creation.status,
      },
      analytics,
      daily,
      referrers,
      devices,
    });
  } catch (error) {
    console.error("[admin/analytics/:id] error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
