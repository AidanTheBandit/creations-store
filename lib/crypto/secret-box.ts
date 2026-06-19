import crypto from "crypto";

/**
 * AES-256-GCM "secret box" for encrypting sensitive values at rest (currently
 * the rabbit hole appSession token). GCM gives us confidentiality + an auth
 * tag, so a tampered ciphertext fails to decrypt instead of returning garbage.
 *
 * The 32-byte key is derived as sha256(RABBIT_HOLE_TOKEN_SECRET) so any
 * sufficiently-long secret works (same env-secret pattern as lib/auth/device).
 * Rotating the secret invalidates all stored tokens (openSecret returns null),
 * which is the safe failure mode — users just re-enter their token.
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, the GCM standard

export interface SecretBox {
  enc: string; // base64 ciphertext
  iv: string; // base64 IV/nonce
  tag: string; // base64 GCM auth tag
}

function getKey(): Buffer {
  const secret = process.env.RABBIT_HOLE_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "RABBIT_HOLE_TOKEN_SECRET missing or too short (need 32+ chars)",
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
}

/** Encrypt a plaintext string. Returns the ciphertext + iv + tag (all base64). */
export function sealSecret(plain: string): SecretBox {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    enc: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt a secret box. Returns null if the auth tag fails (tampered/corrupt
 * ciphertext, or the secret was rotated) or any field is missing — callers
 * should treat null as "no usable token".
 */
export function openSecret(box: Partial<SecretBox> | null | undefined): string | null {
  if (!box || !box.enc || !box.iv || !box.tag) return null;
  try {
    const decipher = crypto.createDecipheriv(
      ALGO,
      getKey(),
      Buffer.from(box.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(box.tag, "base64"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(box.enc, "base64")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
