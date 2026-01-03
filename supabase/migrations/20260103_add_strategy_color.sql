-- Add color field to strategies table
-- This allows users to pick a color for each strategy that displays consistently across the app

ALTER TABLE public.strategies
ADD COLUMN IF NOT EXISTS color text DEFAULT 'indigo';

-- Ensure existing strategies have the default color
UPDATE public.strategies SET color = 'indigo' WHERE color IS NULL;
