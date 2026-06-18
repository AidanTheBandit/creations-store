"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrCreateDeviceId, getAuthHeaders } from "@/lib/creation/device-id";
import { scanLinkPayload } from "@/lib/creation/scan-qr";
import { CreationList } from "./creation-list";
import { Experience } from "./experience";

type CreationUser = { id: string; username: string; avatar_url: string | null };

type AppState =
  | { kind: "booting" }
  | { kind: "unlinked" }
  | { kind: "scanning" }
  | { kind: "linking" }
  | { kind: "ready"; user: CreationUser | null } // null = guest
  | { kind: "error"; message: string };

// Linking endpoint is always same-origin; never trust a scanned URL.
const LINK_PATH = "/api/link-r1";

export function CreationApp() {
  const [state, setState] = useState<AppState>({ kind: "booting" });
  // Experience (full-screen iframe) is the default, TikTok-style. Scrolling up
  // past the first item drops to the list overview; opening a list row returns.
  const [mode, setMode] = useState<"list" | "experience">("experience");
  const [startIndex, setStartIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);

  // ── Boot: ask the server who this device is ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        getOrCreateDeviceId();
        const res = await fetch("/api/me", { headers: getAuthHeaders() });
        if (cancelled) return;
        if (res.status === 401) {
          setState({ kind: "unlinked" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", message: `Server returned ${res.status}` });
          return;
        }
        const { user } = await res.json();
        setState({ kind: "ready", user });
      } catch (e) {
        if (cancelled) return;
        setState({ kind: "error", message: e instanceof Error ? e.message : "Boot failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopCamera = useCallback(() => {
    scanAbortRef.current?.abort();
    scanAbortRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startScan = useCallback(async () => {
    setState({ kind: "scanning" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? `Camera: ${e.message}` : "Camera permission denied",
      });
      return;
    }
    streamRef.current = stream;
    await new Promise((r) => requestAnimationFrame(r));
    const video = videoRef.current;
    if (!video) {
      stopCamera();
      setState({ kind: "error", message: "Video element missing" });
      return;
    }
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    try {
      await video.play();
    } catch {
      /* some browsers reject .play() but still render */
    }

    const ac = new AbortController();
    scanAbortRef.current = ac;
    try {
      const payload = await scanLinkPayload(video, ac.signal);
      stopCamera();

      // SECURITY: ignore the QR's endpoint; the link route is same-origin.
      let ok = false;
      try {
        const u = new URL(payload.endpoint, window.location.origin);
        ok = u.origin === window.location.origin && u.pathname === LINK_PATH;
      } catch {
        ok = false;
      }
      if (!ok) {
        setState({ kind: "error", message: "Untrusted pairing QR" });
        return;
      }

      setState({ kind: "linking" });
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(LINK_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: payload.token, device_id: deviceId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ kind: "error", message: body.error || `Link failed (${res.status})` });
        return;
      }
      // Refetch identity (the boondit_cs_dt cookie is now set).
      const meRes = await fetch("/api/me", { headers: getAuthHeaders() });
      const { user } = await meRes.json().catch(() => ({ user: null }));
      setState({ kind: "ready", user });
    } catch (e) {
      stopCamera();
      if ((e as DOMException).name === "AbortError") {
        setState({ kind: "unlinked" });
        return;
      }
      setState({ kind: "error", message: e instanceof Error ? e.message : "Scan failed" });
    }
  }, [stopCamera]);

  const cancelScan = useCallback(() => {
    stopCamera();
    setState({ kind: "unlinked" });
  }, [stopCamera]);

  const openExperience = useCallback((index: number) => {
    setStartIndex(index);
    setMode("experience");
  }, []);
  const backToList = useCallback(() => setMode("list"), []);
  // Logout from the device client: the cookie was already cleared server-side
  // by /api/unlink-r1; drop to the unlinked screen.
  const handleLogout = useCallback(() => {
    setMode("experience");
    setStartIndex(0);
    setState({ kind: "unlinked" });
  }, []);

  // ─── Render ───────────────────────────────────────────────
  if (state.kind === "booting") {
    return <Screen><p className="text-xs opacity-60">Loading…</p></Screen>;
  }

  if (state.kind === "unlinked") {
    return (
      <Screen>
        <h1 className="mb-1 text-base font-bold text-primary">Creations</h1>
        <p className="mb-3 px-2 text-[10px] leading-snug text-muted-foreground">
          Link your Boondit account to save creations, or browse as a guest.
        </p>
        <div className="flex gap-1.5">
          <button
            onClick={startScan}
            className="rounded bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground active:scale-95"
          >
            Link
          </button>
          <button
            onClick={() => setState({ kind: "ready", user: null })}
            className="rounded bg-white/10 px-3 py-1.5 text-[10px] text-white active:scale-95"
          >
            Guest
          </button>
        </div>
      </Screen>
    );
  }

  if (state.kind === "scanning") {
    return (
      <div className="relative h-full w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
          disablePictureInPicture
          controls={false}
        />
        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1.5">
          <p className="rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
            Point camera at the pairing QR
          </p>
          <button
            onClick={cancelScan}
            className="rounded bg-white/10 px-3 py-1 text-[10px] text-white active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "linking") {
    return <Screen><p className="text-xs opacity-60">Linking…</p></Screen>;
  }

  if (state.kind === "error") {
    return (
      <Screen>
        <p className="mb-1 text-[11px] font-semibold text-destructive">Error</p>
        <p className="mb-3 px-3 text-center text-[10px] text-muted-foreground">{state.message}</p>
        <button
          onClick={() => setState({ kind: "unlinked" })}
          className="rounded bg-muted px-3 py-1 text-[10px] text-foreground active:scale-95"
        >
          Try again
        </button>
      </Screen>
    );
  }

  // ready
  const linked = !!state.user;
  return mode === "list" ? (
    <CreationList
      linked={linked}
      username={state.user?.username ?? null}
      onOpen={openExperience}
    />
  ) : (
    <Experience
      linked={linked}
      startIndex={startIndex}
      onExit={backToList}
      onLogout={handleLogout}
    />
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-background p-3 text-center font-sans text-foreground">
      {children}
    </div>
  );
}
