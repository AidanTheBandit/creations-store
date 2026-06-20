"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  CircleDot,
  Mic,
  Send,
  Trash2,
  AlertTriangle,
  Globe,
  Terminal,
  Gamepad2,
  MessageSquareCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { R1DeviceFrame } from "@/components/devtools/r1-device-frame";

// Hardware events the r1-create SDK listens for on window.
type HwEvent =
  | "scrollUp"
  | "scrollDown"
  | "sideClick"
  | "longPressStart"
  | "longPressEnd";

const ZOOMS = [1, 1.5, 2];

type LogEntry = { dir: "out" | "in" | "sys"; text: string; t: string };

// A labelled control panel that matches the site's card vocabulary.
function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function R1Emulator() {
  const [urlInput, setUrlInput] = useState("");
  const [src, setSrc] = useState("");
  const [zoom, setZoom] = useState(1.5);
  const [crossOrigin, setCrossOrigin] = useState(false);
  const [mockResponse, setMockResponse] = useState(
    '{ "message": "Hello from the emulator" }',
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const appendLog = useCallback((dir: LogEntry["dir"], text: string) => {
    // Timestamp client-side at event time; harmless for a dev console.
    const t = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-199), { dir, text, t }]);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  // Receive outbound payloads relayed by the opt-in bridge shim (cross-origin
  // creations) via window.postMessage.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data;
      if (!d || d.__r1emu !== true || d.type !== "outbound") return;
      appendLog("out", `${d.channel}: ${d.msg}`);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [appendLog]);

  const loadUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setLogs([]);
    setCrossOrigin(false);
    setSrc(trimmed);
  };

  // On iframe load, try to inject mock globals directly (same-origin). If the
  // browser blocks contentWindow access, the creation is cross-origin — fall
  // back to the postMessage bridge and warn the user.
  const handleFrameLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const win = iframe.contentWindow as unknown as Record<string, unknown>;
      // Touching location.href throws for cross-origin frames.
      void (iframe.contentWindow as Window).location.href;
      const relay = (name: string) => ({
        postMessage: (msg: string) => appendLog("out", `${name}: ${msg}`),
      });
      win.PluginMessageHandler = relay("PluginMessageHandler");
      win.CreationVoiceHandler = relay("CreationVoiceHandler");
      win.closeWebView = relay("closeWebView");
      setCrossOrigin(false);
      appendLog("sys", "Same-origin creation — device APIs injected directly.");
    } catch {
      setCrossOrigin(true);
      appendLog(
        "sys",
        "Cross-origin creation — using postMessage bridge (requires the shim).",
      );
    }
  }, [appendLog]);

  const sendEvent = (event: HwEvent, detail?: unknown) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    if (crossOrigin) {
      iframe.contentWindow.postMessage(
        { __r1emu: true, type: "event", event, detail },
        "*",
      );
    } else {
      try {
        iframe.contentWindow.dispatchEvent(new CustomEvent(event, { detail }));
      } catch {
        /* frame went away */
      }
    }
    appendLog("in", `event: ${event}`);
  };

  const injectResponse = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    let payload: unknown;
    try {
      payload = JSON.parse(mockResponse);
    } catch {
      payload = mockResponse;
    }
    if (crossOrigin) {
      iframe.contentWindow.postMessage(
        { __r1emu: true, type: "pluginMessage", payload },
        "*",
      );
    } else {
      try {
        const fn = (
          iframe.contentWindow as unknown as {
            onPluginMessage?: (d: unknown) => void;
          }
        ).onPluginMessage;
        if (typeof fn === "function") fn(payload);
        else appendLog("sys", "Creation has no window.onPluginMessage handler.");
      } catch {
        /* cross-origin */
      }
    }
    appendLog("in", `onPluginMessage: ${mockResponse}`);
  };

  const loaded = Boolean(src);

  return (
    <div className="space-y-6">
      {/* URL bar spans the full width — it's the entry point for everything. */}
      <div className="rounded-xl border border-border bg-card p-3 shadow">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              inputMode="url"
              placeholder="https://your-creation.example.com"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadUrl()}
              aria-label="Creation URL"
              className="pl-9"
            />
          </div>
          <Button onClick={loadUrl} className="sm:w-auto">
            Load creation
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,auto),1fr]">
        {/* Left: device frame in its own card */}
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 shadow">
          <R1DeviceFrame
            ref={iframeRef}
            src={src}
            zoom={zoom}
            onLoad={handleFrameLoad}
          />
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <span className="px-2 text-xs text-muted-foreground">Zoom</span>
            {ZOOMS.map((z) => (
              <Button
                key={z}
                size="sm"
                variant={zoom === z ? "secondary" : "ghost"}
                className="h-7 px-3"
                onClick={() => setZoom(z)}
              >
                {z}×
              </Button>
            ))}
          </div>
        </div>

        {/* Right: stacked control panels */}
        <div className="space-y-4">
          {crossOrigin && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Cross-origin creation</AlertTitle>
              <AlertDescription>
                The screen size is accurate, but device APIs reach the creation
                only if it imports the emulator bridge shim (see the{" "}
                <a
                  href="/devtools"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Wiki
                </a>
                ). If the frame is blank, the site may forbid embedding
                (X-Frame-Options).
              </AlertDescription>
            </Alert>
          )}

          <Panel icon={Gamepad2} title="Hardware">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!loaded}
                onClick={() => sendEvent("scrollUp")}
              >
                <ChevronUp className="mr-1 h-4 w-4" /> Scroll up
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!loaded}
                onClick={() => sendEvent("scrollDown")}
              >
                <ChevronDown className="mr-1 h-4 w-4" /> Scroll down
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!loaded}
                onClick={() => sendEvent("sideClick")}
              >
                <CircleDot className="mr-1 h-4 w-4" /> Side click
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!loaded}
                onMouseDown={() => sendEvent("longPressStart")}
                onMouseUp={() => sendEvent("longPressEnd")}
                onMouseLeave={() => sendEvent("longPressEnd")}
              >
                <Mic className="mr-1 h-4 w-4" /> PTT (hold)
              </Button>
            </div>
          </Panel>

          <Panel icon={MessageSquareCode} title="Mock LLM response">
            <Textarea
              value={mockResponse}
              onChange={(e) => setMockResponse(e.target.value)}
              rows={3}
              className="mb-3 resize-none font-mono text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!loaded}
              onClick={injectResponse}
            >
              <Send className="mr-1 h-4 w-4" /> Inject onPluginMessage
            </Button>
          </Panel>

          <Panel
            icon={Terminal}
            title="Console"
            action={
              <Button
                variant="ghost"
                size="sm"
                className="h-7"
                onClick={() => setLogs([])}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear
              </Button>
            }
          >
            <div
              ref={logRef}
              className="h-52 overflow-y-auto rounded-lg bg-background/60 p-3 font-mono text-xs"
            >
              {logs.length === 0 ? (
                <p className="text-muted-foreground">
                  Load a creation, then fire events or inject a response.
                </p>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="flex gap-2 py-0.5">
                    <span className="shrink-0 text-muted-foreground/60">
                      {l.t}
                    </span>
                    <span
                      className={
                        l.dir === "out"
                          ? "shrink-0 text-primary"
                          : l.dir === "in"
                            ? "shrink-0 text-emerald-500"
                            : "shrink-0 text-muted-foreground"
                      }
                    >
                      {l.dir === "out" ? "↑" : l.dir === "in" ? "↓" : "•"}
                    </span>
                    <span className="break-all">{l.text}</span>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
