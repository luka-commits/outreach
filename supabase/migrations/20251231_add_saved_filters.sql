-- Migration: Add saved_filters table for Smart Lists feature
-- Purpose: Allow users to save filter combinations as named segments

-- Create saved_filters table
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'filter',
  color text DEFAULT '#6B7280',
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved filters" ON public.saved_filters
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved filters" ON public.saved_filters
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved filters" ON public.saved_filters
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved filters" ON public.saved_filters
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id ON public.saved_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_position ON public.saved_filters(user_id, position);
