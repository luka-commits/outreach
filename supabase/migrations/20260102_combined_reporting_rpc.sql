-- Combined Reporting Dashboard RPC
-- Returns all reporting metrics in a single call (4 queries -> 1)
-- Created: 2026-01-02

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
      COUNT(DISTINCT cc.lead_id) FILTER (
        WHERE l.status IN ('replied', 'qualified')
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
      AND l.status IN ('replied', 'qualified')
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_reporting_dashboard TO authenticated;
