import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

/**
 * S3 client for creations-store image uploads.
 * Uses the same Linode Object Storage bucket as rhythm,
 * but all objects are stored under the "bccs/" prefix.
 */

const BCCS_PREFIX = "bccs";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = () => process.env.S3_BUCKET!;

export function publicUrl(key: string): string {
  return `${process.env.S3_PUBLIC_URL}/${key}`;
}

/**
 * Upload an image to S3 under bccs/<subpath>.
 * Returns the public URL.
 */
export async function uploadImage(
  filename: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const key = `${BCCS_PREFIX}/${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: "public-read",
    }),
  );

  return publicUrl(key);
}

/**
 * Delete an image from S3 by its key.
 */
export async function deleteImage(key: string): Promise<void> {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET(),
      Key: key,
    }),
  );
}

// ─── Static creation hosting (bccs/sites/<creationId>/...) ──────────
//
// Hosted-site files are stored WITHOUT public-read ACL: they're only reachable
// through the app's /c/<slug>/ route, which applies a locked-down CSP. The
// `key` passed here already includes the full bccs/sites/... prefix.

export async function uploadStaticFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
      // No public-read ACL — served only via the /c proxy.
    }),
  );
}

/** Fetch a hosted file's bytes + content-type. Returns null if missing. */
export async function getStaticObject(
  key: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET(), Key: key }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return null;
    return {
      body: Buffer.from(bytes),
      contentType: res.ContentType || "application/octet-stream",
    };
  } catch {
    return null;
  }
}

/** List all object keys under a prefix (paginated). */
export async function listStaticFiles(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET(),
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const o of res.Contents || []) if (o.Key) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

/** Delete every object under a prefix (batched, 1000 per request). */
export async function deleteStaticPrefix(prefix: string): Promise<void> {
  const keys = await listStaticFiles(prefix);
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    if (batch.length === 0) continue;
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET(),
        Delete: { Objects: batch.map((Key) => ({ Key })) },
      }),
    );
  }
}
