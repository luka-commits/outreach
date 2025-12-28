-- Add API key columns to profiles table for scraping workflow
-- Users store their own Apify and Anthropic API keys

-- Add API key columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS apify_api_token text,
ADD COLUMN IF NOT EXISTS anthropic_api_key text;

-- Add RLS policy to ensure users can only read/update their own API keys
-- Note: The existing RLS policies on profiles should already cover this,
-- but we add an explicit comment for clarity.

-- Comment on columns for documentation
COMMENT ON COLUMN profiles.apify_api_token IS 'User''s Apify API token for Google Maps scraping';
COMMENT ON COLUMN profiles.anthropic_api_key IS 'User''s Anthropic API key for Claude Haiku enrichment';
