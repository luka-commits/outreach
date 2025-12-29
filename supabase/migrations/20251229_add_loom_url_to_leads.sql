-- Migration: Add loom_url field to leads table
-- This field stores a Loom video URL for personalized follow-up messages

-- Add loom_url field
ALTER TABLE leads ADD COLUMN IF NOT EXISTS loom_url text;

-- Comment on new column
COMMENT ON COLUMN leads.loom_url IS 'Loom video URL for personalized follow-up messages';
