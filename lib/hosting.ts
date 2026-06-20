// Shared helpers for user-hosted static creations.

export const STATIC_PREFIX = "bccs/sites";

// Where a creation's bundle lives in S3.
export function staticKeyPrefix(creationId: string): string {
  return `${STATIC_PREFIX}/${creationId}/`;
}

// The public-facing URL a hosted creation is served from.
export function hostedUrl(slug: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://creations.boondit.site";
  return `${base.replace(/\/$/, "")}/c/${slug}/`;
}

// Upload/extraction limits.
export const HOSTING_LIMITS = {
  maxZipBytes: 25 * 1024 * 1024, // compressed upload cap
  maxTotalBytes: 50 * 1024 * 1024, // uncompressed total
  maxFiles: 2000,
  maxFileBytes: 25 * 1024 * 1024, // single extracted file
};

// Minimal extension → content-type map for served static assets. Unknown types
// fall back to octet-stream (downloaded, not executed).
const TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  map: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  bmp: "image/bmp",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  wasm: "application/wasm",
  pdf: "application/pdf",
};

export function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return TYPES[ext] || "application/octet-stream";
}

/**
 * Normalize a zip-entry or request path to a safe relative key segment.
 * Returns null for anything that would escape the bundle root (traversal,
 * absolute paths, backslashes, NUL).
 */
export function safeRelPath(input: string): string | null {
  if (!input) return null;
  let p = input.replace(/\\/g, "/").replace(/^\/+/, "");
  if (p.includes("\0")) return null;
  // Strip a leading "./".
  p = p.replace(/^\.\//, "");
  // Reject any traversal segment or empty/dot segments.
  const parts = p.split("/");
  const out: string[] = [];
  for (const seg of parts) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") return null;
    out.push(seg);
  }
  if (out.length === 0) return null;
  return out.join("/");
}
