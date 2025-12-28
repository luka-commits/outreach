-- Add subscription fields to profiles table
alter table public.profiles 
add column if not exists stripe_customer_id text,
add column if not exists subscription_status text default 'free', -- 'active', 'past_due', 'canceled', 'free'
add column if not exists subscription_plan text default 'basic', -- 'pro_monthly', 'pro_yearly'
add column if not exists current_period_end timestamp with time zone;

-- Enable RLS for these columns if needed (usually implicit if table already has RLS)
-- Ideally ensure users can read their own subscription data but only service role can write true status (via webhooks)
