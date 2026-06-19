"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/creation/device-id";

// Client-side mirror of lib/feed.ts FeedItem (kept local so we don't import a
// server module into the client bundle).
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

const PAGE_SIZE = 20;
const PREFETCH = 6;

// Shared feed loader with lazy pagination. The feed RPC already excludes seen
// items, so each page is fresh; we dedupe by id defensively.
export function useFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const loadingPageRef = useRef(false);
  const offsetRef = useRef(0);

  const loadPage = useCallback(async () => {
    if (loadingPageRef.current || exhausted) return;
    loadingPageRef.current = true;
    try {
      const res = await fetch(
        `/api/creation/feed?limit=${PAGE_SIZE}&offset=${offsetRef.current}`,
        { cache: "no-store", headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = (await res.json()) as { data: FeedItem[] };
      const incoming = body.data ?? [];
      if (incoming.length === 0) {
        setExhausted(true);
      } else {
        offsetRef.current += incoming.length;
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const fresh = incoming.filter((i) => !seen.has(i.id));
          // Once the server starts recycling (returns rows we already have),
          // a page can be all duplicates. Stop paginating so we don't busy-loop
          // fetching the same recycled tail — the user already has the full set.
          if (fresh.length === 0) setExhausted(true);
          return [...prev, ...fresh];
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    } finally {
      loadingPageRef.current = false;
      setLoading(false);
    }
  }, [exhausted]);

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Call when focus nears the tail to prefetch the next page.
  const maybePrefetch = useCallback(
    (focusIndex: number) => {
      if (focusIndex >= items.length - PREFETCH) void loadPage();
    },
    [items.length, loadPage],
  );

  // Best-effort: tell the server which creations have been seen.
  const markSeen = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    void fetch("/api/creation/feed/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ creationIds: ids }),
    }).catch(() => {});
  }, []);

  return { items, loading, error, exhausted, maybePrefetch, markSeen };
}

// Subscribe to R1 scroll-wheel + side-button, with desktop arrow-key fallback.
// Returns nothing; wire handlers via the args. Mirrors rhythm's pattern.
export function useDeviceControls(handlers: {
  onScroll: (dir: "up" | "down") => void;
  onSide: () => void;
  active?: boolean;
}) {
  const { onScroll, onSide, active = true } = handlers;
  const ref = useRef({ onScroll, onSide });
  ref.current = { onScroll, onSide };

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let off: (() => void) | null = null;
    let lastScroll = 0;

    const scroll = (data: { direction: "up" | "down" }) => {
      if (disposed) return;
      const now = performance.now();
      // Friction: the R1 wheel fires a burst per detent, and one flick can emit
      // many. A larger window means one gesture = one move, so the feed doesn't
      // skip several creations at once.
      if (now - lastScroll < 320) return;
      lastScroll = now;
      ref.current.onScroll(data.direction);
    };
    const side = () => {
      if (!disposed) ref.current.onSide();
    };

    (async () => {
      try {
        const mod = await import("r1-create");
        if (disposed) return;
        const controls = mod.deviceControls;
        controls.init({ sideButtonEnabled: true, scrollWheelEnabled: true, keyboardFallback: false });
        controls.on("scrollWheel", scroll);
        controls.on("sideButton", side);
        off = () => {
          controls.off("scrollWheel", scroll);
          controls.off("sideButton", side);
        };
      } catch {
        /* r1-create unavailable on desktop — keyboard fallback covers it */
      }
    })();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { scroll({ direction: "down" }); e.preventDefault(); }
      else if (e.key === "ArrowUp") { scroll({ direction: "up" }); e.preventDefault(); }
      else if (e.key === "Enter" || e.key === " ") { side(); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKey);
      off?.();
    };
  }, [active]);
}
