import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { guard, preflight } from "@/lib/api/respond";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Don't echo the self-referential store creation (its url points back at
// /creation). Mirrors STORE_URL_RE in lib/feed.ts.
const STORE_URL_RE = /boondit\.site\/creation/i;

export function OPTIONS() {
  return preflight();
}

// GET /api/v1/creations.json
// Public export of Boondit's published creations in the SAME schema as
// rabbit.tech's creations.json, so third-party repo managers can consume
// Boondit as a drop-in repo. Returns a bare JSON array (not { data }).
export async function GET(req: Request) {
  // read-mode guard: rate-limiting + CORS; anonymous is allowed.
  const g = await guard(req, { mode: "read" });
  if ("error" in g) return g.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("store_creations")
    .select("title, url, description, icon_url, theme_color, author, screenshot_url")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "server_error", message: "Failed to export creations." } },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  const out = (data || [])
    .filter((row) => row.url && !STORE_URL_RE.test(row.url))
    .map((row) => ({
      title: row.title,
      url: row.url,
      description: row.description ?? "",
      iconUrl: row.icon_url ?? "",
      themeColor: row.theme_color ?? "",
      author: row.author ?? "",
      screenshotUrl: row.screenshot_url ?? "",
    }));

  return NextResponse.json(out, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      // Cheap to poll: CDN-cacheable for 5 min, stale-while-revalidate 1h.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
