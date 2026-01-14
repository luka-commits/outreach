-- Fix: Include disqualified leads in "replied" statistics
-- Problem: When a lead is disqualified, it disappears from replied stats
-- Solution: Count disqualified leads as "replied" EXCEPT when lost_reason = 'no_response_after_outreach'

-- ============================================================================
-- 1. Update get_strategy_performance_stats
-- ============================================================================
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
    -- FIXED: Include disqualified leads that had replied
    COUNT(l.id) FILTER (WHERE
      l.status IN ('replied', 'qualified')
      OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach'))
    )::BIGINT as leads_replied,
    COUNT(l.id) FILTER (WHERE l.status = 'qualified')::BIGINT as leads_qualified,
    CASE
      WHEN COUNT(l.id) FILTER (WHERE l.status != 'not_contacted') > 0 THEN
        ROUND((COUNT(l.id) FILTER (WHERE
          l.status IN ('replied', 'qualified')
          OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach'))
        )::NUMERIC /
               COUNT(l.id) FILTER (WHERE l.status != 'not_contacted')::NUMERIC) * 100, 2)
      ELSE 0
    END as response_rate,
    CASE
      WHEN COUNT(l.id) FILTER (WHERE
        l.status IN ('replied', 'qualified')
        OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach'))
      ) > 0 THEN
        ROUND((COUNT(l.id) FILTER (WHERE l.status = 'qualified')::NUMERIC /
               COUNT(l.id) FILTER (WHERE
                 l.status IN ('replied', 'qualified')
                 OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach'))
               )::NUMERIC) * 100, 2)
      ELSE 0
    END as qualification_rate
  FROM strategies s
  LEFT JOIN leads l ON l.strategy_id = s.id AND l.user_id = p_user_id
  WHERE s.user_id = p_user_id
  GROUP BY s.id, s.name
  ORDER BY response_rate DESC;
END;
$$;

-- ============================================================================
-- 2. Update get_channel_performance_stats
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
      -- FIXED: Include disqualified leads that had replied
      COUNT(DISTINCT cc.lead_id) FILTER (
        WHERE l.status IN ('replied', 'qualified')
          OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach'))
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
-- 3. Update get_weekly_trends
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
    SELECT generate_series(
      date_trunc('week', CURRENT_DATE - ((p_weeks - 1) * 7 || ' days')::INTERVAL)::DATE,
      date_trunc('week', CURRENT_DATE)::DATE,
      '1 week'::INTERVAL
    )::DATE as week_start
  ),
  weekly_activities AS (
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(*)::BIGINT as activity_count
    FROM activities a
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_weeks * 7 || ' days')::INTERVAL)
    GROUP BY date_trunc('week', a.timestamp)::DATE
  ),
  weekly_replies AS (
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(DISTINCT a.lead_id)::BIGINT as reply_count
    FROM activities a
    JOIN leads l ON l.id = a.lead_id AND l.user_id = p_user_id
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_weeks * 7 || ' days')::INTERVAL)
      -- FIXED: Include disqualified leads that had replied
      AND (l.status IN ('replied', 'qualified')
           OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach')))
    GROUP BY date_trunc('week', a.timestamp)::DATE
  ),
  weekly_qualified AS (
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
-- 4. Update get_reporting_dashboard (combined RPC)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_reporting_dashboard(
  p_user_id UUID,
  p_stale_days INTEGER DEFAULT 7,
  p_trend_weeks INTEGER DEFAULT 12
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  stale_count BIGINT;
  avg_overdue NUMERIC;
  channel_data JSON;
  trends_data JSON;
BEGIN
  -- 1. Get stale leads count
  SELECT COUNT(*)::BIGINT INTO stale_count
  FROM leads
  WHERE user_id = p_user_id
    AND status = 'in_progress'
    AND (
      last_activity_at IS NULL
      OR last_activity_at < (NOW() - (p_stale_days || ' days')::INTERVAL)
    );

  -- 2. Get average days overdue
  SELECT
    ROUND(AVG(CURRENT_DATE - next_task_date::DATE), 1)
  INTO avg_overdue
  FROM leads
  WHERE user_id = p_user_id
    AND status = 'in_progress'
    AND next_task_date IS NOT NULL
    AND next_task_date::DATE < CURRENT_DATE;

  avg_overdue := COALESCE(avg_overdue, 0);

  -- 3. Get channel performance
  WITH channel_contacts AS (
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
      -- FIXED: Include disqualified leads that had replied
      COUNT(DISTINCT cc.lead_id) FILTER (
        WHERE l.status IN ('replied', 'qualified')
          OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach'))
      )::BIGINT as replied
    FROM channel_contacts cc
    JOIN leads l ON l.id = cc.lead_id AND l.user_id = p_user_id
    GROUP BY cc.channel
  )
  SELECT json_agg(json_build_object(
    'channel', cs.channel,
    'leadsContacted', cs.contacted,
    'leadsReplied', cs.replied,
    'replyRate', CASE
      WHEN cs.contacted > 0 THEN ROUND((cs.replied::NUMERIC / cs.contacted::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) ORDER BY cs.contacted DESC)
  INTO channel_data
  FROM channel_stats cs;

  channel_data := COALESCE(channel_data, '[]'::JSON);

  -- 4. Get weekly trends
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', CURRENT_DATE - ((p_trend_weeks - 1) * 7 || ' days')::INTERVAL)::DATE,
      date_trunc('week', CURRENT_DATE)::DATE,
      '1 week'::INTERVAL
    )::DATE as week_start
  ),
  weekly_activities AS (
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(*)::BIGINT as activity_count
    FROM activities a
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_trend_weeks * 7 || ' days')::INTERVAL)
    GROUP BY date_trunc('week', a.timestamp)::DATE
  ),
  weekly_replies AS (
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(DISTINCT a.lead_id)::BIGINT as reply_count
    FROM activities a
    JOIN leads l ON l.id = a.lead_id AND l.user_id = p_user_id
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_trend_weeks * 7 || ' days')::INTERVAL)
      -- FIXED: Include disqualified leads that had replied
      AND (l.status IN ('replied', 'qualified')
           OR (l.status = 'disqualified' AND (l.lost_reason IS NULL OR l.lost_reason != 'no_response_after_outreach')))
    GROUP BY date_trunc('week', a.timestamp)::DATE
  ),
  weekly_qualified AS (
    SELECT
      date_trunc('week', a.timestamp)::DATE as week_start,
      COUNT(DISTINCT a.lead_id)::BIGINT as qualified_count
    FROM activities a
    JOIN leads l ON l.id = a.lead_id AND l.user_id = p_user_id
    WHERE a.user_id = p_user_id
      AND a.timestamp >= (CURRENT_DATE - (p_trend_weeks * 7 || ' days')::INTERVAL)
      AND l.status = 'qualified'
    GROUP BY date_trunc('week', a.timestamp)::DATE
  )
  SELECT json_agg(json_build_object(
    'weekStart', w.week_start,
    'activitiesCount', COALESCE(wa.activity_count, 0),
    'repliesCount', COALESCE(wr.reply_count, 0),
    'qualifiedCount', COALESCE(wq.qualified_count, 0),
    'responseRate', CASE
      WHEN COALESCE(wa.activity_count, 0) > 0
      THEN ROUND((COALESCE(wr.reply_count, 0)::NUMERIC / wa.activity_count::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) ORDER BY w.week_start ASC)
  INTO trends_data
  FROM weeks w
  LEFT JOIN weekly_activities wa ON wa.week_start = w.week_start
  LEFT JOIN weekly_replies wr ON wr.week_start = w.week_start
  LEFT JOIN weekly_qualified wq ON wq.week_start = w.week_start;

  trends_data := COALESCE(trends_data, '[]'::JSON);

  -- Build final result
  result := json_build_object(
    'staleLeadsCount', stale_count,
    'avgDaysOverdue', avg_overdue,
    'channelPerformance', channel_data,
    'weeklyTrends', trends_data
  );

  RETURN result;
END;
$$;
