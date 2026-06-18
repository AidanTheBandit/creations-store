"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/creation/device-id";
import { useFeed, useDeviceControls } from "./use-feed";

// Experience mode: full-canvas iframe of the focused creation. Scroll wheel
// advances/rewinds (TikTok-style), side button bookmarks. If a site refuses to
// be framed, we fall back to its screenshot + title.
export function Experience({
  linked,
  startIndex,
  onExit,
}: {
  linked: boolean;
  startIndex: number;
  onExit: () => void;
}) {
  const { items, loading, error, exhausted, maybePrefetch, markSeen } = useFeed();
  const [idx, setIdx] = useState(startIndex);
  const [frameBlocked, setFrameBlocked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeLoaded = useRef(false);

  const current = items[idx];

  // Clamp once items arrive (startIndex came from the list's own feed copy).
  useEffect(() => {
    if (items.length > 0) setIdx((i) => Math.max(0, Math.min(items.length - 1, i)));
  }, [items.length]);

  // On each creation change: reset frame state, mark seen, prefetch, reset bookmark.
  useEffect(() => {
    if (!current) return;
    setFrameBlocked(false);
    setBookmarked(false);
    iframeLoaded.current = false;
    markSeen([current.id]);
    maybePrefetch(idx);

    // If the iframe hasn't fired `load` within 4s, assume it's blocked.
    if (loadTimer.current) clearTimeout(loadTimer.current);
    loadTimer.current = setTimeout(() => {
      if (!iframeLoaded.current) setFrameBlocked(true);
    }, 4000);
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current);
    };
  }, [current, idx, markSeen, maybePrefetch]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }, []);

  const bookmark = useCallback(async () => {
    if (!current) return;
    if (!linked) {
      showToast("Link your account to save");
      return;
    }
    setBookmarked(true); // optimistic
    try {
      const res = await fetch("/api/creation/bookmark", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ creationId: current.id }),
      });
      showToast(res.ok ? "Saved ✓" : "Couldn't save");
      if (!res.ok) setBookmarked(false);
    } catch {
      setBookmarked(false);
      showToast("Couldn't save");
    }
  }, [current, linked, showToast]);

  useDeviceControls({
    onScroll: (dir) => {
      if (dir === "down") {
        setIdx((i) => Math.min(items.length - 1, i + 1));
      } else {
        // At the top, scrolling up exits back to the list.
        setIdx((i) => {
          if (i === 0) {
            onExit();
            return i;
          }
          return i - 1;
        });
      }
    },
    onSide: bookmark,
    active: items.length > 0,
  });

  if (!current) {
    // Distinguish "still fetching" from "fetched, nothing to show" so we never
    // hang on "Loading…" when the feed is legitimately empty.
    const stillLoading = loading && !exhausted && !error;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-background p-3 text-center font-sans text-foreground">
        {stillLoading ? (
          <p className="text-[10px] text-muted-foreground">Loading…</p>
        ) : (
          <>
            <p className="text-xs font-semibold">
              {error ? "Couldn't load creations" : "No creations yet"}
            </p>
            <p className="px-3 text-[9px] leading-snug text-muted-foreground">
              {error
                ? "Check your connection and try again."
                : "Come back soon — new creations are added all the time."}
            </p>
            <button
              onClick={onExit}
              className="mt-1 rounded bg-muted px-3 py-1 text-[10px] text-foreground active:scale-95"
            >
              Back
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black font-sans">
      {frameBlocked ? (
        // Graceful fallback — can't embed this creation.
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-background p-3 text-center text-foreground">
          {current.screenshotUrl || current.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.screenshotUrl || current.iconUrl || ""}
              alt=""
              className="max-h-[55%] w-auto rounded-md border border-border object-contain"
            />
          ) : null}
          <p className="text-xs font-semibold">{current.title}</p>
          <p className="px-3 text-[9px] leading-snug text-muted-foreground">
            This creation can&apos;t be previewed here. Save it to install later.
          </p>
        </div>
      ) : (
        <iframe
          key={current.id}
          src={current.url}
          title={current.title}
          className="h-full w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => {
            iframeLoaded.current = true;
          }}
        />
      )}

      {/* Bottom overlay: title + save state + exit hint */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-4">
        <span className="truncate text-[10px] font-semibold text-white">{current.title}</span>
        <span
          className="ml-2 shrink-0 text-[10px]"
          style={{ color: bookmarked ? "#fe5000" : "rgba(255,255,255,0.7)" }}
        >
          {bookmarked ? "★ Saved" : "☆ Save"}
        </span>
      </div>

      {toast && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-[10px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
