-- Fix: Drop index that references non-existent score column
-- The idx_leads_user_score was created in 20251231_add_performance_indexes.sql
-- referencing leads.score which doesn't exist in the schema
DROP INDEX IF EXISTS idx_leads_user_score;
