-- Migration: Add lost_reason to leads
-- Purpose: Track why leads were disqualified with predefined reasons + custom notes

-- Add nullable text field for lost reason (stores predefined reason key or 'other')
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS lost_reason text;

-- Add nullable text field for custom lost reason note (used when reason is 'other')
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS lost_reason_note text;

-- Index for analytics queries (grouping by lost reason)
CREATE INDEX IF NOT EXISTS idx_leads_lost_reason
  ON public.leads(user_id, lost_reason)
  WHERE status = 'disqualified' AND lost_reason IS NOT NULL;

COMMENT ON COLUMN public.leads.lost_reason IS
  'Reason for disqualification. Values: no_budget, bad_timing, went_with_competitor, not_interested, wrong_contact, no_response_after_outreach, other';

COMMENT ON COLUMN public.leads.lost_reason_note IS
  'Custom note explaining the lost reason. Primarily used when lost_reason = other';
