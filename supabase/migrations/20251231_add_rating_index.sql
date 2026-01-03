-- Add index for google_rating filtering
-- Used in lead list when filtering by rating range

CREATE INDEX IF NOT EXISTS idx_leads_user_rating
ON leads(user_id, google_rating)
WHERE google_rating IS NOT NULL;
