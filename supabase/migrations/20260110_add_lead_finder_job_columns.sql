-- Migration: Add lead finder job columns to scrape_jobs table
-- Enables async lead finder with callback-based architecture

-- Add keyword and country for lead finder searches
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS keyword text;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS max_ads integer DEFAULT 50;

-- Job type to distinguish lead_finder from legacy scrape jobs
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS job_type text DEFAULT 'legacy';

-- Store results until user imports them
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS result_leads jsonb;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS result_duplicates jsonb;
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS total_found integer;

-- Error tracking
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS error_message text;

-- Comments
COMMENT ON COLUMN scrape_jobs.keyword IS 'Search keyword for lead finder (e.g., "plumber")';
COMMENT ON COLUMN scrape_jobs.country IS 'Country code for lead finder (e.g., "US")';
COMMENT ON COLUMN scrape_jobs.max_ads IS 'Maximum number of listings to search';
COMMENT ON COLUMN scrape_jobs.job_type IS 'Job type: lead_finder or legacy';
COMMENT ON COLUMN scrape_jobs.result_leads IS 'JSON array of new leads found (not yet imported)';
COMMENT ON COLUMN scrape_jobs.result_duplicates IS 'JSON array of duplicate leads detected';
COMMENT ON COLUMN scrape_jobs.total_found IS 'Total number of listings found before deduplication';
COMMENT ON COLUMN scrape_jobs.error_message IS 'Error message if job failed';

-- Index for efficient job lookups
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_job_type ON scrape_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_type_status ON scrape_jobs(user_id, job_type, status);
