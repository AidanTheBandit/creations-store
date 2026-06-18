"use client";

import { useEffect, useState } from "react";
import { useFeed, useDeviceControls } from "./use-feed";

const CARD_PITCH = 52; // px between rows
const FOCUS_Y = 70; // y where the focused row sits

// List mode: a vertical focus-scroller of recommended creations. Scroll wheel
// moves focus, side button opens the focused creation in Experience mode.
export function CreationList({
  linked,
  username,
  onOpen,
}: {
  linked: boolean;
  username: string | null;
  onOpen: (index: number) => void;
}) {
  const { items, loading, error, maybePrefetch } = useFeed();
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    maybePrefetch(focus);
  }, [focus, maybePrefetch]);

  useDeviceControls({
    onScroll: (dir) =>
      setFocus((i) => Math.max(0, Math.min(items.length - 1, i + (dir === "down" ? 1 : -1)))),
    onSide: () => {
      if (items[focus]) onOpen(focus);
    },
    active: items.length > 0,
  });

  return (
    <div className="relative h-full w-full overflow-hidden bg-background font-sans text-foreground">
      {/* Header */}
      <div className="flex h-8 shrink-0 items-center justify-between px-3">
        <span className="text-xs font-bold text-primary">For You</span>
        <span className="text-[9px] text-muted-foreground">
          {linked ? `@${username}` : "Guest"}
        </span>
      </div>

      {loading ? (
        <Centered>Loading…</Centered>
      ) : error ? (
        <Centered>Couldn&apos;t load creations</Centered>
      ) : items.length === 0 ? (
        <Centered>No creations yet</Centered>
      ) : (
        <div className="relative h-[calc(100%-2rem)] overflow-hidden">
          <div
            className="absolute inset-x-0 will-change-transform"
            style={{
              transform: `translateY(${FOCUS_Y - focus * CARD_PITCH}px)`,
              transition: "transform 200ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {items.map((c, i) => {
              const delta = Math.abs(i - focus);
              const isFocus = i === focus;
              const opacity = delta === 0 ? 1 : Math.max(0.3, 0.85 - delta * 0.18);
              return (
                <button
                  key={c.id}
                  onClick={() => onOpen(i)}
                  className="absolute inset-x-2 flex items-center gap-2 rounded-lg px-2 text-left will-change-transform"
                  style={{
                    top: i * CARD_PITCH,
                    height: CARD_PITCH - 8,
                    opacity,
                    background: isFocus
                      ? `${c.themeColor || "#fe5000"}22`
                      : "transparent",
                    border: isFocus
                      ? `1px solid ${c.themeColor || "#fe5000"}88`
                      : "1px solid transparent",
                    transition: "opacity 160ms ease, background 160ms ease, border 160ms ease",
                  }}
                >
                  <div
                    className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted"
                    style={{ background: c.themeColor || undefined }}
                  >
                    {c.iconUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.iconUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold leading-tight">
                      {c.title}
                    </p>
                    <p className="truncate text-[9px] text-muted-foreground">
                      {c.author || c.category?.name || "Creation"}
                      {c.avgRating != null ? ` · ★${c.avgRating}` : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100%-2rem)] items-center justify-center text-[10px] text-muted-foreground">
      {children}
    </div>
  );
}
