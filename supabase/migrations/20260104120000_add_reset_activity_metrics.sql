-- =====================================================
-- RESET USER ACTIVITY METRICS
-- Migration: 20260104_add_reset_activity_metrics.sql
-- Allows users to reset their own activity statistics
-- =====================================================

-- Create RPC function to reset user activity metrics
-- Uses SECURITY DEFINER to ensure RLS is enforced at the function level
CREATE OR REPLACE FUNCTION reset_user_activity_metrics(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is resetting their own data
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Not authorized to reset another user''s data';
  END IF;

  -- Delete all activities for the user
  DELETE FROM public.activities WHERE user_id = p_user_id;

  -- Reset cached metrics to zero (if they exist)
  UPDATE public.user_activity_metrics
  SET
    weekly_activity_count = 0,
    weekly_emails_sent = 0,
    weekly_calls_made = 0,
    weekly_dms_sent = 0,
    monthly_activity_count = 0,
    total_activity_count = 0,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;
