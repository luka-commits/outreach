-- Migration: Add progress tracking to scrape_jobs table
-- Enables real-time stage updates during scraping workflow

-- Add stage column to track current pipeline stage
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS stage text DEFAULT 'queued';

-- Add progress percentage (0-100)
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS progress integer DEFAULT 0;

-- Add stage message for user-friendly status
ALTER TABLE scrape_jobs ADD COLUMN IF NOT EXISTS stage_message text;

-- Comment on new columns
COMMENT ON COLUMN scrape_jobs.stage IS 'Current pipeline stage: queued, scraping, enriching, finalizing, completed, failed';
COMMENT ON COLUMN scrape_jobs.progress IS 'Progress percentage (0-100) within current stage';
COMMENT ON COLUMN scrape_jobs.stage_message IS 'User-friendly message about current activity';
