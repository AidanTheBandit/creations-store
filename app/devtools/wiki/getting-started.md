## What is an R1 creation?

A **creation** is a web app (HTML/CSS/JS) that runs inside the Rabbit R1's **Android WebView**. RabbitOS launches your creation full-screen on the device's small portrait display. There is no native toolchain — if it runs in a browser, it can run on the R1, as long as it respects the device's size and hardware constraints.

The R1 exposes its hardware (scroll wheel, side button, camera, microphone, speaker, accelerometer) and its assistant (LLM, text-to-speech, web search) to your creation through a thin bridge of `window` events and global objects. The [`r1-create`](https://github.com/AidanTheBandit/R1-create.js) SDK wraps that bridge in an ergonomic API.

> **Tip:** Use the **Emulator** tab to load your creation at the exact device size and fire hardware events at it before you ever flash it to a device.

## Getting started with the r1-create SDK

Install the SDK:

```bash
npm install r1-create
```

Initialize device controls and listen for hardware:

```js
import { deviceControls } from "r1-create";

deviceControls.init({
  scrollWheelEnabled: true,
  sideButtonEnabled: true,
  keyboardFallback: true, // arrow keys / space on desktop for testing
});

deviceControls.on("scrollWheel", ({ direction }) => {
  // direction is "up" or "down" — relative deltas, not absolute position
  console.log("scroll", direction);
});

deviceControls.on("sideButton", () => {
  console.log("PTT / side button pressed");
});
```

The SDK works on the desktop too (with the keyboard fallback), so you can develop in a normal browser and test device behavior in the Emulator tab here.

## Display constraints

- **Resolution: 240 × 282 px, portrait.** Design directly in device pixels.
- **No auto-rotate.** The screen never rotates. If you want a landscape layout, rotate your own content with `transform: rotate(90deg)` — the device will not do it for you.
- Keep tap targets large and text legible at this size. Assume a single column.

## Hardware APIs

- **Scroll wheel** — emits relative `up` / `down` events. There is no absolute position; integrate the deltas into your own state.
- **Side button (PTT)** — *hold-aware*. Use **hold-only** mechanics. ⚠️ **Eight rapid taps trigger a device shutdown**, so never build anything that relies on rapid tapping of the side button.
- **Camera** — front and back. `r1.camera.start({ facingMode })`, `capturePhoto(w, h)`, `stop()`.
- **Microphone** — `startRecording()` / `stopRecording()`.
- **Speaker** — `r1.speaker.play(blob)`, `playTone(freq, ms)`.
- **Accelerometer** — start a callback to receive x/y/z tilt.

## LLM, voice & messaging

Your creation talks to the assistant by posting messages to the host and receiving replies on a global callback.

- **Outbound** — the SDK calls the global `PluginMessageHandler.postMessage(JSON.stringify(payload))` to ask the LLM, speak text, or search the web. Voice capture is toggled with `CreationVoiceHandler.postMessage('start' | 'stop')`, and `closeWebView.postMessage('')` exits the creation.
- **Inbound** — responses arrive via `window.onPluginMessage = (data) => { ... }`. Assign this handler (or use the SDK's `onMessage`) to receive LLM answers, transcripts, and tool results.

```js
import { messaging } from "r1-create";

messaging.onMessage((data) => {
  // { message, ... } from the assistant
});

messaging.sendMessage("Summarize today's weather");
```

## Storage

Two namespaces, both auto Base64-encoded:

- `r1.storage.secure` — encrypted storage (Android M+). Use for credentials and device IDs.
- `r1.storage.plain` — ordinary key/value storage.

```js
await r1.storage.secure.setItem("token", value);
const token = await r1.storage.secure.getItem("token");
```

## Performance budget

The R1 is a low-power device (MediaTek MT6765, 4 GB RAM — see the **Hardware** tab). Treat it like a budget phone:

- **Avoid 60 fps full-screen redraws** when idle — they drain battery and heat the device.
- Animate with **`transform` and `opacity` only**; never animate layout-triggering properties during interaction.
- Keep bundles small and lazy-load anything heavy.
- Cache aggressively; the network and CPU are both limited.

## Using the Emulator (and getting past "blocked" creations)

The **Emulator** tab loads your creation in an iframe at the exact device size and lets you fire hardware events at it. Two things can stop a creation from working in the emulator — here's how to get past each.

### 1. The frame is blank — the site refuses to be embedded

The emulator loads your creation in an `<iframe>`. If your creation's server sends `X-Frame-Options: DENY`/`SAMEORIGIN` or a CSP `frame-ancestors` directive that excludes this origin, the browser **refuses to render it** and you get a blank screen. Fixes:

- **Allow framing from the store.** Remove `X-Frame-Options` (or set it to allow this origin) and set a CSP that permits it, e.g. `Content-Security-Policy: frame-ancestors https://creations.boondit.site;`. This is the cleanest fix and is safe — your creation already runs inside the R1's WebView, which frames it too.
- **Test against a deploy preview / localhost.** Point the emulator at a build whose headers you control (a Vercel/Netlify preview, or `http://localhost:<port>` while developing). Same-origin localhost also unlocks direct device-API injection (see below).
- **Static hosts** (GitHub Pages, most CDNs) don't send `X-Frame-Options` by default, so they frame fine.

### 2. The screen renders, but hardware/LLM events don't reach it

Browser security stops the emulator from injecting the SDK globals into a **cross-origin** page. When your creation is served from another origin, the screen size is accurate but the scroll wheel, side button, and `onPluginMessage` won't fire — unless your creation opts in to the bridge.

**Bypass: import the emulator bridge shim.** Add this once, early in your creation (it's a no-op on a real device and outside the emulator), and the emulator can drive your creation fully even cross-origin:

```js
// r1-emulator-bridge.js — enables full device-API simulation in the Boondit emulator
(function () {
  if (window.parent === window) return; // only inside an emulator iframe
  var EVENTS = ["scrollUp", "scrollDown", "sideClick", "longPressStart", "longPressEnd"];
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.__r1emu !== true) return;
    if (d.type === "event" && EVENTS.indexOf(d.event) !== -1) {
      window.dispatchEvent(new CustomEvent(d.event, { detail: d.detail }));
    } else if (d.type === "pluginMessage" && typeof window.onPluginMessage === "function") {
      window.onPluginMessage(d.payload);
    }
  });
  function relay(name) {
    return { postMessage: function (msg) {
      window.parent.postMessage({ __r1emu: true, type: "outbound", channel: name, msg: msg }, "*");
    } };
  }
  window.PluginMessageHandler = relay("PluginMessageHandler");
  window.CreationVoiceHandler = relay("CreationVoiceHandler");
  window.closeWebView = relay("closeWebView");
})();
```

With the shim in place, the emulator relays its control-panel events (scroll, side button, PTT, mock LLM responses) to your creation, and your creation's outbound `PluginMessageHandler` / voice calls show up in the emulator console. Same-origin creations (localhost during dev, or anything served from this store) don't need the shim — the emulator injects the globals directly.

> The full shim is always available in the **Copy for AI** blob and at [`/devtools/llms.txt`](/devtools/llms.txt).

## Next steps

Open the **Emulator** tab to load your creation URL at 240 × 282 and dispatch scroll / side-button events at it. If you build with an AI coding assistant, use the **Copy for AI** button or fetch [`/devtools/llms.txt`](/devtools/llms.txt) to give it everything on this page as context.
