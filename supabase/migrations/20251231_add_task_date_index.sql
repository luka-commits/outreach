-- Add composite index for efficient task queries by user and next_task_date
-- This index optimizes the getDueTasks and getAllScheduledTasks queries
-- which filter by user_id and order by next_task_date

CREATE INDEX IF NOT EXISTS idx_leads_user_next_task_date
  ON leads(user_id, next_task_date)
  WHERE next_task_date IS NOT NULL;

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_leads_user_next_task_date IS
  'Optimizes task queue queries that filter by user_id and sort by next_task_date';
