-- ============================================
-- Creations Store — user-hosted static creations (Phase 1)
-- 2025-06-20
-- ============================================
--
-- Lets creators host a static bundle (HTML/CSS/JS) on the Boondit CDN instead
-- of pointing at an external URL. Non-breaking: existing rows default to
-- 'external' and behave exactly as before. Bundle files live in S3 under
-- bccs/sites/<creation_id>/ and are served via the app's /c/<slug>/ route.

ALTER TABLE store_creations
  ADD COLUMN IF NOT EXISTS hosting_type text NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS static_key text,
  ADD COLUMN IF NOT EXISTS static_entry text DEFAULT 'index.html',
  ADD COLUMN IF NOT EXISTS static_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS static_file_count integer,
  ADD COLUMN IF NOT EXISTS static_updated_at timestamptz;

-- Guard the enum-ish column.
ALTER TABLE store_creations
  DROP CONSTRAINT IF EXISTS store_creations_hosting_type_chk;
ALTER TABLE store_creations
  ADD CONSTRAINT store_creations_hosting_type_chk
  CHECK (hosting_type IN ('external', 'static'));
