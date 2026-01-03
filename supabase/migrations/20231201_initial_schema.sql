-- =====================================================
-- Outbound Pilot Initial Database Schema
-- This migration creates the core tables and their relationships
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Note: Insert handled by trigger, no direct insert policy needed

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Only create trigger if it doesn't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- =====================================================
-- 2. STRATEGIES TABLE
-- Outreach strategy templates with multi-step sequences
-- =====================================================
create table if not exists public.strategies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable RLS
alter table public.strategies enable row level security;

-- Strategies policies
create policy "Users can view their own strategies"
  on public.strategies for select
  using (auth.uid() = user_id);

create policy "Users can insert their own strategies"
  on public.strategies for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own strategies"
  on public.strategies for update
  using (auth.uid() = user_id);

create policy "Users can delete their own strategies"
  on public.strategies for delete
  using (auth.uid() = user_id);

-- Index for user lookups
create index if not exists idx_strategies_user_id on public.strategies(user_id);

-- =====================================================
-- 3. LEADS TABLE
-- Core lead/prospect data with strategy assignment
-- =====================================================
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Company info
  company_name text not null,
  contact_name text,
  email text,
  phone text,

  -- URLs
  website_url text,
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  twitter_url text,
  youtube_url text,
  tiktok_url text,

  -- Location
  address text,
  location text,
  zip_code text,
  country text,

  -- Business info
  niche text,
  category text,
  google_rating decimal(2,1) check (google_rating is null or (google_rating >= 0 and google_rating <= 5)),
  google_review_count integer check (google_review_count is null or google_review_count >= 0),

  -- Enrichment fields
  owner_title text,
  executive_summary text,
  search_query text,

  -- Strategy state
  strategy_id uuid references public.strategies(id) on delete set null,
  current_step_index integer default 0 not null,
  next_task_date date,
  status text default 'not_contacted' not null
    check (status in ('not_contacted', 'in_progress', 'replied', 'qualified', 'disqualified')),

  -- Timestamps
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable RLS
alter table public.leads enable row level security;

-- Leads policies
create policy "Users can view their own leads"
  on public.leads for select
  using (auth.uid() = user_id);

create policy "Users can insert their own leads"
  on public.leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own leads"
  on public.leads for update
  using (auth.uid() = user_id);

create policy "Users can delete their own leads"
  on public.leads for delete
  using (auth.uid() = user_id);

-- Indexes for common queries
create index if not exists idx_leads_user_id on public.leads(user_id);
create index if not exists idx_leads_user_status on public.leads(user_id, status);
create index if not exists idx_leads_user_next_task on public.leads(user_id, next_task_date) where next_task_date is not null;
create index if not exists idx_leads_strategy_id on public.leads(strategy_id) where strategy_id is not null;
create index if not exists idx_leads_user_created on public.leads(user_id, created_at desc);

-- =====================================================
-- 4. ACTIVITIES TABLE
-- Log of all outreach activities
-- =====================================================
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references public.leads(id) on delete cascade not null,
  action text not null,
  platform text check (platform in ('instagram', 'facebook', 'linkedin', 'email', 'call', 'walkIn')),
  timestamp timestamp with time zone default timezone('utc', now()) not null,
  note text,
  is_first_outreach boolean default false,
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable RLS
alter table public.activities enable row level security;

-- Activities policies
create policy "Users can view their own activities"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activities"
  on public.activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own activities"
  on public.activities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own activities"
  on public.activities for delete
  using (auth.uid() = user_id);

-- Indexes for common queries
create index if not exists idx_activities_user_id on public.activities(user_id);
create index if not exists idx_activities_lead_id on public.activities(lead_id);
create index if not exists idx_activities_timestamp on public.activities(timestamp desc);
create index if not exists idx_activities_user_timestamp on public.activities(user_id, timestamp desc);

-- =====================================================
-- 5. OUTREACH_GOALS TABLE
-- Daily outreach goals by channel
-- =====================================================
create table if not exists public.outreach_goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  instagram integer default 0 not null check (instagram >= 0),
  facebook integer default 0 not null check (facebook >= 0),
  linkedin integer default 0 not null check (linkedin >= 0),
  email integer default 0 not null check (email >= 0),
  call integer default 0 not null check (call >= 0),
  walk_in integer default 0 not null check (walk_in >= 0),
  created_at timestamp with time zone default timezone('utc', now()) not null,
  updated_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable RLS
alter table public.outreach_goals enable row level security;

-- Outreach goals policies
create policy "Users can view their own goals"
  on public.outreach_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.outreach_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.outreach_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.outreach_goals for delete
  using (auth.uid() = user_id);

-- Index for user lookups
create index if not exists idx_outreach_goals_user_id on public.outreach_goals(user_id);

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- Auto-update updated_at timestamp on row changes
-- =====================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at column
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'update_profiles_updated_at') then
    create trigger update_profiles_updated_at
      before update on public.profiles
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'update_strategies_updated_at') then
    create trigger update_strategies_updated_at
      before update on public.strategies
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'update_leads_updated_at') then
    create trigger update_leads_updated_at
      before update on public.leads
      for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'update_outreach_goals_updated_at') then
    create trigger update_outreach_goals_updated_at
      before update on public.outreach_goals
      for each row execute function public.update_updated_at_column();
  end if;
end $$;
