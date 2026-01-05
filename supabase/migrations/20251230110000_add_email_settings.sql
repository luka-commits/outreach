-- Add email automation settings to profiles table
-- Supports two providers: Gmail (OAuth) and Resend (API key)

-- Gmail OAuth credentials
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_access_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_refresh_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_token_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gmail_email text;

-- Resend credentials (business domain option)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resend_api_key text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resend_from_address text;

-- Track which provider user prefers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_provider text;

-- Comments for documentation
COMMENT ON COLUMN profiles.gmail_access_token IS 'Gmail OAuth access token (1hr expiry)';
COMMENT ON COLUMN profiles.gmail_refresh_token IS 'Gmail OAuth refresh token';
COMMENT ON COLUMN profiles.gmail_token_expires_at IS 'When Gmail access token expires';
COMMENT ON COLUMN profiles.gmail_email IS 'Connected Gmail address';
COMMENT ON COLUMN profiles.resend_api_key IS 'Resend API key for business domains';
COMMENT ON COLUMN profiles.resend_from_address IS 'Verified from address for Resend';
COMMENT ON COLUMN profiles.email_provider IS 'Active email provider: gmail or resend';
