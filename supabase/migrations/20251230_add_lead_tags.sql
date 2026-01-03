-- Migration: Add Lead Tags/Labels System
-- This creates a flexible tagging system for leads

-- Create tags table (user-defined tags with colors)
CREATE TABLE IF NOT EXISTS lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6B7280',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_tags
CREATE POLICY "Users can view own tags" ON lead_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON lead_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" ON lead_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON lead_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_lead_tags_user_id ON lead_tags(user_id);

-- Junction table for lead-tag relationships
CREATE TABLE IF NOT EXISTS lead_tag_assignments (
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES lead_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (lead_id, tag_id)
);

-- Enable Row Level Security
ALTER TABLE lead_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_tag_assignments
-- Users can only access assignments for tags they own
CREATE POLICY "Users can view own tag assignments" ON lead_tag_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lead_tags
      WHERE lead_tags.id = lead_tag_assignments.tag_id
      AND lead_tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tag assignments" ON lead_tag_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_tags
      WHERE lead_tags.id = lead_tag_assignments.tag_id
      AND lead_tags.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tag assignments" ON lead_tag_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lead_tags
      WHERE lead_tags.id = lead_tag_assignments.tag_id
      AND lead_tags.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_tag_assignments_lead_id ON lead_tag_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tag_assignments_tag_id ON lead_tag_assignments(tag_id);
