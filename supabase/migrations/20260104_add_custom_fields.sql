-- =====================================================
-- CUSTOM FIELDS FOR LEADS
-- User-defined custom fields with type-specific value storage
-- =====================================================

-- =====================================================
-- TABLE 1: custom_field_definitions
-- Stores the schema of user-defined custom fields
-- =====================================================
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Field metadata
  name text NOT NULL,
  field_key text NOT NULL,  -- URL-safe identifier (auto-generated from name)
  field_type text NOT NULL CHECK (field_type IN (
    'text',           -- Single line text
    'number',         -- Numeric value
    'date',           -- Date picker
    'single_select',  -- Dropdown with one selection
    'multi_select',   -- Dropdown with multiple selections
    'checkbox',       -- Boolean true/false
    'url'             -- URL with validation
  )),

  -- Configuration
  is_required boolean DEFAULT false,
  options jsonb DEFAULT '[]'::jsonb,  -- For select types: [{value, label, color?}]
  default_value text,                  -- Default value for new leads

  -- Display settings
  position integer NOT NULL DEFAULT 0,   -- Order in forms/lists
  show_in_list boolean DEFAULT false,    -- Show as column in lead list
  show_in_filters boolean DEFAULT true,  -- Allow filtering by this field

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  UNIQUE(user_id, field_key)
);

-- Enable RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (standard 4-policy pattern)
CREATE POLICY "Users can view own field definitions" ON custom_field_definitions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own field definitions" ON custom_field_definitions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own field definitions" ON custom_field_definitions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own field definitions" ON custom_field_definitions
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_user_id
  ON custom_field_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_user_position
  ON custom_field_definitions(user_id, position);


-- =====================================================
-- TABLE 2: custom_field_values
-- Stores the actual values for leads
-- =====================================================
CREATE TABLE IF NOT EXISTS public.custom_field_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  field_id uuid REFERENCES custom_field_definitions(id) ON DELETE CASCADE NOT NULL,

  -- Value storage (use appropriate column based on field_type)
  value_text text,           -- For text, url, single_select
  value_number decimal,      -- For number
  value_date date,           -- For date
  value_boolean boolean,     -- For checkbox
  value_array text[],        -- For multi_select (array of option values)

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One value per field per lead
  UNIQUE(lead_id, field_id)
);

-- Enable RLS
ALTER TABLE public.custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies (standard 4-policy pattern with direct user_id check)
CREATE POLICY "Users can view own field values" ON custom_field_values
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own field values" ON custom_field_values
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own field values" ON custom_field_values
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own field values" ON custom_field_values
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_custom_field_values_user_id
  ON custom_field_values(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_lead_id
  ON custom_field_values(lead_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field_id
  ON custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_lead_field
  ON custom_field_values(lead_id, field_id);

-- Partial indexes for filtering by type (improves filter performance at scale)
CREATE INDEX IF NOT EXISTS idx_custom_field_values_text
  ON custom_field_values(field_id, value_text)
  WHERE value_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_field_values_number
  ON custom_field_values(field_id, value_number)
  WHERE value_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_field_values_date
  ON custom_field_values(field_id, value_date)
  WHERE value_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_field_values_boolean
  ON custom_field_values(field_id, value_boolean)
  WHERE value_boolean IS NOT NULL;


-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================

-- Trigger for custom_field_definitions
CREATE TRIGGER update_custom_field_definitions_updated_at
  BEFORE UPDATE ON public.custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for custom_field_values
CREATE TRIGGER update_custom_field_values_updated_at
  BEFORE UPDATE ON public.custom_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
