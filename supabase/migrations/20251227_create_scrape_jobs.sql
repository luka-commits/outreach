-- Create table for tracking scraping jobs (history)
create table if not exists scrape_jobs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  niche text not null,
  location text not null,
  lead_count int default 20,
  expanded_radius boolean default false,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  created_at timestamp with time zone default timezone('utc', now()) not null
);

-- Enable RLS
alter table scrape_jobs enable row level security;

-- Policies
create policy "Users can view their own scrape jobs"
  on scrape_jobs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own scrape jobs"
  on scrape_jobs for insert
  with check (auth.uid() = user_id);
