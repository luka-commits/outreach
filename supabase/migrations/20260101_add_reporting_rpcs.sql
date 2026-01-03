-- Reporting Analytics RPCs
-- Server-side aggregations for efficient reporting at scale

-- ============================================================================
-- 1. Get stale leads count (in_progress with no recent activity)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_stale_leads_count(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stale_count BIGINT;
BEGIN
  SELECT COUNT(*)::BIGINT INTO stale_count
  FROM leads
  WHERE user_id = p_user_id
    AND status = 'in_progress'
    AND (
      last_activity_at IS NULL
      OR last_activity_at < (NOW() - (p_days || ' days')::INTERVAL)
    );

  RETURN stale_count;
END;
$$;

-- ============================================================================
-- 2. Get channel performance stats
-- ============================================================================
CREATE OR REPLACE FUNCTION get_channel_performance_stats(
  p_user_id UUID
)
RETURNS TABLE (
  channel TEXT,
  leads_contacted BIGINT,
  leads_replied BIGINT,
  reply_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH channel_contacts AS (
    -- Get unique leads contacted per channel
    SELECT
      a.platform as channel,
      a.lead_id
    FROM activities a
    WHERE a.user_id = p_user_id
      AND a.platform IS NOT NULL
    GROUP BY a.platform, a.lead_id
  ),
  channel_stats AS (
    SELECT
      cc.channel,
      COUNT(DISTINCT cc.lead_id)::BIGINT as contacted,
      COUNT(DISTINCT cc.lead_id) FILTER (
        WHERE l.status IN ('replied', 'qualified')
      )::BIGINT as replied
    FROM channel_contacts cc
    JOIN leads l ON l.id = cc.lead_id AND l.user_id = p_user_id
    GROUP BY cc.channel
  )
  SELECT
    cs.channel,
    cs.contacted as leads_contacted,
    cs.replied as leads_replied,
    CASE
      WHEN cs.contacted > 0 THEN ROUND((cs.replied::NUMERIC / cs.contacted::NUMERIC) * 100, 2)
      ELSE 0
    END as reply_rate
  FROM channel_stats cs
  ORDER BY cs.contacted DESC;
END;
$$;

-- ============================================================================
-- 3. Get weekly trends for reporting
-- ============================================================================
CREATE OR REPLACE FUNCTION get_weekly_trends(
  p_user_id UUID,
  p_weeks INTEGER DEFAULT 12
)
RETURNS TABLE (
  week_start DATE,
  activities_count BIGINT,
  replies_count BIGINT,
  qualified_count BIGINT,
  response_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH weeks AS (
    -- Generate week start dates for the past p_weeks weeks
    SELECT generate_series(
      date_trunc('week', CURRENT_DATE - ((p_weeks - 1) * 7 || ' days')::INTERVAL)::DATE,
      date_trunc('week', CURRENT_DATE)::DATE,
      '1 week'::INTERVAL
    )::DATE as week_start
  ),
  weekly_activities AS (
    -- Count activities per week
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(*)::BIGINT as activity_count
    FROM activities a
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_weeks * 7 || ' days')::INTERVAL)
    GROUP BY date_trunc('week', a.timestamp)::DATE
  ),
  weekly_replies AS (
    -- Count leads that reached 'replied' status per week (based on activity timestamp)
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(DISTINCT a.lead_id)::BIGINT as reply_count
    FROM activities a
    JOIN leads l ON l.id = a.lead_id AND l.user_id = p_user_id
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_weeks * 7 || ' days')::INTERVAL)
      AND l.status IN ('replied', 'qualified')
    GROUP BY date_trunc('week', a.timestamp)::DATE
  ),
  weekly_qualified AS (
    -- Count leads that reached 'qualified' status per week
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(DISTINCT a.lead_id)::BIGINT as qualified_count
    FROM activities a
    JOIN leads l ON l.id = a.lead_id AND l.user_id = p_user_id
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_weeks * 7 || ' days')::INTERVAL)
      AND l.status = 'qualified'
    GROUP BY date_trunc('week', a.timestamp)::DATE
  )
  SELECT
    w.week_start,
    COALESCE(wa.activity_count, 0)::BIGINT as activities_count,
    COALESCE(wr.reply_count, 0)::BIGINT as replies_count,
    COALESCE(wq.qualified_count, 0)::BIGINT as qualified_count,
    CASE
      WHEN COALESCE(wa.activity_count, 0) > 0
      THEN ROUND((COALESCE(wr.reply_count, 0)::NUMERIC / wa.activity_count::NUMERIC) * 100, 2)
      ELSE 0
    END as response_rate
  FROM weeks w
  LEFT JOIN weekly_activities wa ON wa.week_start = w.week_start
  LEFT JOIN weekly_replies wr ON wr.week_start = w.week_start
  LEFT JOIN weekly_qualified wq ON wq.week_start = w.week_start
  ORDER BY w.week_start ASC;
END;
$$;

-- ============================================================================
-- 4. Get average days overdue for tasks
-- ============================================================================
CREATE OR REPLACE FUNCTION get_avg_days_overdue(
  p_user_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_overdue NUMERIC;
BEGIN
  SELECT
    ROUND(AVG(CURRENT_DATE - next_task_date::DATE), 1)
  INTO avg_overdue
  FROM leads
  WHERE user_id = p_user_id
    AND status = 'in_progress'
    AND next_task_date IS NOT NULL
    AND next_task_date::DATE < CURRENT_DATE;

  RETURN COALESCE(avg_overdue, 0);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_stale_leads_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_channel_performance_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_trends TO authenticated;
GRANT EXECUTE ON FUNCTION get_avg_days_overdue TO authenticated;
