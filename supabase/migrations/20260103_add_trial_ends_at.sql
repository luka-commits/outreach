-- Add trial_ends_at column to profiles table for tracking free trial periods
-- When a user starts a 14-day trial via Stripe, this timestamp is set to when the trial ends
-- The column remains set after trial ends to track trial history and prevent re-trials

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone;

COMMENT ON COLUMN public.profiles.trial_ends_at IS
  'When trial ends. NULL = never started trial. Kept after trial for history.';
