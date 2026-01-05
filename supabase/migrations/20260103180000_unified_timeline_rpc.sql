-- Unified Timeline RPC for Lead Detail Page
-- Combines activities + call_records queries into single RPC call
-- Created: 2026-01-03

CREATE OR REPLACE FUNCTION get_lead_timeline(
  p_user_id UUID,
  p_lead_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  activities_data JSON;
  calls_data JSON;
BEGIN
  -- Get activities (excluding platform='call' to avoid duplicates with call_records)
  SELECT json_agg(row_to_json(a) ORDER BY a.timestamp DESC)
  INTO activities_data
  FROM (
    SELECT id, action, platform, note, is_first_outreach, direction, timestamp
    FROM activities
    WHERE user_id = p_user_id
      AND lead_id = p_lead_id
      AND (platform IS NULL OR platform != 'call')
    ORDER BY timestamp DESC
    LIMIT p_limit
  ) a;

  -- Get call records (completed or with outcome)
  SELECT json_agg(row_to_json(c) ORDER BY c.started_at DESC)
  INTO calls_data
  FROM (
    SELECT id, outcome, status, duration_seconds, recording_url,
           transcription, ai_summary, notes, started_at
    FROM call_records
    WHERE user_id = p_user_id
      AND lead_id = p_lead_id
      AND (status = 'completed' OR outcome IS NOT NULL)
    ORDER BY started_at DESC
    LIMIT p_limit
  ) c;

  result := json_build_object(
    'activities', COALESCE(activities_data, '[]'::JSON),
    'callRecords', COALESCE(calls_data, '[]'::JSON)
  );

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_lead_timeline TO authenticated;
