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
        const fn = (iframe.contentWindow as unknown as {
          onPluginMessage?: (d: unknown) => void;
        }).onPluginMessage;
        if (typeof fn === "function") fn(payload);
        else appendLog("sys", "Creation has no window.onPluginMessage handler.");
      } catch {
        /* cross-origin */
      }
    }
    appendLog("in", `onPluginMessage: ${mockResponse}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[auto,1fr]">
      {/* Left: device frame + URL bar */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="url"
            inputMode="url"
            placeholder="https://your-creation.example.com"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUrl()}
            aria-label="Creation URL"
          />
          <Button onClick={loadUrl}>Load</Button>
        </div>

        <R1DeviceFrame
          ref={iframeRef}
          src={src}
          zoom={zoom}
          onLoad={handleFrameLoad}
        />

        <div className="flex items-center justify-center gap-1">
          <span className="mr-1 text-xs text-muted-foreground">Zoom</span>
          {ZOOMS.map((z) => (
            <Button
              key={z}
              size="sm"
              variant={zoom === z ? "secondary" : "ghost"}
              onClick={() => setZoom(z)}
            >
              {z}×
            </Button>
          ))}
        </div>
      </div>

      {/* Right: controls + console */}
      <div className="space-y-4">
        {crossOrigin && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cross-origin creation</AlertTitle>
            <AlertDescription>
              The screen size is accurate, but device APIs can only be injected
              into same-origin creations or those that import the emulator bridge
              shim (see the Wiki tab). If the frame is blank, the site may forbid
              embedding (X-Frame-Options).
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Hardware
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => sendEvent("scrollUp")}>
              <ChevronUp className="mr-1 h-4 w-4" /> Scroll up
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendEvent("scrollDown")}
            >
              <ChevronDown className="mr-1 h-4 w-4" /> Scroll down
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => sendEvent("sideClick")}
            >
              <CircleDot className="mr-1 h-4 w-4" /> Side click
            </Button>
            <Button
              variant="outline"
              size="sm"
              onMouseDown={() => sendEvent("longPressStart")}
              onMouseUp={() => sendEvent("longPressEnd")}
              onMouseLeave={() => sendEvent("longPressEnd")}
            >
              <Mic className="mr-1 h-4 w-4" /> PTT (hold)
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mock LLM response
          </p>
          <Textarea
            value={mockResponse}
            onChange={(e) => setMockResponse(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
          <Button variant="outline" size="sm" onClick={injectResponse}>
            <Send className="mr-1 h-4 w-4" /> Inject onPluginMessage
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Console
            </p>
            <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
              <Trash2 className="mr-1 h-4 w-4" /> Clear
            </Button>
          </div>
          <div
            ref={logRef}
            className="h-48 overflow-y-auto rounded-md border bg-muted/25 p-3 font-mono text-xs"
          >
            {logs.length === 0 ? (
              <p className="text-muted-foreground">
                Load a creation, then fire events or inject a response.
              </p>
            ) : (
              logs.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-muted-foreground/60">{l.t}</span>
                  <span
                    className={
                      l.dir === "out"
                        ? "text-primary"
                        : l.dir === "in"
                          ? "text-emerald-500"
                          : "text-muted-foreground"
                    }
                  >
                    {l.dir === "out" ? "↑" : l.dir === "in" ? "↓" : "•"}
                  </span>
                  <span className="break-all">{l.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
