-- Add cancel_at_period_end column to track scheduled cancellations
-- This syncs with Stripe's cancel_at_period_end flag

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.cancel_at_period_end IS
  'True if subscription is scheduled to cancel at current_period_end. Synced from Stripe.';
