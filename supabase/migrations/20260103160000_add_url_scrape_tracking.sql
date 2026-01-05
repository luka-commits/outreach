-- Add URL scrape tracking to profiles
-- Free users are limited to 20 URL scrapes per month

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS url_scrapes_this_month integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS url_scrapes_reset_at timestamp with time zone DEFAULT now();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_profiles_url_scrapes ON profiles(id, url_scrapes_this_month, url_scrapes_reset_at);

COMMENT ON COLUMN profiles.url_scrapes_this_month IS 'Number of URL scrapes used this month (for Quick Import feature)';
COMMENT ON COLUMN profiles.url_scrapes_reset_at IS 'When the monthly URL scrape counter was last reset';
