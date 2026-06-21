import { NextRequest, NextResponse } from "next/server";
import { unzipSync } from "fflate";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  uploadStaticFile,
  deleteStaticPrefix,
} from "@/lib/s3";
import {
  staticKeyPrefix,
  hostedUrl,
  contentTypeFor,
  safeRelPath,
  HOSTING_LIMITS,
} from "@/lib/hosting";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Decide which directory in the uploaded zip is the real site root, returning a
// prefix to re-root to ("" = already at root, "apps/app/dist/" = a subdir, null
// = no usable site). Strategy, in order:
//   1. index.html already at the zip root → use root.
//   2. The root index.html is a meta-refresh / link redirect into a subdir →
//      follow it (handles the rabbit-os export shape).
//   3. Otherwise pick the shallowest index.html that has a sibling assets/ dir
//      (a real built app), preferring a path containing "dist" or "build".
function pickSiteRoot(entries: { rel: string; data: Uint8Array }[]): string | null {
  const paths = new Set(entries.map((e) => e.rel));
  if (paths.has("index.html")) {
    // If root index is just a redirect, prefer its target; else serve root.
    const root = entries.find((e) => e.rel === "index.html");
    const target = root ? redirectTarget(root.data) : null;
    if (target && paths.has(target)) {
      return target.slice(0, target.lastIndexOf("/") + 1);
    }
    return "";
  }

  // All index.html locations, shallowest first.
  const indexes = entries
    .filter((e) => e.rel.endsWith("/index.html"))
    .map((e) => e.rel)
    .sort((a, b) => a.split("/").length - b.split("/").length);
  if (indexes.length === 0) return null;

  // Prefer a built-output dir (dist/build) that also has an assets/ sibling.
  const scored = indexes
    .map((p) => {
      const dir = p.slice(0, p.lastIndexOf("/") + 1);
      const hasAssets = [...paths].some((q) => q.startsWith(`${dir}assets/`));
      const built = /(^|\/)(dist|build|out|public)\//.test(dir) ? 1 : 0;
      return { dir, score: built * 2 + (hasAssets ? 1 : 0), depth: dir.split("/").length };
    })
    .sort((a, b) => b.score - a.score || a.depth - b.depth);
  return scored[0].dir;
}

// Extract a same-bundle redirect target from a tiny HTML shell (meta-refresh or
// a single relative link). Returns a normalized relative path or null.
function redirectTarget(html: Uint8Array): string | null {
  let text: string;
  try {
    text = Buffer.from(html).toString("utf8");
  } catch {
    return null;
  }
  if (text.length > 4000) return null; // only treat tiny shells as redirects
  const meta = text.match(/url=([^"'>\s]+)/i);
  const link = text.match(/href=["']([^"']+)["']/i);
  const raw = (meta?.[1] || link?.[1] || "").trim();
  if (!raw || /^https?:|^\/\//i.test(raw)) return null; // external → not our bundle
  return safeRelPath(raw);
}

// Owner check shared by POST/DELETE.
async function ownedCreation(id: string) {
  const user = await getCurrentUser();
  if (!user?.id) return { error: "unauthorized" as const };
  const admin = createAdminClient();
  const { data: creation } = await admin
    .from("store_creations")
    .select("id, slug, user_id, hosting_type")
    .eq("id", id)
    .maybeSingle();
  if (!creation) return { error: "not_found" as const };
  if (creation.user_id !== user.id) return { error: "forbidden" as const };
  return { user, admin, creation };
}

// POST /api/creation/[id]/host — upload a static bundle (zip) for a creation.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await ownedCreation(id);
  if ("error" in ctx) {
    const status = ctx.error === "unauthorized" ? 401 : ctx.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: ctx.error }, { status });
  }
  const { admin, creation } = ctx;

  const form = await req.formData().catch(() => null);
  const bundle = form?.get("bundle");
  if (!(bundle instanceof File)) {
    return NextResponse.json({ error: "missing_bundle" }, { status: 400 });
  }
  if (bundle.size > HOSTING_LIMITS.maxZipBytes) {
    return NextResponse.json({ error: "zip_too_large" }, { status: 413 });
  }

  // Unzip in memory. CRITICAL: cap uncompressed size via the `filter` callback,
  // which sees each entry's declared originalSize from the zip directory BEFORE
  // that entry is inflated. This prevents a decompression bomb (a small zip that
  // inflates to gigabytes) from OOM-killing the worker — returning false skips
  // inflation entirely. We also bound the running uncompressed total.
  let declaredTotal = 0;
  let bomb = false;
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(await bundle.arrayBuffer()), {
      filter: (file) => {
        if (file.originalSize > HOSTING_LIMITS.maxFileBytes) {
          bomb = true;
          return false; // don't inflate this entry
        }
        declaredTotal += file.originalSize;
        if (declaredTotal > HOSTING_LIMITS.maxTotalBytes) {
          bomb = true;
          return false;
        }
        return true;
      },
    });
  } catch {
    return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  }
  if (bomb) {
    return NextResponse.json({ error: "bundle_too_large" }, { status: 413 });
  }

  // Validate + normalize entries. Skip directory entries (zero-length, trailing /).
  const entries: { rel: string; data: Uint8Array }[] = [];
  let totalBytes = 0;
  for (const [rawName, data] of Object.entries(files)) {
    if (rawName.endsWith("/")) continue; // directory marker
    const rel = safeRelPath(rawName);
    if (!rel) {
      return NextResponse.json(
        { error: "unsafe_path", detail: rawName },
        { status: 400 },
      );
    }
    // Drop common junk.
    if (rel.split("/").some((s) => s === "__MACOSX") || rel.endsWith(".DS_Store")) {
      continue;
    }
    if (data.byteLength > HOSTING_LIMITS.maxFileBytes) {
      return NextResponse.json({ error: "file_too_large", detail: rel }, { status: 413 });
    }
    totalBytes += data.byteLength;
    entries.push({ rel, data });
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "empty_bundle" }, { status: 400 });
  }
  if (entries.length > HOSTING_LIMITS.maxFiles) {
    return NextResponse.json({ error: "too_many_files" }, { status: 413 });
  }
  if (totalBytes > HOSTING_LIMITS.maxTotalBytes) {
    return NextResponse.json({ error: "bundle_too_large" }, { status: 413 });
  }

  // Pick the directory that is the real site root and re-root the bundle to it,
  // so the served files have index.html at the top. Handles: a clean zip
  // (index.html already at root), a single wrapper folder, AND a zip whose root
  // index.html is just a meta-refresh redirect into a build dir (e.g. the
  // rabbit-os export → apps/app/dist/index.html) surrounded by source/junk.
  const rootPrefix = pickSiteRoot(entries);
  if (rootPrefix === null) {
    return NextResponse.json({ error: "missing_index_html" }, { status: 400 });
  }
  let normalized = rootPrefix
    ? entries
        .filter((e) => e.rel.startsWith(rootPrefix))
        .map((e) => ({ rel: e.rel.slice(rootPrefix.length), data: e.data }))
        .filter((e) => e.rel.length > 0)
    : entries;

  if (!normalized.some((e) => e.rel === "index.html")) {
    return NextResponse.json({ error: "missing_index_html" }, { status: 400 });
  }
  // Re-apply the file-count cap after re-rooting (we may have dropped a lot).
  if (normalized.length > HOSTING_LIMITS.maxFiles) {
    return NextResponse.json({ error: "too_many_files" }, { status: 413 });
  }

  const prefix = staticKeyPrefix(creation.id);

  // Clear any previous bundle, then upload all files in bounded-concurrency
  // batches (avoids opening up to maxFiles S3 connections + holding every body
  // in flight at once).
  try {
    await deleteStaticPrefix(prefix);
    const BATCH = 16;
    for (let i = 0; i < normalized.length; i += BATCH) {
      const batch = normalized.slice(i, i + BATCH);
      await Promise.all(
        batch.map((e) =>
          uploadStaticFile(`${prefix}${e.rel}`, Buffer.from(e.data), contentTypeFor(e.rel)),
        ),
      );
    }
  } catch (e) {
    console.error("[host] upload failed:", e);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const url = hostedUrl(creation.slug);
  const { error: updErr } = await admin
    .from("store_creations")
    .update({
      hosting_type: "static",
      static_key: prefix,
      static_entry: "index.html",
      static_size_bytes: totalBytes,
      static_file_count: normalized.length,
      static_updated_at: new Date().toISOString(),
      url,
    })
    .eq("id", creation.id);
  if (updErr) {
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({
    url,
    fileCount: normalized.length,
    sizeBytes: totalBytes,
  });
}

// DELETE /api/creation/[id]/host — remove the hosted bundle, revert to external.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await ownedCreation(id);
  if ("error" in ctx) {
    const status = ctx.error === "unauthorized" ? 401 : ctx.error === "forbidden" ? 403 : 404;
    return NextResponse.json({ error: ctx.error }, { status });
  }
  const { admin, creation } = ctx;

  try {
    await deleteStaticPrefix(staticKeyPrefix(creation.id));
  } catch (e) {
    console.error("[host] delete failed:", e);
  }

  const { error } = await admin
    .from("store_creations")
    .update({
      hosting_type: "external",
      static_key: null,
      static_size_bytes: null,
      static_file_count: null,
      static_updated_at: null,
    })
    .eq("id", creation.id);
  if (error) {
    return NextResponse.json({ error: "db_update_failed" }, { status: 500 });
  }

  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
