-- =====================================================
-- NETWORKING FEATURES: Public Profiles + Leaderboard
-- Migration: 20260103_add_networking_features.sql
-- =====================================================

-- =====================================================
-- 1. USER PUBLIC PROFILES TABLE
-- Stores opt-in public profile data (separate from profiles for privacy)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_public_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Profile visibility (MUST opt-in, anonymous by default)
  is_visible boolean DEFAULT false NOT NULL,

  -- Public profile data
  display_name text,
  avatar_url text,
  bio text CHECK (char_length(bio) <= 500),

  -- Stats visibility controls
  show_activity_count boolean DEFAULT true NOT NULL,
  show_weekly_activity boolean DEFAULT true NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_public_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own profile (regardless of visibility)
CREATE POLICY "Users can view own public profile"
  ON public.user_public_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view other visible profiles (for leaderboard)
CREATE POLICY "Users can view visible public profiles"
  ON public.user_public_profiles FOR SELECT
  USING (is_visible = true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own public profile"
  ON public.user_public_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own public profile"
  ON public.user_public_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own public profile"
  ON public.user_public_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_public_profiles_user_id
  ON public.user_public_profiles(user_id);

-- Index for leaderboard queries (visible profiles only)
CREATE INDEX IF NOT EXISTS idx_user_public_profiles_visible
  ON public.user_public_profiles(is_visible)
  WHERE is_visible = true;

-- =====================================================
-- 2. USER ACTIVITY METRICS CACHE TABLE
-- Stores pre-aggregated metrics for leaderboard performance
-- Updated on-demand via RPC
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_activity_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Weekly metrics (rolling 7 days)
  weekly_activity_count integer DEFAULT 0 NOT NULL,
  weekly_emails_sent integer DEFAULT 0 NOT NULL,
  weekly_calls_made integer DEFAULT 0 NOT NULL,
  weekly_dms_sent integer DEFAULT 0 NOT NULL,

  -- Monthly metrics (rolling 30 days)
  monthly_activity_count integer DEFAULT 0 NOT NULL,

  -- All-time metrics
  total_activity_count integer DEFAULT 0 NOT NULL,

  -- Last calculation timestamp
  last_calculated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_activity_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own metrics
CREATE POLICY "Users can view own metrics"
  ON public.user_activity_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view metrics of visible profiles (for leaderboard)
CREATE POLICY "Users can view visible user metrics"
  ON public.user_activity_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_public_profiles upp
      WHERE upp.user_id = user_activity_metrics.user_id
      AND upp.is_visible = true
    )
  );

-- Users can insert their own metrics
CREATE POLICY "Users can insert own metrics"
  ON public.user_activity_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own metrics
CREATE POLICY "Users can update own metrics"
  ON public.user_activity_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_user_id
  ON public.user_activity_metrics(user_id);

-- Index for leaderboard sorting
CREATE INDEX IF NOT EXISTS idx_user_activity_metrics_weekly
  ON public.user_activity_metrics(weekly_activity_count DESC);

-- =====================================================
-- 3. REFRESH USER METRICS RPC FUNCTION
-- Called when user opts-in or requests refresh
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_user_activity_metrics(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weekly_count integer;
  v_monthly_count integer;
  v_total_count integer;
  v_weekly_emails integer;
  v_weekly_calls integer;
  v_weekly_dms integer;
BEGIN
  -- Calculate weekly (last 7 days)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE platform = 'email'),
    COUNT(*) FILTER (WHERE platform = 'call'),
    COUNT(*) FILTER (WHERE platform IN ('instagram', 'facebook', 'linkedin'))
  INTO v_weekly_count, v_weekly_emails, v_weekly_calls, v_weekly_dms
  FROM public.activities
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '7 days';

  -- Calculate monthly (last 30 days)
  SELECT COUNT(*)
  INTO v_monthly_count
  FROM public.activities
  WHERE user_id = p_user_id
    AND timestamp >= NOW() - INTERVAL '30 days';

  -- Calculate total
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.activities
  WHERE user_id = p_user_id;

  -- Upsert metrics
  INSERT INTO public.user_activity_metrics (
    user_id,
    weekly_activity_count,
    weekly_emails_sent,
    weekly_calls_made,
    weekly_dms_sent,
    monthly_activity_count,
    total_activity_count,
    last_calculated_at
  ) VALUES (
    p_user_id,
    COALESCE(v_weekly_count, 0),
    COALESCE(v_weekly_emails, 0),
    COALESCE(v_weekly_calls, 0),
    COALESCE(v_weekly_dms, 0),
    COALESCE(v_monthly_count, 0),
    COALESCE(v_total_count, 0),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    weekly_activity_count = EXCLUDED.weekly_activity_count,
    weekly_emails_sent = EXCLUDED.weekly_emails_sent,
    weekly_calls_made = EXCLUDED.weekly_calls_made,
    weekly_dms_sent = EXCLUDED.weekly_dms_sent,
    monthly_activity_count = EXCLUDED.monthly_activity_count,
    total_activity_count = EXCLUDED.total_activity_count,
    last_calculated_at = EXCLUDED.last_calculated_at,
    updated_at = NOW();
END;
$$;

-- =====================================================
-- 4. LEADERBOARD RPC FUNCTION
-- Server-side aggregation for efficient leaderboard queries
-- =====================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_user_id uuid,
  p_period text DEFAULT 'weekly',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  activity_count integer,
  is_current_user boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT
      ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN p_period = 'weekly' THEN uam.weekly_activity_count
            WHEN p_period = 'monthly' THEN uam.monthly_activity_count
            ELSE uam.total_activity_count
          END DESC
      ) as user_rank,
      upp.user_id as uid,
      upp.display_name as uname,
      upp.avatar_url as uavatar,
      upp.bio as ubio,
      CASE
        WHEN p_period = 'weekly' THEN uam.weekly_activity_count
        WHEN p_period = 'monthly' THEN uam.monthly_activity_count
        ELSE uam.total_activity_count
      END as user_activity_count
    FROM public.user_public_profiles upp
    INNER JOIN public.user_activity_metrics uam ON uam.user_id = upp.user_id
    WHERE upp.is_visible = true
      AND upp.show_activity_count = true
  )
  SELECT
    ru.user_rank as rank,
    ru.uid as user_id,
    ru.uname as display_name,
    ru.uavatar as avatar_url,
    ru.ubio as bio,
    ru.user_activity_count as activity_count,
    (ru.uid = p_user_id) as is_current_user
  FROM ranked_users ru
  ORDER BY ru.user_rank
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =====================================================
-- 5. USER RANK RPC FUNCTION
-- Get current user's rank even if not on visible leaderboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_rank(
  p_user_id uuid,
  p_period text DEFAULT 'weekly'
)
RETURNS TABLE (
  rank bigint,
  activity_count integer,
  total_participants bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count bigint;
  v_user_metric integer;
BEGIN
  -- Get user's activity count
  SELECT
    CASE
      WHEN p_period = 'weekly' THEN uam.weekly_activity_count
      WHEN p_period = 'monthly' THEN uam.monthly_activity_count
      ELSE uam.total_activity_count
    END
  INTO v_user_metric
  FROM public.user_activity_metrics uam
  WHERE uam.user_id = p_user_id;

  IF v_user_metric IS NULL THEN
    v_user_metric := 0;
  END IF;

  -- Count total visible participants
  SELECT COUNT(*)
  INTO v_user_count
  FROM public.user_public_profiles upp
  INNER JOIN public.user_activity_metrics uam ON uam.user_id = upp.user_id
  WHERE upp.is_visible = true;

  -- Calculate rank (how many visible users have more activity)
  RETURN QUERY
  SELECT
    (
      SELECT COUNT(*) + 1
      FROM public.user_public_profiles upp
      INNER JOIN public.user_activity_metrics uam ON uam.user_id = upp.user_id
      WHERE upp.is_visible = true
        AND (
          CASE
            WHEN p_period = 'weekly' THEN uam.weekly_activity_count
            WHEN p_period = 'monthly' THEN uam.monthly_activity_count
            ELSE uam.total_activity_count
          END
        ) > v_user_metric
    ) as rank,
    v_user_metric as activity_count,
    v_user_count as total_participants;
END;
$$;
