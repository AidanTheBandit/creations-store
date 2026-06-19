import { createAdminClient } from "@/lib/supabase/admin";
import { sealSecret, openSecret } from "@/lib/crypto/secret-box";

// Per-user experiment flags + the encrypted rabbit hole token. All reads go
// through the admin client (the table is owner-RLS'd); the token columns are
// only ever touched here, server-side, and are never returned to a client.

export interface ExperimentFlags {
  rabbitRepoEnabled: boolean;
  rabbitHoleEnabled: boolean;
  rabbitHoleTokenSet: boolean;
}

type Row = {
  rabbit_repo_enabled: boolean;
  rabbit_hole_enabled: boolean;
  rabbit_hole_token_enc: string | null;
  rabbit_hole_token_iv: string | null;
  rabbit_hole_token_tag: string | null;
};

const EMPTY: ExperimentFlags = {
  rabbitRepoEnabled: false,
  rabbitHoleEnabled: false,
  rabbitHoleTokenSet: false,
};

/** Client-safe flags (booleans only — never the token itself). */
export async function getExperimentFlags(userId: string): Promise<ExperimentFlags> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_user_experiments")
    .select(
      "rabbit_repo_enabled, rabbit_hole_enabled, rabbit_hole_token_enc, rabbit_hole_token_iv, rabbit_hole_token_tag",
    )
    .eq("user_id", userId)
    .maybeSingle<Row>();
  if (!data) return { ...EMPTY };
  return {
    rabbitRepoEnabled: data.rabbit_repo_enabled,
    rabbitHoleEnabled: data.rabbit_hole_enabled,
    rabbitHoleTokenSet: !!(
      data.rabbit_hole_token_enc &&
      data.rabbit_hole_token_iv &&
      data.rabbit_hole_token_tag
    ),
  };
}

/** Update the boolean flags (upsert; never touches the token columns). */
export async function setExperimentFlags(
  userId: string,
  flags: { rabbitRepoEnabled?: boolean; rabbitHoleEnabled?: boolean },
): Promise<void> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };
  if (typeof flags.rabbitRepoEnabled === "boolean")
    patch.rabbit_repo_enabled = flags.rabbitRepoEnabled;
  if (typeof flags.rabbitHoleEnabled === "boolean")
    patch.rabbit_hole_enabled = flags.rabbitHoleEnabled;
  await admin.from("store_user_experiments").upsert(patch, { onConflict: "user_id" });
}

/** Encrypt + store the rabbit hole appSession token. */
export async function setRabbitHoleToken(userId: string, token: string): Promise<void> {
  const box = sealSecret(token);
  const admin = createAdminClient();
  await admin.from("store_user_experiments").upsert(
    {
      user_id: userId,
      rabbit_hole_token_enc: box.enc,
      rabbit_hole_token_iv: box.iv,
      rabbit_hole_token_tag: box.tag,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/** Clear the stored token. */
export async function clearRabbitHoleToken(userId: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("store_user_experiments")
    .update({
      rabbit_hole_token_enc: null,
      rabbit_hole_token_iv: null,
      rabbit_hole_token_tag: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

/**
 * Decrypt the user's rabbit hole token for a server-side proxy call. Returns
 * null when the experiment is disabled, no token is stored, or decryption
 * fails. The plaintext token never leaves the server.
 */
export async function getRabbitHoleToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("store_user_experiments")
    .select(
      "rabbit_hole_enabled, rabbit_hole_token_enc, rabbit_hole_token_iv, rabbit_hole_token_tag",
    )
    .eq("user_id", userId)
    .maybeSingle<Row>();
  if (!data || !data.rabbit_hole_enabled) return null;
  return openSecret({
    enc: data.rabbit_hole_token_enc ?? undefined,
    iv: data.rabbit_hole_token_iv ?? undefined,
    tag: data.rabbit_hole_token_tag ?? undefined,
  } as Parameters<typeof openSecret>[0]);
}
