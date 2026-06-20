"use client";

import { forwardRef } from "react";

// The R1 screen is 240×282 px. This renders a bounded device frame at that exact
// size (optionally scaled up for legibility) holding the creation iframe — NOT
// the full-viewport .r1a-viewport takeover used by the on-device routes.
const SCREEN_W = 240;
const SCREEN_H = 282;

type Props = {
  src: string;
  zoom: number;
  onLoad?: () => void;
};

export const R1DeviceFrame = forwardRef<HTMLIFrameElement, Props>(
  function R1DeviceFrame({ src, zoom, onLoad }, ref) {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* Reserve the scaled footprint so surrounding layout doesn't overlap. */}
        <div
          style={{ width: SCREEN_W * zoom, height: SCREEN_H * zoom }}
          className="relative"
        >
          <div
            className="overflow-hidden rounded-[28px] border-[6px] border-neutral-800 bg-black shadow-xl"
            style={{
              width: SCREEN_W,
              height: SCREEN_H,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            {src ? (
              <iframe
                ref={ref}
                src={src}
                width={SCREEN_W}
                height={SCREEN_H}
                onLoad={onLoad}
                title="R1 creation preview"
                allow="camera; microphone; accelerometer; autoplay"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{ border: 0, display: "block" }}
              />
            ) : (
              <div
                className="flex items-center justify-center text-center text-xs text-neutral-500"
                style={{ width: SCREEN_W, height: SCREEN_H }}
              >
                Enter a creation URL above to preview it.
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          240 × 282 · R1 screen · {zoom}×
        </p>
      </div>
    );
  },
);
