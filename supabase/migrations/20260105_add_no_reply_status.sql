-- Migration: Add 'no_reply' pipeline status
-- This adds automatic categorization for leads who complete a strategy without responding

-- 1. Update leads status constraint to include 'no_reply'
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('not_contacted', 'in_progress', 'replied', 'qualified', 'disqualified', 'no_reply'));

-- 2. Add strategy_completed_at to leads (when strategy was finished without reply)
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS strategy_completed_at timestamptz;

-- 3. Add no_reply_delay_days to strategies (per-strategy setting)
ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS no_reply_delay_days integer;

-- 4. Index for efficient no-reply job queries
CREATE INDEX IF NOT EXISTS idx_leads_no_reply_candidates
  ON public.leads(user_id, status, strategy_completed_at)
  WHERE status = 'in_progress' AND strategy_completed_at IS NOT NULL;

-- 5. RPC function for processing no-reply leads (called by background job)
CREATE OR REPLACE FUNCTION process_no_reply_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  -- Update leads that:
  -- 1. Are in_progress status
  -- 2. Have strategy_completed_at set (strategy was completed)
  -- 3. The delay period has passed (based on their strategy's no_reply_delay_days)
  -- 4. Still haven't received a reply (status unchanged)
  WITH leads_to_update AS (
    SELECT l.id, l.user_id
    FROM public.leads l
    INNER JOIN public.strategies s ON l.strategy_id = s.id
    WHERE l.status = 'in_progress'
      AND l.strategy_completed_at IS NOT NULL
      AND s.no_reply_delay_days IS NOT NULL
      AND l.strategy_completed_at + (s.no_reply_delay_days || ' days')::interval <= NOW()
  )
  UPDATE public.leads
  SET
    status = 'no_reply',
    next_task_date = NULL  -- Clear task date (terminal status)
  FROM leads_to_update
  WHERE leads.id = leads_to_update.id;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

-- Grant execute permission to authenticated users (for manual testing)
-- The actual cron job will use service role
GRANT EXECUTE ON FUNCTION process_no_reply_leads() TO authenticated;
