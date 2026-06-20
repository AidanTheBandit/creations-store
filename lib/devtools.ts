import { readFile } from "node:fs/promises";
import path from "node:path";

// Wiki markdown lives as plain .md under app/devtools/wiki so the same source
// feeds the rendered Wiki tab, the /devtools/llms.txt endpoint, and the
// "Copy for AI" blob — docs can never drift between those surfaces.
const WIKI_DIR = path.join(process.cwd(), "app", "devtools", "wiki");
const WIKI_FILES = ["getting-started.md"];

export async function getWikiMarkdown(): Promise<string> {
  const parts = await Promise.all(
    WIKI_FILES.map((f) => readFile(path.join(WIKI_DIR, f), "utf8")),
  );
  return parts.join("\n\n---\n\n");
}

// The opt-in bridge shim a creation can import so the emulator can drive its
// device APIs even when served cross-origin. The emulator relays hardware
// events and LLM responses via window.postMessage; this shim re-dispatches them
// as the real SDK events / globals the r1-create SDK already listens for.
export const EMULATOR_BRIDGE_SHIM = `// r1-emulator-bridge.js — import this in your creation to enable full device
// API simulation in the Boondit R1 Emulator when served from another origin.
(function () {
  if (window.parent === window) return; // only inside the emulator iframe
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
  // Forward the creation's outbound LLM/voice calls back to the emulator console.
  function relay(name) {
    return { postMessage: function (msg) { window.parent.postMessage({ __r1emu: true, type: "outbound", channel: name, msg: msg }, "*"); } };
  }
  window.PluginMessageHandler = relay("PluginMessageHandler");
  window.CreationVoiceHandler = relay("CreationVoiceHandler");
  window.closeWebView = relay("closeWebView");
})();`;

// Condensed API/spec reference appended to the AI blob so an assistant has the
// exact bridge contract, not just prose.
export const AI_REFERENCE = `## r1-create bridge contract (reference)

Hardware events (dispatched on \`window\` as CustomEvent): \`scrollUp\`, \`scrollDown\`, \`sideClick\`, \`longPressStart\`, \`longPressEnd\`.

Outbound globals the SDK calls:
- \`PluginMessageHandler.postMessage(JSON.stringify(payload))\` — LLM ask / speak / web search.
- \`CreationVoiceHandler.postMessage('start' | 'stop')\` — voice capture.
- \`closeWebView.postMessage('')\` — exit the creation.

Inbound: assign \`window.onPluginMessage = (data) => { ... }\` to receive replies.

Device: 240×282 portrait, no auto-rotate. SoC MediaTek MT6765, 4GB RAM, Android WebView. Side button: hold-only (8 rapid taps shuts the device down). Scroll wheel: relative up/down. Storage: \`r1.storage.secure\` (Android M+) and \`r1.storage.plain\`, Base64-encoded.

## Emulator bridge shim

Import this in a cross-origin creation to enable full device-API simulation in the emulator:

\`\`\`js
${EMULATOR_BRIDGE_SHIM}
\`\`\``;

// Full self-contained markdown blob for AI assistants: the wiki + the reference
// + the shim. Used by both /devtools/llms.txt and the "Copy for AI" button.
export async function getAiDocsBlob(): Promise<string> {
  const wiki = await getWikiMarkdown();
  return `# Building R1 Creations — Boondit Dev Tools\n\n${wiki}\n\n---\n\n${AI_REFERENCE}\n`;
}
