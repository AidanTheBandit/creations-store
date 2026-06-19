"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthHeaders } from "@/lib/creation/device-id";
import { useFeed, useDeviceControls, type FeedItem } from "./use-feed";

// Experience mode: a full-screen, TikTok-style vertical feed of creations.
// The focused creation runs live in an iframe; swipe/scroll slides to the next
// one with an animation. A cross-origin iframe swallows wheel/touch, so a
// gesture overlay sits on top to own navigation until the user taps "Use this"
// to interact with the creation itself.
export function Experience({
  linked,
  startIndex,
  onExit,
  onAccount,
}: {
  linked: boolean;
  startIndex: number;
  onExit: () => void;
  onAccount: () => void;
}) {
  const { items, loading, error, exhausted, maybePrefetch, markSeen } = useFeed();
  const [idx, setIdx] = useState(startIndex);
  const [bookmarked, setBookmarked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // While interacting, the gesture overlay lifts so taps/scroll reach the
  // iframe. Otherwise the overlay owns swipe/scroll navigation.
  const [interacting, setInteracting] = useState(false);
  // Creations that refused to be framed (X-Frame-Options/CSP) — tracked by id
  // so a blocked slide shows its poster fallback even after preloading.
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const touchStartY = useRef<number | null>(null);

  const current = items[idx];

  // Clamp once items arrive (startIndex came from the list's own feed copy).
  useEffect(() => {
    if (items.length > 0) setIdx((i) => Math.max(0, Math.min(items.length - 1, i)));
  }, [items.length]);

  // On each creation change: mark seen, prefetch, record view, reset per-item UI.
  // (Frame-blocked detection now lives per-Slide so neighbors can preload.)
  useEffect(() => {
    if (!current) return;
    setBookmarked(false);
    setInteracting(false); // every new creation starts in navigation mode
    markSeen([current.id]);
    maybePrefetch(idx);

    // Contribute to the creation's analytics (published-gated + deduped on the
    // server, so this won't inflate views on drafts or repeat opens).
    void fetch("/api/creation/view", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ creationId: current.id }),
    }).catch(() => {});
  }, [current, idx, markSeen, maybePrefetch]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }, []);

  // Toggle: POST adds, DELETE removes. Optimistic, reverts on failure.
  const bookmark = useCallback(async () => {
    if (!current) return;
    if (!linked) {
      showToast("Link your account to save");
      return;
    }
    const next = !bookmarked;
    setBookmarked(next); // optimistic
    try {
      const res = await fetch("/api/creation/bookmark", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ creationId: current.id }),
      });
      if (!res.ok) {
        setBookmarked(!next);
        showToast("Couldn't update");
      } else {
        showToast(next ? "Saved ✓" : "Removed");
      }
    } catch {
      setBookmarked(!next);
      showToast("Couldn't update");
    }
  }, [current, linked, bookmarked, showToast]);

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
  // iframe, so navigation is paused until the user taps back out.
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
      // Friction: require a deliberate swipe (~1/5 of the screen) before
      // advancing, so small drags don't skip creations.
      if (Math.abs(dy) < 56) return;
      navigate(dy < 0 ? "down" : "up");
    },
    [navigate],
  );
  // Trackpad / mouse-wheel fallback on the overlay (throttled).
  const lastWheel = useRef(0);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const now = e.timeStamp;
      if (now - lastWheel.current < 450) return; // friction: one move per flick
      lastWheel.current = now;
      navigate(e.deltaY > 0 ? "down" : "up");
    },
    [navigate],
  );

  // STABLE blocked/loaded callbacks. These MUST NOT be recreated per render:
  // Slide's load-detection effect depends on them, so an inline arrow would
  // re-run that effect on every Experience re-render (toast, interacting, …),
  // restart the 3s timer against an already-loaded iframe that never fires
  // onLoad again, and falsely mark it blocked — making "Use this" vanish if you
  // sit on a slide. A loaded slide also clears any earlier blocked flag.
  const markBlocked = useCallback((id: string) => {
    setBlockedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const markLoaded = useCallback((id: string) => {
    setBlockedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

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
            <div className="mt-1 flex gap-1.5">
              <button
                onClick={onExit}
                className="rounded bg-muted px-3 py-1 text-[10px] text-foreground active:scale-95"
              >
                Back
              </button>
              {/* Always offer Account here so a linked device with a corrupt
                  key / empty feed can still reach logout and isn't trapped. */}
              <button
                onClick={onAccount}
                className="rounded bg-card px-3 py-1 text-[10px] text-foreground active:scale-95"
              >
                Account
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Render a 5-slide window (2 prev / current / 2 next) on a rail that
  // translates to center the current slide. ALL FIVE get a live iframe so the
  // two creations in each direction are already loaded when you swipe — only
  // the current one is interactive; the off-screen ones preload silently
  // (pointer-events disabled).
  const slideWindow: { item: FeedItem; pos: number }[] = [];
  for (let d = -2; d <= 2; d++) {
    const j = idx + d;
    if (j >= 0 && j < items.length) slideWindow.push({ item: items[j], pos: d });
  }

  const currentBlocked = blockedIds.has(current.id);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black font-sans">
      {/* Vertical rail: each slide is full-screen; we translate by pos*100% so
          the focused slide is centered, animating on navigate (TikTok-style).
          Keyed by item.id so React keeps neighbor iframes mounted (loaded)
          across swipes. */}
      {slideWindow.map(({ item, pos }) => (
        <div
          key={item.id}
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translateY(${pos * 100}%)`,
            transition: "transform 260ms cubic-bezier(0.22,1,0.36,1)",
            // Off-screen slides must not eat input meant for the focused one.
            pointerEvents: pos === 0 ? undefined : "none",
          }}
          aria-hidden={pos !== 0}
        >
          <Slide
            item={item}
            // Only the current slide is reachable; neighbors preload muted.
            active={pos === 0}
            onBlocked={markBlocked}
            onLoaded={markLoaded}
          />
        </div>
      ))}

      {/* Gesture overlay — owns swipe/scroll while navigating. Tapping "Use
          this" lifts it so the creation receives input. */}
      {!interacting && (
        <div
          className="absolute inset-0 z-10"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel}
        />
      )}

      {/* Top-right controls: interact toggle + account. Always above the rail. */}
      <div className="absolute right-2 top-2 z-20 flex items-center gap-1.5">
        {!currentBlocked &&
          (interacting ? (
            <button
              onClick={() => setInteracting(false)}
              className="rounded-full bg-primary px-2.5 py-1 text-[9px] font-semibold text-primary-foreground active:scale-95"
            >
              ✓ Done
            </button>
          ) : (
            <button
              onClick={() => setInteracting(true)}
              className="rounded-full bg-white/85 px-2.5 py-1 text-[9px] font-semibold text-black active:scale-95"
            >
              Use this
            </button>
          ))}
        <button
          onClick={onAccount}
          aria-label="Account"
          className="rounded-full bg-black/60 px-2 py-1 text-[9px] font-medium text-white active:scale-95"
        >
          Account
        </button>
      </div>

      {/* Bottom chrome: title + save. Sits above the overlay so it stays tappable. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-white">
            {current.title}
          </p>
          <p className="truncate text-[8px] text-white/70">
            {current.author || current.category?.name || "Creation"}
            {!interacting && " · swipe to browse"}
          </p>
        </div>
        <button
          onClick={bookmark}
          className="pointer-events-auto ml-2 shrink-0 text-[11px] active:scale-95"
          style={{ color: bookmarked ? "#fe5000" : "rgba(255,255,255,0.85)" }}
        >
          {bookmarked ? "★" : "☆"}
        </button>
      </div>

      {toast && (
        <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded bg-black/80 px-2 py-1 text-[10px] text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

// One feed slide: a live iframe (kept mounted across swipes so prev/next
// preload), with a poster fallback if the site refuses to be framed. Manages
// its own load timer so each slide detects blocking independently.
function Slide({
  item,
  active,
  onBlocked,
  onLoaded,
}: {
  item: FeedItem;
  active: boolean;
  onBlocked: (id: string) => void;
  onLoaded: (id: string) => void;
}) {
  const [blocked, setBlocked] = useState(false);
  const loaded = useRef(false);

  // Re-arm ONLY when the slide shows a different creation. onBlocked/onLoaded
  // are stable (useCallback in the parent), so a parent re-render won't restart
  // this timer against an already-loaded iframe — which would falsely mark a
  // sitting slide as blocked and hide its "Use this" button.
  useEffect(() => {
    loaded.current = false;
    setBlocked(false);
    // Frame-block fallback. A framed site fires `load` within a second or two;
    // an X-Frame-Options/CSP refusal shows the browser's "can't connect" page.
    // Keep this short so the poster replaces that error page quickly.
    const t = setTimeout(() => {
      if (!loaded.current) {
        setBlocked(true);
        onBlocked(item.id);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [item.id, onBlocked]);

  if (blocked) return <Poster item={item} blocked />;

  return (
    <iframe
      src={item.url}
      title={item.title}
      className="h-full w-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
      // Delegate device permissions so creations that need camera/mic (QR
      // scanners, AR, voice) can request them inside the frame.
      allow="camera; microphone; autoplay; clipboard-read; clipboard-write; fullscreen; accelerometer; gyroscope"
      // Off-screen neighbors load but can't be interacted with or tab-focused.
      tabIndex={active ? undefined : -1}
      onLoad={() => {
        loaded.current = true;
        // A late load (after the 3s timer fired) clears the blocked flag so the
        // poster yields back to the live frame and "Use this" returns.
        onLoaded(item.id);
      }}
    />
  );
}

// Lightweight slide poster for neighbors and the frame-blocked fallback.
function Poster({ item, blocked }: { item: FeedItem; blocked: boolean }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-foreground"
      style={{ background: item.themeColor ? `${item.themeColor}22` : "hsl(var(--background))" }}
    >
      {item.screenshotUrl || item.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.screenshotUrl || item.iconUrl || ""}
          alt=""
          className="max-h-[55%] w-auto rounded-md border border-border object-contain"
        />
      ) : null}
      <p className="text-xs font-semibold">{item.title}</p>
      {blocked && (
        <p className="px-3 text-[9px] leading-snug text-muted-foreground">
          This creation can&apos;t be previewed here. Save it to install later.
        </p>
      )}
    </div>
  );
}
