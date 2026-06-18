"use client";

import { useEffect, useState } from "react";
import { useFeed, useDeviceControls, type FeedItem } from "./use-feed";

const CARD_PITCH = 40; // px between rows
const FOCUS_Y = 56; // y where the focused row sits

// List mode: a vertical focus-scroller of recommended creations, styled to
// match rhythm's song-select (brand stripe, blurred backdrop, angled gradient
// cards with a glow on focus). Scroll wheel moves focus, side opens.
export function CreationList({
  linked,
  username,
  onOpen,
  onAccount,
}: {
  linked: boolean;
  username: string | null;
  onOpen: (index: number) => void;
  onAccount: () => void;
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

  const focused = items[focus];

  return (
    <div className="relative h-full w-full overflow-hidden bg-background font-sans text-white">
      <Backdrop item={focused} />

      <div className="relative flex h-full w-full flex-col">
        <BrandStripe />

        {/* Header */}
        <div className="flex h-6 shrink-0 items-center justify-between px-2">
          <span className="text-[11px] font-bold tracking-tight text-white">
            For You
          </span>
          <button
            onClick={onAccount}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] active:scale-95"
          >
            {linked ? `@${username}` : "Guest"}
          </button>
        </div>

        {loading ? (
          <Centered>Loading…</Centered>
        ) : error ? (
          <Centered>Couldn&apos;t load creations</Centered>
        ) : items.length === 0 ? (
          <Centered>No creations yet</Centered>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            <div
              className="absolute inset-x-0 will-change-transform"
              style={{
                transform: `translateY(${FOCUS_Y - focus * CARD_PITCH}px)`,
                transition: "transform 220ms cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {items.map((c, i) => {
                const delta = i - focus;
                const absDelta = Math.abs(delta);
                const isFocus = delta === 0;
                // Idle cards tuck slightly off-screen right, dimming with distance.
                const tuckPx = isFocus ? 0 : 6 + absDelta * 10;
                const opacity =
                  absDelta === 0 ? 1 : Math.max(0.25, 0.85 - absDelta * 0.15);
                return (
                  <button
                    key={c.id}
                    onClick={() => onOpen(i)}
                    className="absolute right-0 block will-change-transform focus:outline-none"
                    style={{
                      top: i * CARD_PITCH,
                      transform: `translateX(${tuckPx}px)`,
                      opacity,
                      transition:
                        "transform 220ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease",
                      zIndex: isFocus ? 10 : 1,
                    }}
                    aria-label={c.title}
                  >
                    <CreationRow item={c} focused={isFocus} showArt={absDelta <= 3} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreationRow({
  item,
  focused,
  showArt,
}: {
  item: FeedItem;
  focused: boolean;
  showArt: boolean;
}) {
  const theme = item.themeColor || "#fe5000";
  // Focused cards pick up the creation's theme color; idle rows stay neutral.
  const bg = focused
    ? `linear-gradient(90deg, ${theme} 0%, ${theme}99 100%)`
    : "linear-gradient(90deg, rgba(26,26,26,0.92) 0%, rgba(40,40,40,0.92) 100%)";
  return (
    <div
      className="flex h-[34px] w-[200px] items-center gap-2 pl-3 pr-1.5"
      style={{
        background: bg,
        clipPath: "polygon(8px 0, 100% 0, 100% 100%, 0 100%)",
        boxShadow: focused ? `0 0 12px 2px ${theme}66` : "0 1px 0 rgba(0,0,0,0.4)",
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <p
          className={`truncate text-[10px] font-bold leading-tight ${focused ? "text-white" : "text-white/85"}`}
        >
          {item.title}
        </p>
        <p
          className={`flex items-center gap-1 truncate text-[8px] leading-tight ${focused ? "text-white/85" : "text-white/55"}`}
        >
          <span className="truncate">
            {item.author || item.category?.name || "Creation"}
          </span>
          {item.avgRating != null && (
            <span className="shrink-0 text-yellow-300">★{item.avgRating}</span>
          )}
        </p>
      </div>
      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-sm bg-black/40">
        {showArt && item.iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.iconUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
    </div>
  );
}

// Blurred backdrop behind the list, from the focused creation's icon/shot.
function Backdrop({ item }: { item: FeedItem | undefined }) {
  const url = item?.screenshotUrl || item?.iconUrl || null;
  return (
    <div className="absolute inset-0 overflow-hidden">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "blur(18px) saturate(1.2)", transform: "scale(1.2)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF1F8F]/30 via-[#A864FF]/30 to-[#1F4A3F]/30" />
      )}
      <div className="absolute inset-0 bg-black/65" />
    </div>
  );
}

function BrandStripe() {
  return (
    <div className="flex h-[3px] w-full shrink-0">
      <div className="flex-1" style={{ background: "#FF1F8F" }} />
      <div className="flex-1" style={{ background: "#A864FF" }} />
      <div className="flex-1" style={{ background: "#1F4A3F" }} />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center text-[10px] text-white/60">
      {children}
    </div>
  );
}
