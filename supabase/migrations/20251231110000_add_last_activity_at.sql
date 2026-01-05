-- Migration: Add last_activity_at column to leads table
-- Purpose: Denormalize last activity timestamp for stale lead detection and sorting

-- Add column to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- Create index for sorting/filtering by last activity (user-scoped)
CREATE INDEX IF NOT EXISTS idx_leads_user_last_activity
ON public.leads(user_id, last_activity_at DESC)
WHERE last_activity_at IS NOT NULL;

-- Backfill existing data from activities table
UPDATE public.leads l
SET last_activity_at = (
  SELECT MAX(a.timestamp)
  FROM public.activities a
  WHERE a.lead_id = l.id
);

-- Create trigger function to auto-update last_activity_at on activity insert
CREATE OR REPLACE FUNCTION public.update_lead_last_activity()
RETURNS trigger AS $$
BEGIN
  UPDATE public.leads
  SET last_activity_at = NEW.timestamp
  WHERE id = NEW.lead_id
  AND (last_activity_at IS NULL OR last_activity_at < NEW.timestamp);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on activities table
DROP TRIGGER IF EXISTS update_lead_last_activity_trigger ON public.activities;
CREATE TRIGGER update_lead_last_activity_trigger
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_lead_last_activity();
