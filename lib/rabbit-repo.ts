import crypto from "crypto";
import type { FeedItem } from "@/lib/feed";

// Fetches the official rabbit.tech creations repo and maps it into FeedItems so
// it can be interleaved into a user's feed (the "Rabbit Creations Repo"
// experiment). Cached in-process so we don't hit rabbit.tech on every feed call.

const REPO_URL = "https://www.rabbit.tech/creations/creations.json";
const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface RabbitCreation {
  title?: string;
  url?: string;
  description?: string;
  iconUrl?: string;
  themeColor?: string;
  author?: string;
  screenshotUrl?: string;
}

let cache: { at: number; items: FeedItem[] } | null = null;
let inflight: Promise<FeedItem[]> | null = null;

// Synthetic, stable id so repo items never collide with store_creations UUIDs
// and so the same creation keeps the same id across fetches (React keying).
function repoId(url: string): string {
  return `rabbit:${crypto.createHash("sha1").update(url).digest("hex").slice(0, 24)}`;
}

function toFeedItem(c: RabbitCreation): FeedItem | null {
  if (!c.url || !c.title) return null;
  return {
    id: repoId(c.url),
    title: c.title,
    url: c.url,
    slug: repoId(c.url),
    iconUrl: c.iconUrl ?? null,
    screenshotUrl: c.screenshotUrl ?? null,
    themeColor: c.themeColor ?? null,
    author: c.author ?? null,
    categoryId: null,
    category: null,
    avgRating: null,
    ratingCount: 0,
    proxyCode: null,
    reason: "rabbit_repo",
  };
}

export async function getRabbitRepoCreations(): Promise<FeedItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(REPO_URL, {
        // Let Next cache it at the fetch layer too; our in-process cache is the
        // primary guard against per-request fetches.
        next: { revalidate: 1800 },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const raw = (await res.json()) as RabbitCreation[];
      const items = (Array.isArray(raw) ? raw : [])
        .map(toFeedItem)
        .filter((x): x is FeedItem => x !== null);
      cache = { at: Date.now(), items };
      return items;
    } catch (e) {
      console.error("[rabbit-repo] fetch failed:", e);
      // On failure serve stale cache if we have it, else empty (feed degrades
      // gracefully to the user's normal catalog).
      return cache?.items ?? [];
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
