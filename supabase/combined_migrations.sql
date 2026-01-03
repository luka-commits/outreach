-- ============================================
-- COMBINED MIGRATIONS FOR OUTREACH PILOT
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Migration: 20251228_add_api_keys_to_profiles.sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS apify_api_token text,
ADD COLUMN IF NOT EXISTS anthropic_api_key text;

COMMENT ON COLUMN profiles.apify_api_token IS 'User''s Apify API token for Google Maps scraping';
COMMENT ON COLUMN profiles.anthropic_api_key IS 'User''s Anthropic API key for Claude Haiku enrichment';

-- Migration: 20251229_add_next_task_note.sql
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS next_task_note text;

-- Migration: 20251229_add_loom_url_to_leads.sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loom_url text;
COMMENT ON COLUMN leads.loom_url IS 'Loom video URL for personalized follow-up messages';

-- Migration: 20251229_fix_enhance_scrape_jobs.sql
ALTER TABLE scrape_jobs
ADD COLUMN IF NOT EXISTS leads_imported integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_skipped integer DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'scrape_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scrape_jobs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_status ON scrape_jobs(user_id, status);

-- Migration: 20251230_add_activity_direction.sql
ALTER TABLE activities ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outbound';

DO $$
BEGIN
  ALTER TABLE activities ADD CONSTRAINT activities_direction_check
    CHECK (direction IN ('outbound', 'inbound'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_activities_direction ON activities(direction);
COMMENT ON COLUMN activities.direction IS 'Direction of the activity: outbound (we contacted them) or inbound (they replied)';

-- Migration: 20251230_add_email_settings.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_access_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_refresh_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_token_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resend_api_key text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resend_from_address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_provider text;

-- Migration: 20251230_add_enrichment_fields_to_leads.sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_title text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS executive_summary text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS twitter_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tiktok_url text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS zip_code text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS search_query text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category text;

-- Migration: 20251230_add_lead_notes.sql
CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can view own notes" ON lead_notes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own notes" ON lead_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own notes" ON lead_notes FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own notes" ON lead_notes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_notes_user_id ON lead_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);

CREATE OR REPLACE FUNCTION update_lead_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_notes_updated_at_trigger ON lead_notes;
CREATE TRIGGER lead_notes_updated_at_trigger
  BEFORE UPDATE ON lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_notes_updated_at();

-- Migration: 20251230_add_lead_tags.sql
CREATE TABLE IF NOT EXISTS lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can view own tags" ON lead_tags FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own tags" ON lead_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own tags" ON lead_tags FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own tags" ON lead_tags FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_tags_user_id ON lead_tags(user_id);

CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES lead_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);

ALTER TABLE lead_tag_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can view own tag assignments" ON lead_tag_assignments
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM lead_tags
        WHERE lead_tags.id = lead_tag_assignments.tag_id
        AND lead_tags.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own tag assignments" ON lead_tag_assignments
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM lead_tags
        WHERE lead_tags.id = lead_tag_assignments.tag_id
        AND lead_tags.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own tag assignments" ON lead_tag_assignments
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM lead_tags
        WHERE lead_tags.id = lead_tag_assignments.tag_id
        AND lead_tags.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_tag_assignments_lead_id ON lead_tag_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tag_assignments_tag_id ON lead_tag_assignments(tag_id);

-- Migration: 20251231_add_last_activity_at.sql
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_user_last_activity
ON public.leads(user_id, last_activity_at DESC)
WHERE last_activity_at IS NOT NULL;

UPDATE public.leads l
SET last_activity_at = (
  SELECT MAX(a.timestamp)
  FROM public.activities a
  WHERE a.lead_id = l.id
)
WHERE last_activity_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_lead_last_activity()
RETURNS trigger AS $$
BEGIN
  UPDATE public.leads
  SET last_activity_at = NEW.timestamp
  WHERE id = NEW.lead_id
  AND (last_activity_at IS NULL OR last_activity_at < NEW.timestamp);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_lead_last_activity_trigger ON public.activities;
CREATE TRIGGER update_lead_last_activity_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_last_activity();

-- Migration: 20251231_add_saved_filters.sql
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'filter',
  color text DEFAULT '#6B7280',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can view own saved filters" ON public.saved_filters FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can insert own saved filters" ON public.saved_filters FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own saved filters" ON public.saved_filters FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own saved filters" ON public.saved_filters FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON public.saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_position ON public.saved_filters(user_id, position);

-- Migration: 20251231_add_duplicate_detection_rpc.sql
CREATE OR REPLACE FUNCTION find_duplicate_leads_by_company(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  company_name TEXT,
  lead_count BIGINT,
  lead_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    LOWER(TRIM(l.company_name)) as company_name,
    COUNT(*) as lead_count,
    ARRAY_AGG(l.id ORDER BY l.created_at) as lead_ids
  FROM leads l
  WHERE l.user_id = p_user_id
    AND l.company_name IS NOT NULL
    AND TRIM(l.company_name) != ''
  GROUP BY LOWER(TRIM(l.company_name))
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION find_duplicate_leads_by_email(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  email TEXT,
  lead_count BIGINT,
  lead_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    LOWER(TRIM(l.email)) as email,
    COUNT(*) as lead_count,
    ARRAY_AGG(l.id ORDER BY l.created_at) as lead_ids
  FROM leads l
  WHERE l.user_id = p_user_id
    AND l.email IS NOT NULL
    AND TRIM(l.email) != ''
  GROUP BY LOWER(TRIM(l.email))
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION find_duplicate_leads_by_phone(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  phone TEXT,
  lead_count BIGINT,
  lead_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized_phone TEXT;
BEGIN
  RETURN QUERY
  SELECT
    REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g') as phone,
    COUNT(*) as lead_count,
    ARRAY_AGG(l.id ORDER BY l.created_at) as lead_ids
  FROM leads l
  WHERE l.user_id = p_user_id
    AND l.phone IS NOT NULL
    AND LENGTH(REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')) >= 7
  GROUP BY REGEXP_REPLACE(l.phone, '[^0-9]', '', 'g')
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION get_duplicates_summary(
  p_user_id UUID
)
RETURNS TABLE (
  duplicate_type TEXT,
  group_count BIGINT,
  total_duplicates BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY

  SELECT
    'company_name'::TEXT as duplicate_type,
    COUNT(*)::BIGINT as group_count,
    SUM(cnt)::BIGINT as total_duplicates
  FROM (
    SELECT COUNT(*) as cnt
    FROM leads
    WHERE user_id = p_user_id
      AND company_name IS NOT NULL
      AND TRIM(company_name) != ''
    GROUP BY LOWER(TRIM(company_name))
    HAVING COUNT(*) > 1
  ) company_dupes

  UNION ALL

  SELECT
    'email'::TEXT as duplicate_type,
    COUNT(*)::BIGINT as group_count,
    SUM(cnt)::BIGINT as total_duplicates
  FROM (
    SELECT COUNT(*) as cnt
    FROM leads
    WHERE user_id = p_user_id
      AND email IS NOT NULL
      AND TRIM(email) != ''
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) email_dupes

  UNION ALL

  SELECT
    'phone'::TEXT as duplicate_type,
    COUNT(*)::BIGINT as group_count,
    SUM(cnt)::BIGINT as total_duplicates
  FROM (
    SELECT COUNT(*) as cnt
    FROM leads
    WHERE user_id = p_user_id
      AND phone IS NOT NULL
      AND LENGTH(REGEXP_REPLACE(phone, '[^0-9]', '', 'g')) >= 7
    GROUP BY REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
    HAVING COUNT(*) > 1
  ) phone_dupes;
END;
$$;

GRANT EXECUTE ON FUNCTION find_duplicate_leads_by_company TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_leads_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_leads_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicates_summary TO authenticated;

-- Migration: 20251231_add_performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_activities_user_platform ON activities(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_activities_user_timestamp ON activities(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_location ON leads(user_id, location);
CREATE INDEX IF NOT EXISTS idx_leads_user_niche ON leads(user_id, niche);
CREATE INDEX IF NOT EXISTS idx_leads_user_strategy ON leads(user_id, strategy_id);
-- Note: score index removed - column doesn't exist in this schema

-- Migration: 20251231_add_rating_index.sql
CREATE INDEX IF NOT EXISTS idx_leads_user_rating
ON leads(user_id, google_rating)
WHERE google_rating IS NOT NULL;

-- Migration: 20251231_add_task_date_index.sql
CREATE INDEX IF NOT EXISTS idx_leads_user_next_task_date
  ON leads(user_id, next_task_date)
  WHERE next_task_date IS NOT NULL;

-- Migration: 20251231_add_strategy_performance_rpc.sql
CREATE OR REPLACE FUNCTION get_strategy_performance_stats(
  p_user_id UUID
)
RETURNS TABLE (
  strategy_id UUID,
  strategy_name TEXT,
  leads_assigned BIGINT,
  leads_contacted BIGINT,
  leads_replied BIGINT,
  leads_qualified BIGINT,
  response_rate NUMERIC,
  qualification_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as strategy_id,
    s.name as strategy_name,
    COUNT(l.id)::BIGINT as leads_assigned,
    COUNT(l.id) FILTER (WHERE l.status != 'not_contacted')::BIGINT as leads_contacted,
    COUNT(l.id) FILTER (WHERE l.status IN ('replied', 'qualified'))::BIGINT as leads_replied,
    COUNT(l.id) FILTER (WHERE l.status = 'qualified')::BIGINT as leads_qualified,
    CASE
      WHEN COUNT(l.id) FILTER (WHERE l.status != 'not_contacted') > 0 THEN
        ROUND((COUNT(l.id) FILTER (WHERE l.status IN ('replied', 'qualified'))::NUMERIC /
               COUNT(l.id) FILTER (WHERE l.status != 'not_contacted')::NUMERIC) * 100, 2)
      ELSE 0
    END as response_rate,
    CASE
      WHEN COUNT(l.id) FILTER (WHERE l.status IN ('replied', 'qualified')) > 0 THEN
        ROUND((COUNT(l.id) FILTER (WHERE l.status = 'qualified')::NUMERIC /
               COUNT(l.id) FILTER (WHERE l.status IN ('replied', 'qualified'))::NUMERIC) * 100, 2)
      ELSE 0
    END as qualification_rate
  FROM strategies s
  LEFT JOIN leads l ON l.strategy_id = s.id AND l.user_id = p_user_id
  WHERE s.user_id = p_user_id
  GROUP BY s.id, s.name
  ORDER BY response_rate DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_lead_counts_by_status(
  p_user_id UUID
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.status,
    COUNT(*)::BIGINT as count
  FROM leads l
  WHERE l.user_id = p_user_id
  GROUP BY l.status
  ORDER BY
    CASE l.status
      WHEN 'not_contacted' THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'replied' THEN 3
      WHEN 'qualified' THEN 4
      WHEN 'disqualified' THEN 5
      ELSE 6
    END;
END;
$$;

CREATE OR REPLACE FUNCTION get_activity_counts_by_platform(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  platform TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.platform,
    COUNT(*)::BIGINT as count
  FROM activities a
  WHERE a.user_id = p_user_id
    AND (p_start_date IS NULL OR a.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR a.timestamp <= p_end_date)
  GROUP BY a.platform
  ORDER BY COUNT(*) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_strategy_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_counts_by_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_counts_by_platform TO authenticated;

-- Migration: 20251231_add_scrape_job_progress.sql
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS stage text DEFAULT 'queued';
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS stage_message text;

-- ============================================
-- END OF MIGRATIONS
-- ============================================
