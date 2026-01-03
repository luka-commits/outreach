-- Migration: Add direction field to activities for tracking inbound replies
-- This enables distinguishing between outgoing outreach and incoming responses

ALTER TABLE activities ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outbound';

-- Add a check constraint to ensure valid values
-- Note: Using CHECK constraint for data integrity
ALTER TABLE activities ADD CONSTRAINT activities_direction_check
  CHECK (direction IN ('outbound', 'inbound'));

-- Create index for filtering by direction
CREATE INDEX IF NOT EXISTS idx_activities_direction ON activities(direction);

-- Comment on column for documentation
COMMENT ON COLUMN activities.direction IS 'Direction of the activity: outbound (we contacted them) or inbound (they replied)';
