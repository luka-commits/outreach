-- Stored procedure for efficient strategy performance analytics
-- Replaces client-side aggregation with server-side SQL
-- Statuses: not_contacted, in_progress, replied, qualified, disqualified

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

-- Get lead counts by status (fast dashboard query)
-- Statuses: not_contacted, in_progress, replied, qualified, disqualified
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

-- Get activity counts by platform (fast dashboard query)
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_strategy_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_counts_by_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_counts_by_platform TO authenticated;
