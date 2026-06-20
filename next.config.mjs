/** @type {import('next').NextConfig} */

// Supabase origins for CSP connect-src. Realtime rides a WebSocket on the same
// host as REST; CSP matches schemes literally, so the https origin doesn't
// grant wss — we add it explicitly.
const SUPABASE_ORIGIN = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
      : "";
  } catch {
    return "";
  }
})();

const SUPABASE_WSS_ORIGIN = SUPABASE_ORIGIN
  ? SUPABASE_ORIGIN.replace(/^https:/, "wss:")
  : "";

// CSP for the marketing/directory routes. Strict: scripts from self (plus the
// Cloudflare analytics beacon), and connect/img/media locked to the origins we
// actually call. The R1A device route gets a separate, slightly looser policy.
const SITE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.boondit.site https://*.linodeobjects.com https://cdn.discordapp.com",
  "media-src 'self' blob: https://cdn.boondit.site https://*.linodeobjects.com",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WSS_ORIGIN} https://cdn.boondit.site https://*.linodeobjects.com https://cloudflareinsights.com`,
].join("; ");

// /r1a_client runs inside the R1 WebView and uses the camera for QR scanning
// plus same-origin Socket.IO polling for the chat/TTS bridge. It must also be
// embeddable by the R1 host, so frame-ancestors is omitted (not 'none') here.
const R1A_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.boondit.site https://*.linodeobjects.com https://cdn.discordapp.com",
  "media-src 'self' blob: https://cdn.boondit.site https://*.linodeobjects.com",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WSS_ORIGIN} https://cdn.boondit.site https://*.linodeobjects.com https://cloudflareinsights.com`,
].join("; ");

// /creation is the store running on the R1: it scans a pairing QR (camera) and
// in "experience" mode EMBEDS arbitrary creation URLs in an iframe, so frame-src
// + img-src must allow any https origin. It must also be embeddable by the R1
// host (frame-ancestors omitted). Sites that send X-Frame-Options: DENY simply
// can't be framed — handled by the screenshot fallback in the client.
const CREATION_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "frame-src https:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WSS_ORIGIN} https://cdn.boondit.site https://*.linodeobjects.com https://cloudflareinsights.com`,
].join("; ");

// /devtools hosts the R1 emulator, which embeds an arbitrary creation URL in an
// iframe to test it at the real device size. Like /creation it needs frame-src +
// img/media https: and camera/mic delegation for framed creations. Unlike the R1
// device surfaces, the devtools page itself is NOT embedded, so frame-ancestors
// stays 'none' and X-Frame-Options: DENY is kept (via siteHeaders' bookends below
// we instead add it explicitly here).
const DEVTOOLS_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "frame-src https:",
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WSS_ORIGIN} https://cdn.boondit.site https://*.linodeobjects.com https://cloudflareinsights.com`,
].join("; ");

const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const siteHeaders = [
  ...baseHeaders,
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: SITE_CSP },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// /r1a_client needs camera access for QR scanning and must be iframable by the
// R1 host, so X-Frame-Options is omitted. Camera is granted to self; mic and
// geolocation stay denied since the client never captures them.
const r1aHeaders = [
  ...baseHeaders,
  { key: "Content-Security-Policy", value: R1A_CSP },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=()",
  },
];

// /devtools keeps the strict frame-ancestors/X-Frame-Options of the site (it is
// not meant to be embedded) but loosens frame-src so the emulator can host any
// https creation, and delegates camera/mic to framed creations that need them.
const devtoolsHeaders = [
  ...baseHeaders,
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: DEVTOOLS_CSP },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=*, microphone=*, geolocation=()",
  },
];

const creationHeaders = [
  ...baseHeaders,
  { key: "Content-Security-Policy", value: CREATION_CSP },
  {
    // experience mode embeds arbitrary creations that may need the camera/mic
    // (QR scanners, AR, voice). Delegate to all origins (camera=*) so the
    // iframe's own allow="camera; microphone" can grant them; the page itself
    // (QR pairing scanner) is included via *.
    key: "Permissions-Policy",
    value: "camera=*, microphone=*, geolocation=()",
  },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.boondit.site" },
      { protocol: "https", hostname: "**.linodeobjects.com" },
    ],
  },
  async headers() {
    return [
      {
        // Everything except the R1 device surfaces and devtools gets the strict
        // policy.
        source: "/((?!r1a_client|creation|devtools).*)",
        headers: siteHeaders,
      },
      {
        source: "/r1a_client/:path*",
        headers: r1aHeaders,
      },
      {
        source: "/creation/:path*",
        headers: creationHeaders,
      },
      {
        source: "/devtools/:path*",
        headers: devtoolsHeaders,
      },
      {
        source: "/devtools",
        headers: devtoolsHeaders,
      },
    ];
  },
};

export default nextConfig;
