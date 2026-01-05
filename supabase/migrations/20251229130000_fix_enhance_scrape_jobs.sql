-- Fix for 20251228_enhance_scrape_jobs.sql (failed on policy syntax)
-- Complete the remaining items that weren't applied

-- Add missing columns (some may already exist from failed migration)
ALTER TABLE scrape_jobs
ADD COLUMN IF NOT EXISTS leads_imported integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS leads_skipped integer DEFAULT 0;

-- Skip the policy creation - service role already bypasses RLS

-- Enable Realtime for scrape_jobs table if not already
-- This allows frontend to subscribe to status changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'scrape_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE scrape_jobs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Create indexes for faster webhook lookups and status filtering (if not exist)
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_status ON scrape_jobs(user_id, status);
