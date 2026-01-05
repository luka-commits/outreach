-- Composite indexes for better query performance at scale
-- These optimize common query patterns for call records and lead notes

-- Optimize queries for call records by user + lead
-- Used in getCallsByLead() and call history views
CREATE INDEX IF NOT EXISTS idx_call_records_user_lead
  ON call_records(user_id, lead_id);

-- Optimize queries for lead notes by user + lead
-- Used in getNotesByLead() and lead detail views
CREATE INDEX IF NOT EXISTS idx_lead_notes_user_lead
  ON lead_notes(user_id, lead_id);
