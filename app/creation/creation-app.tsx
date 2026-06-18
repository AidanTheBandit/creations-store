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
  // Account overlay — reachable from every screen (incl. the empty feed state)
  // so a user with a corrupted/expired key is never trapped without a logout.
  const [showAccount, setShowAccount] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
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
  // Logout from the device client. Clears the boondit_cs_dt cookie server-side
  // (works even when the key is corrupt — it's an unconditional cookie clear),
  // then drops to the unlinked screen.
  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/unlink-r1", { method: "POST" });
    } catch {
      /* best effort — the cookie clear is the important part */
    }
    setLoggingOut(false);
    setShowAccount(false);
    setMode("experience");
    setStartIndex(0);
    setState({ kind: "unlinked" });
  }, []);

  // ─── Render ───────────────────────────────────────────────
  // Account overlay takes precedence over everything once opened, so it's
  // reachable from any "ready" sub-screen (list, experience, empty feed).
  if (showAccount && state.kind === "ready") {
    return (
      <AccountScreen
        user={state.user}
        loggingOut={loggingOut}
        onBack={() => setShowAccount(false)}
        onLogout={handleLogout}
        onLink={() => {
          setShowAccount(false);
          startScan();
        }}
      />
    );
  }

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
      onAccount={() => setShowAccount(true)}
    />
  ) : (
    <Experience
      linked={linked}
      startIndex={startIndex}
      onExit={backToList}
      onAccount={() => setShowAccount(true)}
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

// Dedicated account screen (mirrors rhythm). Always reachable via the header
// account button, so logging out / re-linking never requires a working key.
function AccountScreen({
  user,
  loggingOut,
  onBack,
  onLogout,
  onLink,
}: {
  user: CreationUser | null;
  loggingOut: boolean;
  onBack: () => void;
  onLogout: () => void;
  onLink: () => void;
}) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-background font-sans text-white">
      {/* Blurred avatar backdrop — same treatment as rhythm's profile. */}
      <div className="absolute inset-0 overflow-hidden">
        {user?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(18px) saturate(1.2)", transform: "scale(1.2)" }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF1F8F]/30 via-[#A864FF]/30 to-[#1F4A3F]/30" />
        )}
        <div className="absolute inset-0 bg-black/65" />
      </div>

      <div className="relative flex h-full w-full flex-col">
        <div className="flex h-[3px] w-full shrink-0">
          <div className="flex-1" style={{ background: "#FF1F8F" }} />
          <div className="flex-1" style={{ background: "#A864FF" }} />
          <div className="flex-1" style={{ background: "#1F4A3F" }} />
        </div>

        <div className="flex h-6 shrink-0 items-center justify-between px-2">
          <button
            onClick={onBack}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] active:scale-95"
          >
            ← Back
          </button>
          <span className="text-[10px] font-bold tracking-tight">Account</span>
          <span className="w-9" />
        </div>

        <div className="flex flex-1 flex-col items-center px-3 pb-2 pt-2 text-center">
          {/* Avatar */}
          <div className="relative mb-1.5 h-[72px] w-[72px] overflow-hidden rounded-md border border-white/15 bg-black/40">
            {user?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[26px] font-bold text-white/30">
                {(user?.username?.[0] || "?").toUpperCase()}
              </div>
            )}
          </div>

          {user ? (
            <>
              <p className="truncate text-[12px] font-bold">@{user.username}</p>
              <p className="text-[8px] uppercase tracking-wide text-white/50">
                Linked to this R1
              </p>
              <button
                onClick={onLogout}
                disabled={loggingOut}
                className="mt-3 rounded bg-red-500/90 px-4 py-1.5 text-[11px] font-semibold text-white active:scale-95 disabled:opacity-60"
              >
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
              <p className="mt-auto text-[8px] text-white/50">
                Manage your profile on the web.
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] font-bold">Guest</p>
              <p className="mt-1 px-2 text-center text-[8px] leading-tight text-white/70">
                Link your Boondit account to save creations across devices.
              </p>
              <button
                onClick={onLink}
                className="mt-3 rounded bg-primary px-4 py-1.5 text-[11px] font-semibold text-primary-foreground active:scale-95"
              >
                Link account
              </button>
              <p className="mt-auto text-[8px] text-white/50">
                Sign up on the main site first.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
