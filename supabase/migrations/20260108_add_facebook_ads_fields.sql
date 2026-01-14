-- Add new fields for Facebook Ads scraping
-- page_likes: Facebook page like count
-- ad_count: Number of ads found for this business

ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_likes integer;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ad_count integer;
