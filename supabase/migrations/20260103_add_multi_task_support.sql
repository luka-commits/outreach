-- Add support for multiple tasks per day in strategies
-- This column tracks which step indexes have been completed within the current day group

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS completed_step_indexes integer[] DEFAULT '{}';

-- Create GIN index for efficient array lookups
CREATE INDEX IF NOT EXISTS idx_leads_completed_step_indexes
ON public.leads USING GIN (completed_step_indexes);

-- Add comment for documentation
COMMENT ON COLUMN public.leads.completed_step_indexes IS
'Array of strategy step indexes that have been completed for the current day group. Cleared when advancing to next day.';
