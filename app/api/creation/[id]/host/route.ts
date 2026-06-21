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

  // If a single top-level folder wraps everything (common when zipping a dir),
  // strip it so index.html lands at the root.
  const topDirs = new Set(entries.map((e) => e.rel.split("/")[0]));
  const hasRootIndex = entries.some((e) => e.rel === "index.html");
  let normalized = entries;
  if (!hasRootIndex && topDirs.size === 1) {
    const prefix = `${[...topDirs][0]}/`;
    const stripped = entries
      .map((e) => ({ rel: e.rel.slice(prefix.length), data: e.data }))
      .filter((e) => e.rel.length > 0);
    if (stripped.some((e) => e.rel === "index.html")) normalized = stripped;
  }

  if (!normalized.some((e) => e.rel === "index.html")) {
    return NextResponse.json({ error: "missing_index_html" }, { status: 400 });
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
