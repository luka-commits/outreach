-- Stored procedures for efficient duplicate detection
-- These replace client-side aggregation with server-side SQL

-- Find duplicate leads by company name (server-side grouping)
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

-- Find duplicate leads by email (server-side grouping)
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

-- Find duplicate leads by phone (server-side grouping)
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

-- Get duplicate summary counts (fast overview)
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

  -- Company name duplicates
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

  -- Email duplicates
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

  -- Phone duplicates
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_duplicate_leads_by_company TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_leads_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_leads_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicates_summary TO authenticated;
