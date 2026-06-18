-- ============================================
-- Creations Store — R1 device linking (/creation client)
-- 2025-06-18
-- ============================================
-- Mirrors rhythm's QR → device-token flow, but FULLY NAMESPACED for the store
-- because the Supabase project and the .boondit.site cookie domain are SHARED
-- with rhythm:
--   * We do NOT touch users.r1_device_id (that's rhythm's single-device column).
--   * Each R1 creation/app is its own device (R1 WebViews are not yet confirmed
--     to share cookies), so we need MANY devices per user — hence a dedicated
--     store_device_links table keyed by device_id (not a unique column on users).
--   * Distinct RPC name (consume_store_link_token) and cookie (boondit_cs_dt)
--     so nothing collides with rhythm on the shared DB/domain.

-- ── Short-lived link tokens (minted on the web, consumed by the device) ──
CREATE TABLE IF NOT EXISTS store_link_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT,
  used        BOOLEAN NOT NULL DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_store_link_tokens_user ON store_link_tokens (user_id);

ALTER TABLE store_link_tokens ENABLE ROW LEVEL SECURITY;
-- App uses the service-role client; this is defense-in-depth.
DROP POLICY IF EXISTS "store_link_tokens_owner" ON store_link_tokens;
CREATE POLICY "store_link_tokens_owner" ON store_link_tokens FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Device → user bindings (MANY devices per user) ──
CREATE TABLE IF NOT EXISTS store_device_links (
  device_id   TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT,
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_store_device_links_user ON store_device_links (user_id);

ALTER TABLE store_device_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_device_links_owner" ON store_device_links;
CREATE POLICY "store_device_links_owner" ON store_device_links FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Atomic token consumption ──
-- Locks the token row, validates, marks used, upserts the device→user binding
-- (re-linking a device just repoints it), GCs stale tokens, returns the user.
CREATE OR REPLACE FUNCTION public.consume_store_link_token(
  p_token uuid,
  p_device_id text
)
RETURNS TABLE(user_id uuid, username text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT t.user_id INTO v_user_id
  FROM public.store_link_tokens t
  WHERE t.token = p_token
    AND t.used = false
    AND t.expires_at > now()
  FOR UPDATE;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  UPDATE public.store_link_tokens
  SET used = true, device_id = p_device_id
  WHERE token = p_token;

  INSERT INTO public.store_device_links (device_id, user_id, last_seen)
  VALUES (p_device_id, v_user_id, now())
  ON CONFLICT (device_id) DO UPDATE
    SET user_id = EXCLUDED.user_id, last_seen = now();

  DELETE FROM public.store_link_tokens
  WHERE expires_at < now() - interval '24 hours';

  RETURN QUERY
  SELECT u.id, u.username FROM public.users u WHERE u.id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_store_link_token(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_store_link_token(uuid, text) TO service_role;
