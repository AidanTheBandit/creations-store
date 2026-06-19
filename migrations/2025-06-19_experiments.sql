-- ============================================
-- Creations Store — per-user experiments / feature flags
-- 2025-06-19
-- ============================================
--
-- Opt-in experimental features, one row per user:
--   * rabbit_repo_enabled — mix the official rabbit.tech creations repo into
--     this user's "For You" feed.
--   * rabbit_hole_enabled + an AES-256-GCM encrypted rabbit hole appSession
--     token, so boondit's API can fetch the user's own rabbit hole data on
--     their behalf. The token is NEVER stored in plaintext and is only ever
--     read by the server (admin client) at proxy time.

CREATE TABLE IF NOT EXISTS store_user_experiments (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rabbit_repo_enabled  BOOLEAN NOT NULL DEFAULT false,
  rabbit_hole_enabled  BOOLEAN NOT NULL DEFAULT false,
  -- AES-256-GCM ciphertext / iv / auth-tag (all base64), NULL when no token set.
  rabbit_hole_token_enc TEXT,
  rabbit_hole_token_iv  TEXT,
  rabbit_hole_token_tag TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Owner-only RLS (mirrors store_bookmarks). The server uses the admin client,
-- which bypasses RLS; client-facing reads never select the token columns.
ALTER TABLE store_user_experiments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_user_experiments_owner" ON store_user_experiments;
CREATE POLICY "store_user_experiments_owner" ON store_user_experiments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
