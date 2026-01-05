-- Migration: Add enrichment fields to leads table
-- These fields store additional data from the Modal scraping pipeline

-- Add owner_title field (e.g., "Owner", "CEO", "Founder")
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_title text;

-- Add executive_summary field (AI-generated business description)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS executive_summary text;

-- Add twitter_url for social media completeness
ALTER TABLE leads ADD COLUMN IF NOT EXISTS twitter_url text;

-- Add youtube_url for social media completeness
ALTER TABLE leads ADD COLUMN IF NOT EXISTS youtube_url text;

-- Add tiktok_url for social media completeness
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tiktok_url text;

-- Add zip_code for better address handling
ALTER TABLE leads ADD COLUMN IF NOT EXISTS zip_code text;

-- Add country for international support
ALTER TABLE leads ADD COLUMN IF NOT EXISTS country text;

-- Add search_query to track which query found this lead
ALTER TABLE leads ADD COLUMN IF NOT EXISTS search_query text;

-- Add category (the raw category from Google Maps, separate from niche)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS category text;

-- Comment on new columns
COMMENT ON COLUMN leads.owner_title IS 'Title/position of the business owner or contact (e.g., Owner, CEO)';
COMMENT ON COLUMN leads.executive_summary IS 'AI-generated summary of the business from website content';
COMMENT ON COLUMN leads.search_query IS 'The search query that originally found this lead';
COMMENT ON COLUMN leads.category IS 'Business category from Google Maps';
