import jsQR from "jsqr";

export type LinkPayload = { v: number; token: string; endpoint: string };

// Continuously sample a video element and resolve when a QR with the link
// payload appears. Caller stops the underlying camera stream after this
// resolves or rejects. (Same scanner the r1a_client uses.)
export function scanLinkPayload(
  video: HTMLVideoElement,
  signal: AbortSignal,
): Promise<LinkPayload> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      reject(new Error("canvas_unsupported"));
      return;
    }

    let raf = 0;
    const stop = () => cancelAnimationFrame(raf);
    signal.addEventListener("abort", () => {
      stop();
      reject(new DOMException("aborted", "AbortError"));
    });

    const tick = () => {
      if (signal.aborted) return;
      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        raf = requestAnimationFrame(tick);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(img.data, img.width, img.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        try {
          const parsed = JSON.parse(code.data) as LinkPayload;
          if (
            parsed &&
            parsed.v === 1 &&
            typeof parsed.token === "string" &&
            typeof parsed.endpoint === "string"
          ) {
            resolve(parsed);
            return;
          }
        } catch {
          // not our payload — keep scanning
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
  });
}
