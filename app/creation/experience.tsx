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
  // When interacting, the gesture overlay lifts so taps/scroll reach the iframe.
  // Otherwise the overlay owns navigation — a cross-origin iframe swallows wheel
  // and touch events, so they can never bubble to our scroll-wheel handler.
  const [interacting, setInteracting] = useState(false);
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeLoaded = useRef(false);
  const touchStartY = useRef<number | null>(null);

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
    setInteracting(false); // every new creation starts in navigation mode
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

  // Single source of truth for advancing/rewinding the feed.
  const navigate = useCallback(
    (dir: "up" | "down") => {
      if (dir === "down") {
        setIdx((i) => Math.min(items.length - 1, i + 1));
      } else {
        setIdx((i) => {
          if (i === 0) {
            onExit(); // scrolling up past the first item drops to the list
            return i;
          }
          return i - 1;
        });
      }
    },
    [items.length, onExit],
  );

  // R1 scroll-wheel + side-button. While "interacting" we hand control to the
  // iframe, so navigation is paused until the user taps the chrome to resume.
  useDeviceControls({
    onScroll: navigate,
    onSide: bookmark,
    active: items.length > 0 && !interacting,
  });

  // Touch-swipe navigation on the gesture overlay (vertical, TikTok-style).
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartY.current;
      touchStartY.current = null;
      if (start == null) return;
      const dy = (e.changedTouches[0]?.clientY ?? start) - start;
      if (Math.abs(dy) < 30) return; // ignore taps / tiny drags
      navigate(dy < 0 ? "down" : "up");
    },
    [navigate],
  );
  // Trackpad / mouse-wheel fallback on the overlay (throttled).
  const lastWheel = useRef(0);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const now = e.timeStamp;
      if (now - lastWheel.current < 300) return;
      lastWheel.current = now;
      navigate(e.deltaY > 0 ? "down" : "up");
    },
    [navigate],
  );

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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-black font-sans">
      {/* Stage: the iframe is inset (not full-bleed) so the device frame and
          chrome read as a "card" and the gesture gutters stay reachable. */}
      <div className="relative min-h-0 flex-1 px-2 pt-2">
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/10 bg-white">
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

          {/* Gesture overlay. A cross-origin iframe captures all wheel/touch
              events, so while navigating we sit ON TOP of it to own swipe +
              scroll. Tapping hands control to the creation (overlay lifts);
              the small "Interacting" pill taps back to navigation. */}
          {!frameBlocked && !interacting && (
            <div
              className="absolute inset-0 z-10"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              onWheel={onWheel}
              onClick={() => setInteracting(true)}
            />
          )}
        </div>

        {!frameBlocked && interacting && (
          <button
            onClick={() => setInteracting(false)}
            className="absolute right-3 top-3 z-20 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-medium text-white active:scale-95"
          >
            Done
          </button>
        )}
      </div>

      {/* Bottom chrome: title + save state. Outside the iframe inset so it's
          always tappable. */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-1.5">
        <span className="truncate text-[10px] font-semibold text-white">
          {current.title}
        </span>
        <button
          onClick={bookmark}
          className="ml-2 shrink-0 text-[10px] active:scale-95"
          style={{ color: bookmarked ? "#fe5000" : "rgba(255,255,255,0.7)" }}
        >
          {bookmarked ? "★ Saved" : "☆ Save"}
        </button>
      </div>

      {toast && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-[10px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}
