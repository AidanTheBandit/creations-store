"use client";

import { forwardRef } from "react";

// The R1 screen renders at 240×282 px. The bezel image (640×631) is the real
// device art; its black screen cutout occupies the rectangle below, measured
// directly from the asset. We position the live creation to fill the cutout
// width and center it vertically — the iframe keeps the true 240×282 aspect, so
// a slim black letterbox shows top/bottom (the cutout is a touch taller than the
// device's screen aspect), exactly like a real device.
const SCREEN_W = 240;
const SCREEN_H = 282;

const FRAME_RATIO = 640 / 631; // source image w/h
// Screen cutout as fractions of the frame image (left/top/width/height),
// measured from the asset. The screen has rounded corners (~38px in the 640px
// source ≈ 5.9% of frame width), so we round the overlay to match — a square
// overlay would overhang the orange body at each corner.
const CUTOUT_LEFT = 0.0328;
const CUTOUT_TOP = 0.0365;
const CUTOUT_W = 0.6875;
const CUTOUT_H = 0.9271;
const CUTOUT_RADIUS = 0.0594; // as fraction of frame width

type Props = {
  src: string;
  zoom: number;
  onLoad?: () => void;
};

export const R1DeviceFrame = forwardRef<HTMLIFrameElement, Props>(
  function R1DeviceFrame({ src, zoom, onLoad }, ref) {
    // Size the frame so the cutout width equals the scaled screen width.
    const screenW = SCREEN_W * zoom;
    const frameW = screenW / CUTOUT_W;
    const frameH = frameW / FRAME_RATIO;

    const cutoutW = CUTOUT_W * frameW;
    const cutoutH = CUTOUT_H * frameH;

    return (
      <div className="relative" style={{ width: frameW, height: frameH }}>
        {/* Device bezel art (behind). Its screen area is black. */}
        <img
          src="/media/r1/emulator-frame.webp"
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          draggable={false}
        />

        {/* Live creation, positioned over the screen cutout. Rounded corners
            match the device screen so black doesn't overhang the orange body. */}
        <div
          className="absolute z-10 flex items-center justify-center overflow-hidden bg-black"
          style={{
            left: `${CUTOUT_LEFT * 100}%`,
            top: `${CUTOUT_TOP * 100}%`,
            width: cutoutW,
            height: cutoutH,
            borderRadius: CUTOUT_RADIUS * frameW,
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
              style={{
                border: 0,
                display: "block",
                width: SCREEN_W,
                height: SCREEN_H,
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                flex: "none",
              }}
            />
          ) : (
            <span className="px-3 text-center text-xs text-neutral-500">
              Enter a creation URL to preview it.
            </span>
          )}
        </div>
      </div>
    );
  },
);
