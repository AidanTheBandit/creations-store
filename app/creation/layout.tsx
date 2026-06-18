import type { Metadata, Viewport } from "next";

// The R1 WebView opens /creation directly at 240×282px. We render the client
// inside a fixed 240×282 canvas scaled to fill the viewport (reusing the
// .r1a-viewport/.r1a-canvas classes already defined in globals.css for the R1
// surface). Mirrors rhythm's app/creation/layout.tsx.

export const metadata: Metadata = {
  title: "Boondit Creations",
};

export const viewport: Viewport = {
  width: 240,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function CreationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="r1a-viewport">
      <div className="r1a-canvas">{children}</div>
    </div>
  );
}
