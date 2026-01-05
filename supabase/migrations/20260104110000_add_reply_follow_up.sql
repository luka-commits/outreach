-- Add reply sequence to strategies
-- A multi-step follow-up sequence triggered when a lead replies
-- Similar to main strategy steps but with its own progression

ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS reply_sequence jsonb DEFAULT NULL;

COMMENT ON COLUMN public.strategies.reply_sequence IS
'Array of follow-up steps triggered when lead replies. Structure: [{dayOffset: number, action: string, template: string}]. First step (dayOffset: 0) is immediate.';

-- Add legacy single reply follow-up column to strategies
ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS reply_follow_up jsonb DEFAULT NULL;

COMMENT ON COLUMN public.strategies.reply_follow_up IS
'Legacy single follow-up config when lead replies. Structure: {enabled: boolean, delayDays: number, template: string}.';

-- Add reply sequence tracking columns to leads
-- These track reply sequence progression in parallel to main strategy

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS reply_sequence_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_sequence_channel text,
ADD COLUMN IF NOT EXISTS reply_sequence_step_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_sequence_completed_indexes integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS reply_sequence_next_date date;

-- Constraint for valid channel types
ALTER TABLE public.leads
ADD CONSTRAINT leads_reply_sequence_channel_check
CHECK (reply_sequence_channel IS NULL OR reply_sequence_channel IN ('send_dm', 'send_email', 'call', 'fb_message', 'linkedin_dm', 'manual', 'walk_in'));

-- Index for efficient querying of pending reply sequence tasks
CREATE INDEX IF NOT EXISTS idx_leads_reply_sequence
ON public.leads(user_id, reply_sequence_next_date)
WHERE reply_sequence_active = true;

COMMENT ON COLUMN public.leads.reply_sequence_active IS 'Flag indicating a reply sequence is in progress';
COMMENT ON COLUMN public.leads.reply_sequence_channel IS 'The channel for all reply sequence tasks (from original reply)';
COMMENT ON COLUMN public.leads.reply_sequence_step_index IS 'Current step index in the reply sequence';
COMMENT ON COLUMN public.leads.reply_sequence_completed_indexes IS 'Completed step indexes for current day group';
COMMENT ON COLUMN public.leads.reply_sequence_next_date IS 'Date when the next reply sequence task should appear';
