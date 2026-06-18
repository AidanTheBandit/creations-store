-- ============================================
-- Creations Store — bookmarks + "For You" collaborative-filtering feed
-- 2025-06-18
-- ============================================

-- ── Bookmarks (a user saving a creation) — the primary "like" signal ──
CREATE TABLE IF NOT EXISTS store_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creation_id UUID NOT NULL REFERENCES store_creations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, creation_id)
);
-- "what THIS user liked" (neighbor seed + exclusion)
CREATE INDEX IF NOT EXISTS idx_store_bookmarks_user
  ON store_bookmarks (user_id, created_at DESC);
-- "who else liked THIS creation" (co-occurrence / neighbor finding)
CREATE INDEX IF NOT EXISTS idx_store_bookmarks_creation
  ON store_bookmarks (creation_id, created_at DESC);

ALTER TABLE store_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_bookmarks_owner" ON store_bookmarks;
CREATE POLICY "store_bookmarks_owner" ON store_bookmarks FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Per-user "seen" set for the swipe feed (don't repeat creations) ──
CREATE TABLE IF NOT EXISTS store_feed_seen (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creation_id UUID NOT NULL REFERENCES store_creations(id) ON DELETE CASCADE,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, creation_id)
);
CREATE INDEX IF NOT EXISTS idx_store_feed_seen_user
  ON store_feed_seen (user_id, seen_at DESC);

ALTER TABLE store_feed_seen ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "store_feed_seen_owner" ON store_feed_seen;
CREATE POLICY "store_feed_seen_owner" ON store_feed_seen FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Expire seen rows after 14 days so the catalog can resurface at small scale.
-- Unschedule any prior job of the same name first so this migration is
-- safely re-runnable (cron.schedule otherwise errors on a duplicate name).
SELECT cron.unschedule('cleanup-store-feed-seen')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-store-feed-seen');
SELECT cron.schedule(
  'cleanup-store-feed-seen',
  '17 * * * *',
  $$DELETE FROM store_feed_seen WHERE seen_at < now() - interval '14 days'$$
);

-- ── Creation quality scores (cold-start ordering + CF quality multiplier) ──
-- Bayesian-smoothed rating (prior mean 3.5, weight 5) × log(installs) × recency.
CREATE OR REPLACE VIEW creation_quality_scores AS
SELECT
  c.id,
  ((COALESCE(r.rating_sum, 0) + 3.5 * 5) / (COALESCE(r.rating_cnt, 0) + 5)) AS bayes_rating,
  COALESCE(i.install_cnt, 0) AS installs,
  exp(-ln(2) * EXTRACT(EPOCH FROM (now() - c.created_at)) / (30 * 86400)) AS recency,
  (
    ((COALESCE(r.rating_sum, 0) + 3.5 * 5) / (COALESCE(r.rating_cnt, 0) + 5))
    * ln(2 + COALESCE(i.install_cnt, 0))
    * exp(-ln(2) * EXTRACT(EPOCH FROM (now() - c.created_at)) / (30 * 86400))
  ) AS qscore,
  -- CF multiplier, ~0.5..1.5 — nudges candidates by quality without dominating.
  (0.5 + ((COALESCE(r.rating_sum, 0) + 3.5 * 5) / (COALESCE(r.rating_cnt, 0) + 5)) / 5.0) AS quality_mult
FROM store_creations c
LEFT JOIN (
  SELECT creation_id, SUM(rating) AS rating_sum, COUNT(*) AS rating_cnt
  FROM store_reviews GROUP BY creation_id
) r ON r.creation_id = c.id
LEFT JOIN (
  SELECT creation_id, COUNT(*) AS install_cnt
  FROM store_installs GROUP BY creation_id
) i ON i.creation_id = c.id
WHERE c.status = 'published';

-- ── The recommendation RPC ──
-- "Find people who liked the same creations as you, show what else they've
--  liked recently." Cold start (no likes) → global quality ranking.
CREATE OR REPLACE FUNCTION public.creation_feed_for_user(
  p_user_id        uuid,
  p_limit          integer DEFAULT 30,
  p_offset         integer DEFAULT 0,
  p_half_life_days  numeric DEFAULT 14
)
RETURNS TABLE(id uuid, score numeric, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_likes boolean := false;
BEGIN
  -- my-likes = bookmarks ∪ reviews(rating>=4). Anonymous (null) → no likes.
  CREATE TEMP TABLE _my_likes ON COMMIT DROP AS
    SELECT b.creation_id FROM store_bookmarks b WHERE b.user_id = p_user_id
    UNION
    SELECT rv.creation_id FROM store_reviews rv
      WHERE rv.user_id = p_user_id AND rv.rating >= 4;

  SELECT EXISTS (SELECT 1 FROM _my_likes) INTO v_has_likes;

  IF NOT v_has_likes THEN
    -- Cold start: global quality, excluding already-seen.
    RETURN QUERY
      -- qscore is double precision (exp/ln in the view); the function returns
      -- numeric, so cast or Postgres raises "structure of query does not match".
      SELECT q.id, q.qscore::numeric AS score, 'quality_fallback'::text
      FROM creation_quality_scores q
      WHERE NOT EXISTS (
        SELECT 1 FROM store_feed_seen s
        WHERE s.user_id = p_user_id AND s.creation_id = q.id
      )
      ORDER BY q.qscore DESC NULLS LAST
      LIMIT p_limit OFFSET p_offset;
    RETURN;
  END IF;

  -- Neighbors: other users weighted by how many of my likes they share.
  CREATE TEMP TABLE _neighbors ON COMMIT DROP AS
    SELECT b.user_id, COUNT(*)::numeric AS overlap
    FROM store_bookmarks b
    JOIN _my_likes m ON m.creation_id = b.creation_id
    WHERE b.user_id <> p_user_id
    GROUP BY b.user_id;

  RETURN QUERY
  WITH raw AS (
    SELECT
      b.creation_id AS cid,
      SUM(
        n.overlap
        * exp(-ln(2) * EXTRACT(EPOCH FROM (now() - b.created_at))
              / (p_half_life_days * 86400))
      ) AS cf_score
    FROM store_bookmarks b
    JOIN _neighbors n ON n.user_id = b.user_id
    WHERE b.creation_id NOT IN (SELECT creation_id FROM _my_likes)
    GROUP BY b.creation_id
  )
  SELECT
    raw.cid AS id,
    (raw.cf_score * COALESCE(q.quality_mult, 1.0))::numeric AS score,
    'collaborative'::text
  FROM raw
  JOIN store_creations c ON c.id = raw.cid
  LEFT JOIN creation_quality_scores q ON q.id = raw.cid
  WHERE c.status = 'published'
    AND c.user_id IS DISTINCT FROM p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM store_feed_seen s
      WHERE s.user_id = p_user_id AND s.creation_id = raw.cid
    )
  ORDER BY score DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.creation_feed_for_user(uuid, integer, integer, numeric)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creation_feed_for_user(uuid, integer, integer, numeric) TO service_role;
