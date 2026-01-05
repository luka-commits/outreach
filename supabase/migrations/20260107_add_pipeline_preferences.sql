-- =====================================================
-- PIPELINE VIEW PREFERENCES
-- Stores user column visibility preferences for LeadList
-- =====================================================

CREATE TABLE IF NOT EXISTS public.pipeline_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Visible built-in columns (array of column keys)
  -- Default: all built-in columns visible
  visible_columns text[] DEFAULT ARRAY[
    'prospect', 'location', 'industry', 'trust', 'sequence', 'channels', 'tags', 'status'
  ]::text[],

  -- Visible custom field IDs
  visible_custom_fields uuid[] DEFAULT ARRAY[]::uuid[],

  -- Column order (optional, for future drag-reorder feature)
  column_order text[] DEFAULT NULL,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (standard 4-policy pattern)
DROP POLICY IF EXISTS "Users can view own preferences" ON pipeline_preferences;
CREATE POLICY "Users can view own preferences" ON pipeline_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON pipeline_preferences;
CREATE POLICY "Users can insert own preferences" ON pipeline_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON pipeline_preferences;
CREATE POLICY "Users can update own preferences" ON pipeline_preferences
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own preferences" ON pipeline_preferences;
CREATE POLICY "Users can delete own preferences" ON pipeline_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_preferences_user_id ON pipeline_preferences(user_id);

-- Trigger for updated_at (uses existing function)
DROP TRIGGER IF EXISTS update_pipeline_preferences_updated_at ON public.pipeline_preferences;
CREATE TRIGGER update_pipeline_preferences_updated_at
  BEFORE UPDATE ON public.pipeline_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
