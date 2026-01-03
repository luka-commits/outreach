-- Compound index for per-lead activity queries
-- Optimizes: SELECT * FROM activities WHERE user_id = ? AND lead_id = ? ORDER BY timestamp DESC
-- This query runs when viewing a lead's activity history

CREATE INDEX IF NOT EXISTS idx_activities_user_lead_timestamp
  ON activities(user_id, lead_id, timestamp DESC);
