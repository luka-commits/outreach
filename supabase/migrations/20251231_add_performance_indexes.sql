-- Performance indexes for scale
-- These indexes optimize common query patterns identified in the launch readiness audit

-- Activities table indexes
-- Optimizes dashboard platform metrics (filtering by platform)
CREATE INDEX IF NOT EXISTS idx_activities_user_platform
  ON activities(user_id, platform);

-- Optimizes date range queries for activity feeds
CREATE INDEX IF NOT EXISTS idx_activities_user_timestamp
  ON activities(user_id, timestamp DESC);

-- Leads table indexes
-- Optimizes status counting for dashboard/funnel
CREATE INDEX IF NOT EXISTS idx_leads_user_status
  ON leads(user_id, status);

-- Optimizes filter dropdowns for location
CREATE INDEX IF NOT EXISTS idx_leads_user_location
  ON leads(user_id, location);

-- Optimizes filter dropdowns for niche
CREATE INDEX IF NOT EXISTS idx_leads_user_niche
  ON leads(user_id, niche);

-- Optimizes strategy assignment views and performance queries
CREATE INDEX IF NOT EXISTS idx_leads_user_strategy
  ON leads(user_id, strategy_id);

-- Optimizes lead scoring and prioritization
CREATE INDEX IF NOT EXISTS idx_leads_user_score
  ON leads(user_id, score DESC NULLS LAST);

-- Optimizes last activity sorting
CREATE INDEX IF NOT EXISTS idx_leads_user_last_activity
  ON leads(user_id, last_activity_at DESC NULLS LAST);
