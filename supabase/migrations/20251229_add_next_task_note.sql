-- Migration: Add next_task_note to leads
-- Created at: 2025-12-29
-- Purpose: Store notes for manually scheduled tasks

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS next_task_note text;

-- This is a safe operation (nullable column)
