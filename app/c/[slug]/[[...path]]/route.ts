import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaticObject } from "@/lib/s3";
import { staticKeyPrefix, contentTypeFor, safeRelPath } from "@/lib/hosting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Locked-down CSP for user-hosted content. Crucially `sandbox` does NOT include
// allow-same-origin, so hosted JS — even though it shares the creations.boondit
// .site hostname — cannot read the store's cookies/session/DOM or call store
// APIs as the logged-in user.
const HOSTED_CSP = [
  "default-src 'self' data: blob: https://cdn.boondit.site",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.boondit.site",
  "font-src 'self' data:",
  "media-src 'self' data: blob: https://cdn.boondit.site",
  "connect-src 'self' https://cdn.boondit.site",
  "sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock",
].join("; ");

function securedHeaders(contentType: string, immutable: boolean): HeadersInit {
  return {
    "Content-Type": contentType,
    "Content-Security-Policy": HOSTED_CSP,
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-site",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": immutable
      ? "public, max-age=300, s-maxage=300, stale-while-revalidate=86400"
      : "no-cache",
  };
}

function notFound(): NextResponse {
  return new NextResponse("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// GET /c/<slug>/<path...> — stream a hosted static creation's files from S3.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path } = await params;

  const admin = createAdminClient();
  const { data: creation } = await admin
    .from("store_creations")
    .select("id, status, hosting_type, static_key, static_entry")
    .eq("slug", slug)
    .maybeSingle();

  if (
    !creation ||
    creation.hosting_type !== "static" ||
    !creation.static_key ||
    creation.status !== "published"
  ) {
    return notFound();
  }

  // Resolve the requested path (default to the entry file). Reject traversal.
  const reqPath = (path && path.length > 0 ? path.join("/") : "") || "";
  let rel: string;
  if (reqPath === "" || reqPath.endsWith("/")) {
    rel = `${reqPath}${creation.static_entry || "index.html"}`.replace(/^\/+/, "");
  } else {
    rel = reqPath;
  }
  const safe = safeRelPath(rel);
  if (!safe) return notFound();

  const prefix = creation.static_key as string; // e.g. bccs/sites/<id>/
  const key = `${prefix}${safe}`;

  let obj = await getStaticObject(key);
  // SPA-friendly: if a non-asset path 404s, fall back to index.html.
  if (!obj && !safe.includes(".")) {
    obj = await getStaticObject(`${prefix}${creation.static_entry || "index.html"}`);
    if (obj) {
      return new NextResponse(new Uint8Array(obj.body), {
        status: 200,
        headers: securedHeaders(contentTypeFor("index.html"), false),
      });
    }
  }
  if (!obj) return notFound();

  // Trust our own extension-derived type over whatever S3 returns.
  const contentType = contentTypeFor(safe);
  const immutable = safe !== (creation.static_entry || "index.html");
  return new NextResponse(new Uint8Array(obj.body), {
    status: 200,
    headers: securedHeaders(contentType, immutable),
  });
}
