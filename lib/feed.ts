import { createAdminClient } from "@/lib/supabase/admin";
import { hydrateCreationsByIds } from "@/lib/data";

// "For You" feed = collaborative-filtering RPC (creation_feed_for_user) +
// a TS diversity re-rank so one author/category can't flood the feed.

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  slug: string;
  iconUrl: string | null;
  screenshotUrl: string | null;
  themeColor: string | null;
  author: string | null;
  categoryId: string | null;
  category: { id: string; name: string; slug: string } | null;
  avgRating: number | null;
  ratingCount: number;
  proxyCode: string | null;
  reason: string;
}

// Don't serve more than this many in a row from the same author or category.
const MAX_CONSECUTIVE = 2;

function diversityRerank<T extends { categoryId: string | null; author: string | null }>(
  items: T[],
  limit: number,
): T[] {
  const out: T[] = [];
  const deferred: T[] = [];
  const tail = (key: "categoryId" | "author") => {
    let n = 0;
    for (let i = out.length - 1; i >= 0; i--) {
      if ((out[i][key] ?? "") && out[i][key] === out[out.length - 1][key]) n++;
      else break;
    }
    return n;
  };
  for (const item of items) {
    if (out.length >= limit) break;
    const lastCat = out.length && out[out.length - 1].categoryId === item.categoryId && item.categoryId;
    const lastAuth = out.length && out[out.length - 1].author === item.author && item.author;
    if ((lastCat && tail("categoryId") >= MAX_CONSECUTIVE) || (lastAuth && tail("author") >= MAX_CONSECUTIVE)) {
      deferred.push(item);
      continue;
    }
    out.push(item);
  }
  // Fill any remaining slots from deferred (order preserved).
  for (const item of deferred) {
    if (out.length >= limit) break;
    out.push(item);
  }
  return out;
}

/**
 * Personalized feed for a user (or anonymous cold-start if userId is null).
 * Over-fetches from the RPC, hydrates in one batch, diversity-reranks, slices.
 */
export async function getForYouFeed(opts: {
  userId: string | null;
  limit: number;
  offset: number;
}): Promise<FeedItem[]> {
  const { userId, limit, offset } = opts;
  const admin = createAdminClient();

  const { data: ranked, error } = await admin.rpc("creation_feed_for_user", {
    p_user_id: userId, // null → cold-start quality ranking inside the RPC
    p_limit: limit * 3,
    p_offset: offset,
  });
  if (error) {
    console.error("[feed] rpc error:", error.message);
    return [];
  }

  const rows = (ranked || []) as { id: string; score: number; reason: string }[];
  const reasonById = new Map(rows.map((r) => [r.id, r.reason]));
  const hydrated = await hydrateCreationsByIds(rows.map((r) => r.id));

  const items: FeedItem[] = hydrated.map((c) => ({
    id: c.id,
    title: c.title,
    url: c.url,
    slug: c.slug,
    iconUrl: c.iconUrl,
    screenshotUrl: c.screenshotUrl,
    themeColor: c.themeColor,
    author: c.author,
    categoryId: c.categoryId,
    category: c.category ? { id: c.category.id, name: c.category.name, slug: c.category.slug } : null,
    avgRating: c.averageRating?.average ?? null,
    ratingCount: c.averageRating?.count ?? 0,
    proxyCode: c.proxyCode,
    reason: reasonById.get(c.id) ?? "quality_fallback",
  }));

  return diversityRerank(items, limit);
}
