-- Add position column for user-controlled strategy ordering
ALTER TABLE strategies ADD COLUMN position integer;

-- Backfill: assign positions based on created_at (oldest = 0, per user)
UPDATE strategies SET position = sub.row_num - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM strategies
) sub
WHERE strategies.id = sub.id;

-- Make NOT NULL after backfill
ALTER TABLE strategies ALTER COLUMN position SET NOT NULL;
ALTER TABLE strategies ALTER COLUMN position SET DEFAULT 0;

-- Index for efficient ordering queries
CREATE INDEX idx_strategies_user_position ON strategies(user_id, position);
