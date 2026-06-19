import { NextRequest } from "next/server";
import { getDeviceUser } from "@/lib/auth/device";
import { getForYouFeed } from "@/lib/feed";
import { json, apiError, preflight } from "@/lib/api/respond";
import { createAdminClient } from "@/lib/supabase/admin";
import { hydrateCreationsByIds } from "@/lib/data";
import { getExperimentFlags } from "@/lib/experiments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

// GET /api/creation/feed?limit&offset&mode=foryou|category&category=<slug>
// Device-token authed (the /creation R1 client). Anonymous → cold-start feed.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  const mode = url.searchParams.get("mode") || "foryou";
  const categorySlug = url.searchParams.get("category")?.trim();

  const device = await getDeviceUser(req);
  const userId = device?.userId ?? null;

  try {
    // Category browse mode: published creations in a category, quality-ordered.
    if (mode === "category" && categorySlug) {
      const admin = createAdminClient();
      const { data: cat } = await admin
        .from("store_categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!cat) return json({ data: [], pagination: { limit, offset, mode } });

      const { data: rows } = await admin
        .from("store_creations")
        .select("id")
        .eq("status", "published")
        .eq("category_id", cat.id)
        .order("views", { ascending: false })
        .range(offset, offset + limit - 1);

      const hydrated = await hydrateCreationsByIds((rows || []).map((r) => r.id));
      const data = hydrated.map((c) => ({
        id: c.id,
        title: c.title,
        url: c.url,
        slug: c.slug,
        iconUrl: c.iconUrl,
        screenshotUrl: c.screenshotUrl,
        themeColor: c.themeColor,
        author: c.author,
        categoryId: c.categoryId,
        category: c.category
          ? { id: c.category.id, name: c.category.name, slug: c.category.slug }
          : null,
        avgRating: c.averageRating?.average ?? null,
        ratingCount: c.averageRating?.count ?? 0,
        proxyCode: c.proxyCode,
        reason: "category",
      }));
      return json({ data, pagination: { limit, offset, mode, personalized: false } });
    }

    // "Rabbit Creations Repo" experiment is per-user; anonymous never gets it.
    const rabbitRepo = userId
      ? (await getExperimentFlags(userId)).rabbitRepoEnabled
      : false;

    const items = await getForYouFeed({ userId, limit, offset, rabbitRepo });
    return json({
      data: items,
      pagination: {
        limit,
        offset,
        mode: "foryou",
        personalized: !!userId,
      },
    });
  } catch (e) {
    console.error("[creation/feed] error:", e);
    return apiError("server_error", "Failed to build feed.", 500);
  }
}
