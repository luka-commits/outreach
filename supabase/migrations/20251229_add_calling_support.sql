-- Add Twilio credentials to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS twilio_account_sid text,
ADD COLUMN IF NOT EXISTS twilio_auth_token text,
ADD COLUMN IF NOT EXISTS twilio_twiml_app_sid text,
ADD COLUMN IF NOT EXISTS twilio_phone_number text;

-- Create call_records table for tracking all calls
CREATE TABLE IF NOT EXISTS call_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  twilio_call_sid text,
  from_number text NOT NULL,
  to_number text NOT NULL,
  outcome text, -- connected, voicemail, no_answer, busy, wrong_number
  status text DEFAULT 'initiated', -- initiated, ringing, in-progress, completed, failed
  duration_seconds integer,
  recording_url text,
  recording_saved boolean DEFAULT false,
  transcription text,
  ai_summary text,
  notes text,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Enable Row Level Security
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for call_records (drop if exists, then create)
DROP POLICY IF EXISTS "Users can view own calls" ON call_records;
CREATE POLICY "Users can view own calls" ON call_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own calls" ON call_records;
CREATE POLICY "Users can insert own calls" ON call_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own calls" ON call_records;
CREATE POLICY "Users can update own calls" ON call_records
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calls" ON call_records;
CREATE POLICY "Users can delete own calls" ON call_records
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_records_user_id ON call_records(user_id);
CREATE INDEX IF NOT EXISTS idx_call_records_lead_id ON call_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_records_started_at ON call_records(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_records_twilio_call_sid ON call_records(twilio_call_sid);
