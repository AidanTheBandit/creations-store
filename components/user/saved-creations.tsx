"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QrCode } from "lucide-react";

type SavedCreation = {
  id: string;
  title: string;
  slug: string;
  url: string;
  description: string | null;
  iconUrl: string | null;
  themeColor: string | null;
  author: string | null;
  proxyCode: string | null;
};

// Dashboard "Saved" grid. Each card opens an install QR (proxy_code → /go/[code]),
// reusing the same QR payload shape as creation-actions.tsx.
export function SavedCreations({ creations }: { creations: SavedCreation[] }) {
  const [active, setActive] = useState<SavedCreation | null>(null);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  if (creations.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <QrCode className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No saved creations yet. Save creations from the R1 to install them here.
        </p>
      </div>
    );
  }

  const qrData = (c: SavedCreation) => {
    const proxyUrl = c.proxyCode ? `${siteUrl}/go/${c.proxyCode}` : c.url;
    return JSON.stringify({
      title: c.title,
      url: proxyUrl,
      description: c.description || "",
      iconUrl: c.iconUrl || "",
      themeColor: c.themeColor || "",
      author: c.author || "",
      installConfirmUrl: c.proxyCode ? `${siteUrl}/api/analytics/install` : undefined,
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {creations.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c)}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/30"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg"
              style={{ backgroundColor: c.themeColor || "hsl(var(--muted))" }}
            >
              {c.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.iconUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-white">
                  {c.title[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{c.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {c.author || "Creation"}
              </p>
            </div>
            <QrCode className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-sm">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle>Install {active.title}</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="rounded-lg bg-white p-3">
                  <QRCodeSVG value={qrData(active)} size={240} />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Scan with your R1 camera to install.
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
