import { createAdminClient } from "@/lib/supabase/admin";
import { hydrateCreationsByIds } from "@/lib/data";
import { getRabbitRepoCreations } from "@/lib/rabbit-repo";

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

// Don't echo the self-referential store creation back into the feed (its url
// points at /creation, which would recurse).
const STORE_URL_RE = /boondit\.site\/creation/i;

type HydratedCreation = Awaited<ReturnType<typeof hydrateCreationsByIds>>[number];

function toFeedItem(c: HydratedCreation, reason: string): FeedItem {
  return {
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
    reason,
  };
}

/**
 * Personalized feed for a user (or anonymous cold-start if userId is null).
 * Over-fetches from the RPC, hydrates in one batch, diversity-reranks, slices.
 */
export async function getForYouFeed(opts: {
  userId: string | null;
  limit: number;
  offset: number;
  // "Rabbit Creations Repo" experiment — when on, mix rabbit.tech repo items in.
  rabbitRepo?: boolean;
}): Promise<FeedItem[]> {
  const { userId, limit, offset, rabbitRepo } = opts;
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

  // Empty RPC result means the user has seen the whole catalog (the RPC excludes
  // store_feed_seen). On a small catalog that's a dead-end — recycle the
  // catalog by quality, ignoring the seen set, so the feed loops instead of
  // showing "no creations yet".
  if (rows.length === 0) {
    const recycled = await getRecycledFeed(admin, limit);
    return mixRabbitRepo(recycled, limit, offset, rabbitRepo);
  }

  const reasonById = new Map(rows.map((r) => [r.id, r.reason]));
  const hydrated = await hydrateCreationsByIds(rows.map((r) => r.id));
  const items = hydrated.map((c) =>
    toFeedItem(c, reasonById.get(c.id) ?? "quality_fallback"),
  );

  const reranked = diversityRerank(items, limit);
  return mixRabbitRepo(reranked, limit, offset, rabbitRepo);
}

// Interleave rabbit.tech repo items into the feed at ~1 in 4 slots, capped so
// they never dominate (they carry no CF/quality signal). No-op when the
// experiment is off. Repo items use synthetic ids (not in store_creations), so
// they're naturally excluded from seen-tracking and bookmarks. Paginated by
// offset so the same repo items don't repeat on every page.
async function mixRabbitRepo(
  base: FeedItem[],
  limit: number,
  offset: number,
  enabled: boolean | undefined,
): Promise<FeedItem[]> {
  if (!enabled) return base;
  const repo = await getRabbitRepoCreations();
  if (repo.length === 0) return base;

  const EVERY = 4; // one repo item per ~4 store items
  const wantCount = Math.max(1, Math.floor(base.length / (EVERY - 1)));
  // Window into the repo list based on page offset so pages don't repeat.
  const start = (Math.floor(offset / limit) * wantCount) % repo.length;
  const picks: FeedItem[] = [];
  for (let i = 0; i < wantCount && i < repo.length; i++) {
    picks.push(repo[(start + i) % repo.length]);
  }

  const out: FeedItem[] = [];
  let p = 0;
  for (let i = 0; i < base.length; i++) {
    out.push(base[i]);
    if ((i + 1) % (EVERY - 1) === 0 && p < picks.length) out.push(picks[p++]);
  }
  // Any leftover picks (short base list) go at the end.
  while (p < picks.length) out.push(picks[p++]);
  return out.slice(0, limit + picks.length);
}

/**
 * Fallback feed once everything's been seen: top creations by quality score,
 * ignoring the seen set so the feed never dead-ends. Quality-only (no CF), but
 * that's fine — it's the "you've reached the end, here's the best again" loop.
 */
async function getRecycledFeed(
  admin: ReturnType<typeof createAdminClient>,
  limit: number,
): Promise<FeedItem[]> {
  const { data, error } = await admin
    .from("creation_quality_scores")
    .select("id")
    .order("qscore", { ascending: false })
    .limit(limit * 3);
  if (error) {
    console.error("[feed] recycle error:", error.message);
    return [];
  }
  const ids = (data || []).map((r) => r.id as string);
  const hydrated = await hydrateCreationsByIds(ids);
  const items = hydrated
    .filter((c) => !STORE_URL_RE.test(c.url))
    .map((c) => toFeedItem(c, "recycled"));
  return diversityRerank(items, limit);
}
