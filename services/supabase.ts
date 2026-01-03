import { createClient } from '@supabase/supabase-js';
import { Lead, Activity, Strategy, StrategyStep, OutreachGoals, ScrapeJob, CallRecord, TwilioCredentials, CallMetrics, GmailCredentials, ResendCredentials, EmailProvider, LeadTag, LeadNote, StrategyPerformance, SavedFilter, DuplicateGroup, MergeConfig, ChannelPerformance, WeeklyTrend, ReportingDashboard, UserPublicProfile, UserActivityMetrics, LeaderboardEntry, UserRankInfo, LeaderboardPeriod, CustomFieldDefinition, CustomFieldValue, CustomFieldType, CustomFieldFormValue, SelectOption } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables at startup
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  throw new Error(`Missing required environment variables: ${missing.join(', ')}. Check your .env.local file.`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current session with automatic token refresh.
 * Uses the pattern from GmailOAuthButton - try refresh first, fallback to cached.
 * This prevents 401 errors when tokens expire during long sessions.
 */
export async function getSession() {
  // First try refreshSession to get a fresh token (handles expired tokens)
  const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

  if (refreshError) {
    console.warn('refreshSession failed:', refreshError.message);
  }

  if (!refreshError && refreshData.session) {
    return refreshData.session;
  }

  // Fall back to getSession (may return cached/stale token)
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;

  // Validate that the token hasn't expired
  if (session) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;

    if (expiresAt < now) {
      // Token is expired and refresh failed - user needs to re-login
      console.warn('Session expired and refresh failed. User needs to re-login.');
      return null;
    }
  }

  return session;
}

// Database row types (snake_case from Supabase)
interface DbLead {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  loom_url: string | null;
  address: string | null;
  location: string | null;
  zip_code: string | null;
  country: string | null;
  niche: string | null;
  category: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  owner_title: string | null;
  executive_summary: string | null;
  search_query: string | null;
  strategy_id: string | null;
  current_step_index: number;
  completed_step_indexes: number[] | null;
  next_task_date: string | null;
  next_task_note: string | null;
  status: string;
  last_activity_at: string | null;
  created_at: string;
}

interface DbActivity {
  id: string;
  user_id: string;
  lead_id: string;
  action: string;
  platform: string | null;
  note: string | null;
  is_first_outreach: boolean;
  timestamp: string;
  direction: string | null;
}

interface DbStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  steps: StrategyStep[];
  color: string | null;
  created_at: string;
}

// Keeping for API contract documentation
export interface DbGoals {
  id: string;
  user_id: string;
  instagram: number;
  facebook: number;
  linkedin: number;
  email: number;
  call: number;
  walk_in: number;
}

interface DbScrapeJob {
  id: string;
  user_id: string;
  niche: string;
  location: string;
  lead_count: number;
  expanded_radius: boolean;
  status: string;
  created_at: string;
  // Result tracking fields
  leads_found: number | null;
  leads_imported: number | null;
  leads_skipped: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  // Progress tracking fields
  stage: string | null;
  progress: number | null;
  stage_message: string | null;
}

// Transform functions
const dbLeadToLead = (db: DbLead): Lead => ({
  id: db.id,
  companyName: db.company_name,
  contactName: db.contact_name || undefined,
  email: db.email || undefined,
  phone: db.phone || undefined,
  websiteUrl: db.website_url || undefined,
  instagramUrl: db.instagram_url || undefined,
  facebookUrl: db.facebook_url || undefined,
  linkedinUrl: db.linkedin_url || undefined,
  twitterUrl: db.twitter_url || undefined,
  youtubeUrl: db.youtube_url || undefined,
  tiktokUrl: db.tiktok_url || undefined,
  loomUrl: db.loom_url || undefined,
  address: db.address || undefined,
  location: db.location || undefined,
  zipCode: db.zip_code || undefined,
  country: db.country || undefined,
  niche: db.niche || undefined,
  category: db.category || undefined,
  googleRating: db.google_rating || undefined,
  googleReviewCount: db.google_review_count || undefined,
  ownerTitle: db.owner_title || undefined,
  executiveSummary: db.executive_summary || undefined,
  searchQuery: db.search_query || undefined,
  strategyId: db.strategy_id || undefined,
  currentStepIndex: db.current_step_index,
  completedStepIndexes: db.completed_step_indexes || [],
  nextTaskDate: db.next_task_date || undefined,
  nextTaskNote: db.next_task_note || undefined,
  status: db.status as Lead['status'],
  lastActivityAt: db.last_activity_at || undefined,
  createdAt: db.created_at,
});

const leadToDbLead = (lead: Lead, userId: string): Partial<DbLead> => ({
  id: lead.id,
  user_id: userId,
  company_name: lead.companyName,
  contact_name: lead.contactName || null,
  email: lead.email || null,
  phone: lead.phone || null,
  website_url: lead.websiteUrl || null,
  instagram_url: lead.instagramUrl || null,
  facebook_url: lead.facebookUrl || null,
  linkedin_url: lead.linkedinUrl || null,
  twitter_url: lead.twitterUrl || null,
  youtube_url: lead.youtubeUrl || null,
  tiktok_url: lead.tiktokUrl || null,
  loom_url: lead.loomUrl || null,
  address: lead.address || null,
  location: lead.location || null,
  zip_code: lead.zipCode || null,
  country: lead.country || null,
  niche: lead.niche || null,
  category: lead.category || null,
  google_rating: lead.googleRating || null,
  google_review_count: lead.googleReviewCount || null,
  owner_title: lead.ownerTitle || null,
  executive_summary: lead.executiveSummary || null,
  search_query: lead.searchQuery || null,
  strategy_id: lead.strategyId || null,
  current_step_index: lead.currentStepIndex,
  completed_step_indexes: lead.completedStepIndexes || [],
  next_task_date: lead.nextTaskDate || null,
  next_task_note: lead.nextTaskNote || null,
  status: lead.status,
  created_at: lead.createdAt,
});

const dbActivityToActivity = (db: DbActivity): Activity => ({
  id: db.id,
  leadId: db.lead_id,
  action: db.action,
  platform: db.platform as Activity['platform'],
  note: db.note || undefined,
  isFirstOutreach: db.is_first_outreach,
  timestamp: db.timestamp,
  direction: (db.direction as Activity['direction']) || 'outbound',
});

const activityToDbActivity = (activity: Activity, userId: string): Partial<DbActivity> => ({
  id: activity.id,
  user_id: userId,
  lead_id: activity.leadId,
  action: activity.action,
  platform: activity.platform || null,
  note: activity.note || null,
  is_first_outreach: activity.isFirstOutreach || false,
  timestamp: activity.timestamp,
  direction: activity.direction || 'outbound',
});

const dbStrategyToStrategy = (db: DbStrategy): Strategy => ({
  id: db.id,
  name: db.name,
  description: db.description || '',
  steps: db.steps,
  color: (db.color as Strategy['color']) || 'indigo',
});

const strategyToDbStrategy = (strategy: Strategy, userId: string): Partial<DbStrategy> => ({
  id: strategy.id,
  user_id: userId,
  name: strategy.name,
  description: strategy.description,
  steps: strategy.steps,
  color: strategy.color,
});

// Terminal statuses that stop future tasks from being generated
// When a lead reaches one of these statuses, we clear next_task_date
// but keep strategyId and currentStepIndex for reporting purposes
const TERMINAL_STATUSES: Lead['status'][] = ['replied', 'qualified', 'disqualified'];

const dbScrapeJobToScrapeJob = (db: DbScrapeJob): ScrapeJob => ({
  id: db.id,
  niche: db.niche,
  location: db.location,
  leadCount: db.lead_count,
  expandedRadius: db.expanded_radius,
  status: db.status as ScrapeJob['status'],
  createdAt: db.created_at,
  leadsFound: db.leads_found ?? undefined,
  leadsImported: db.leads_imported ?? undefined,
  leadsSkipped: db.leads_skipped ?? undefined,
  errorMessage: db.error_message ?? undefined,
  startedAt: db.started_at ?? undefined,
  completedAt: db.completed_at ?? undefined,
  stage: (db.stage as ScrapeJob['stage']) ?? undefined,
  progress: db.progress ?? undefined,
  stageMessage: db.stage_message ?? undefined,
});

// Tasks / Dashboard API
export async function getDueTasks(userId: string): Promise<Lead[]> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .lte('next_task_date', today.toISOString())
    .order('next_task_date', { ascending: true })
    .limit(500); // SECURITY: Prevent unbounded queries

  if (error) throw error;
  return (data || []).map(dbLeadToLead);
}

/**
 * Get all scheduled tasks including upcoming ones.
 * Fetches in_progress leads with a next_task_date set.
 * Limited to most recent 500 for performance.
 */
export async function getAllScheduledTasks(userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .not('next_task_date', 'is', null)
    .order('next_task_date', { ascending: true })
    .limit(500);

  if (error) throw error;
  return (data || []).map(dbLeadToLead);
}

/**
 * Get task counts by category (overdue, today, upcoming).
 * More efficient than fetching all tasks just for counts.
 */
export async function getTaskCounts(userId: string): Promise<{ overdue: number; today: number; upcoming: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Run count queries in parallel
  const [overdueResult, todayResult, upcomingResult] = await Promise.all([
    // Overdue: before today
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .lt('next_task_date', todayStr),

    // Today: on today
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .gte('next_task_date', todayStr)
      .lt('next_task_date', tomorrowStr),

    // Upcoming: after today
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .gte('next_task_date', tomorrowStr),
  ]);

  if (overdueResult.error) throw overdueResult.error;
  if (todayResult.error) throw todayResult.error;
  if (upcomingResult.error) throw upcomingResult.error;

  return {
    overdue: overdueResult.count || 0,
    today: todayResult.count || 0,
    upcoming: upcomingResult.count || 0,
  };
}


// Leads API
export async function checkDuplicateCompanies(userId: string, companyNames: string[]): Promise<string[]> {
  if (companyNames.length === 0) return [];

  // Batch company names into chunks of 100 to avoid URL length limits
  const BATCH_SIZE = 100;
  const batches: string[][] = [];

  for (let i = 0; i < companyNames.length; i += BATCH_SIZE) {
    batches.push(companyNames.slice(i, i + BATCH_SIZE));
  }

  // Run batch queries in parallel
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const { data, error } = await supabase
        .from('leads')
        .select('company_name')
        .eq('user_id', userId)
        .in('company_name', batch);

      if (error) throw error;
      return (data || []).map(row => row.company_name);
    })
  );

  // Flatten results from all batches
  return batchResults.flat();
}

/**
 * Get leads for a user.
 * @deprecated Use getLeadsPaginated for large datasets - this loads all leads into memory
 */
export async function getLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5000); // SECURITY: Prevent unbounded queries

  if (error) throw error;
  return (data || []).map(dbLeadToLead);
}

export async function createLead(lead: Lead, userId: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(leadToDbLead(lead, userId))
    .select()
    .single();

  if (error) throw error;
  return dbLeadToLead(data);
}

export async function createLeads(leads: Lead[], userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .insert(leads.map(l => leadToDbLead(l, userId)))
    .select();

  if (error) throw error;
  return (data || []).map(dbLeadToLead);
}

export async function updateLead(lead: Lead, userId: string): Promise<Lead> {
  // Auto-stop: When status changes to a terminal status, clear next_task_date
  // This prevents further tasks from appearing in TaskQueue
  // We keep strategyId and currentStepIndex for reporting purposes
  const leadToUpdate = { ...lead };
  if (TERMINAL_STATUSES.includes(lead.status)) {
    leadToUpdate.nextTaskDate = undefined;
  }

  const { data, error } = await supabase
    .from('leads')
    .update(leadToDbLead(leadToUpdate, userId))
    .eq('id', lead.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbLeadToLead(data);
}

export async function deleteLead(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// ============================================
// BULK OPERATIONS
// For efficient multi-lead updates
// ============================================

/**
 * Bulk delete multiple leads at once.
 * Uses Supabase .in() operator for efficient deletion.
 * Chunks large batches to avoid query limits.
 */
export async function deleteLeads(ids: string[], userId: string): Promise<void> {
  if (ids.length === 0) return;

  const BATCH_SIZE = 1000;

  // Process in batches to avoid query limits on large deletions
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', batch)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

/**
 * Bulk update status for multiple leads.
 * Handles terminal status auto-stop (clears next_task_date).
 * Chunks large batches to avoid query limits.
 */
export async function updateLeadsStatus(
  ids: string[],
  status: Lead['status'],
  userId: string
): Promise<void> {
  if (ids.length === 0) return;

  const BATCH_SIZE = 1000;
  const updateData: Record<string, unknown> = { status };

  // Terminal statuses clear next_task_date (Auto-Stop)
  if (TERMINAL_STATUSES.includes(status)) {
    updateData.next_task_date = null;
  }

  // Process in batches to avoid query limits
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .in('id', batch)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

/**
 * Bulk assign strategy to multiple leads.
 * Resets progress to step 0 and clears scheduling.
 * Chunks large batches to avoid query limits.
 */
export async function updateLeadsStrategy(
  ids: string[],
  strategyId: string | null,
  userId: string
): Promise<void> {
  if (ids.length === 0) return;

  const BATCH_SIZE = 1000;
  const updateData = {
    strategy_id: strategyId,
    current_step_index: strategyId ? 0 : null,
    next_task_date: null, // Will be set when user schedules
  };

  // Process in batches to avoid query limits
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .in('id', batch)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

/**
 * Bulk update arbitrary fields on multiple leads.
 * Used for updating location, niche, category, etc.
 */
export async function bulkUpdateLeadFields(
  ids: string[],
  updates: Partial<Pick<Lead, 'location' | 'niche' | 'category'>>,
  userId: string
): Promise<void> {
  if (ids.length === 0) return;
  if (Object.keys(updates).length === 0) return;

  // Convert camelCase to snake_case for DB
  const dbUpdates: Record<string, unknown> = {};
  if (updates.location !== undefined) dbUpdates.location = updates.location || null;
  if (updates.niche !== undefined) dbUpdates.niche = updates.niche || null;
  if (updates.category !== undefined) dbUpdates.category = updates.category || null;

  const { error } = await supabase
    .from('leads')
    .update(dbUpdates)
    .in('id', ids)
    .eq('user_id', userId);

  if (error) throw error;
}

// Activities API
/**
 * Get activities for a user.
 * @deprecated Use getActivitiesPaginated for large datasets
 */
export async function getActivities(userId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1000); // SECURITY: Prevent unbounded queries

  if (error) throw error;
  return (data || []).map(dbActivityToActivity);
}

export async function createActivity(activity: Activity, userId: string): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(activityToDbActivity(activity, userId))
    .select()
    .single();

  if (error) throw error;
  return dbActivityToActivity(data);
}

// Strategies API
export async function getStrategies(userId: string): Promise<Strategy[]> {
  const { data, error } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbStrategyToStrategy);
}

export async function createStrategy(strategy: Strategy, userId: string): Promise<Strategy> {
  const { data, error } = await supabase
    .from('strategies')
    .insert(strategyToDbStrategy(strategy, userId))
    .select()
    .single();

  if (error) throw error;
  return dbStrategyToStrategy(data);
}

export async function updateStrategy(strategy: Strategy, userId: string): Promise<Strategy> {
  const { data, error } = await supabase
    .from('strategies')
    .update(strategyToDbStrategy(strategy, userId))
    .eq('id', strategy.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbStrategyToStrategy(data);
}

export async function deleteStrategy(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('strategies')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// Goals API
export async function getGoals(userId: string): Promise<OutreachGoals | null> {
  const { data, error } = await supabase
    .from('outreach_goals')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return {
    instagram: data.instagram,
    facebook: data.facebook,
    linkedin: data.linkedin,
    email: data.email,
    call: data.call,
    walkIn: data.walk_in,
  };
}

export async function updateGoals(goals: OutreachGoals, userId: string): Promise<void> {
  const { error } = await supabase
    .from('outreach_goals')
    .update({
      instagram: goals.instagram,
      facebook: goals.facebook,
      linkedin: goals.linkedin,
      email: goals.email,
      call: goals.call,
      walk_in: goals.walkIn,
    })
    .eq('user_id', userId);

  if (error) throw error;
}

// Scrape Jobs API
export async function getScrapeJobs(userId: string): Promise<ScrapeJob[]> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return (data || []).map(dbScrapeJobToScrapeJob);
}

export async function getScrapeJob(jobId: string, userId: string): Promise<ScrapeJob | null> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return dbScrapeJobToScrapeJob(data);
}

export async function createScrapeJob(job: Omit<ScrapeJob, 'id' | 'createdAt' | 'status'>, userId: string): Promise<ScrapeJob> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .insert({
      user_id: userId,
      niche: job.niche,
      location: job.location,
      lead_count: job.leadCount,
      expanded_radius: job.expandedRadius,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;

  return dbScrapeJobToScrapeJob(data);
}

export async function updateScrapeJobStatus(
  jobId: string,
  userId: string,
  status: ScrapeJob['status']
): Promise<void> {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({ status })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function cancelScrapeJob(jobId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'failed',
      error_message: 'Manually stopped by user',
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Get the total number of leads scraped this month for a user.
 * Used for enforcing the free tier scrape limit (100 leads/month).
 */
export async function getScrapeUsageThisMonth(userId: string): Promise<number> {
  // Get the first day of the current month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('leads_imported')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', firstDayOfMonth);

  if (error) throw error;

  // Sum up all leads_imported values
  return (data || []).reduce((sum, job) => sum + (job.leads_imported || 0), 0);
}

/**
 * Get the URL scrape usage this month for a user.
 * Used for the Quick Import feature limit (20/month for free users).
 */
export async function getUrlScrapeUsageThisMonth(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('url_scrapes_this_month, url_scrapes_reset_at')
    .eq('id', userId)
    .single();

  if (error) throw error;

  // Check if we need to consider a monthly reset
  const now = new Date();
  const resetAt = data.url_scrapes_reset_at ? new Date(data.url_scrapes_reset_at) : new Date(0);
  const monthsSinceReset = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());

  // If it's been a month or more, the count is effectively 0
  if (monthsSinceReset >= 1) {
    return 0;
  }

  return data.url_scrapes_this_month || 0;
}

/**
 * Check for stale jobs (processing for more than 15 minutes) and mark them as timed out.
 * Returns array of job IDs that were marked as timed out.
 */
export async function checkAndTimeoutStaleJobs(userId: string): Promise<string[]> {
  const TIMEOUT_MINUTES = 15;
  const timeoutThreshold = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000).toISOString();

  // Find jobs that are still 'processing' but started more than 15 minutes ago
  const { data: staleJobs, error: fetchError } = await supabase
    .from('scrape_jobs')
    .select('id, started_at')
    .eq('user_id', userId)
    .eq('status', 'processing')
    .lt('started_at', timeoutThreshold);

  if (fetchError || !staleJobs || staleJobs.length === 0) {
    return [];
  }

  const timedOutIds: string[] = [];

  // Mark each stale job as failed due to timeout
  for (const job of staleJobs) {
    const { error: updateError } = await supabase
      .from('scrape_jobs')
      .update({
        status: 'failed',
        error_message: 'Timed out: No response from scraper after 15 minutes',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .eq('user_id', userId);

    if (!updateError) {
      timedOutIds.push(job.id);
      console.warn(`Job ${job.id} marked as timed out`);
    }
  }

  return timedOutIds;
}

/**
 * Subscribe to realtime updates for scrape jobs.
 * Returns an unsubscribe function.
 */
export function subscribeScrapeJobUpdates(
  userId: string,
  onUpdate: (job: ScrapeJob) => void
): () => void {
  console.warn('[Realtime] Subscribing to scrape_jobs updates for user:', userId);

  const channel = supabase
    .channel(`scrape_jobs:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'scrape_jobs',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.warn('[Realtime] Received update:', payload.new);
        const db = payload.new as DbScrapeJob;
        onUpdate(dbScrapeJobToScrapeJob(db));
      }
    )
    .subscribe((status) => {
      console.warn('[Realtime] Subscription status:', status);
    });

  // Return unsubscribe function
  return () => {
    console.warn('[Realtime] Unsubscribing from scrape_jobs');
    supabase.removeChannel(channel);
  };
}

// ============================================
// PAGINATED API FUNCTIONS
// For scaling to 10k+ leads per user
// ============================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export type SortField = 'created_at' | 'company_name' | 'google_rating' | 'status' | 'last_activity_at';
export type SortDirection = 'asc' | 'desc';

export interface LeadFilters extends PaginationParams {
  // Text search across multiple fields
  search?: string;

  // Multi-select filters (array-based for Excel-style filtering)
  status?: string[];           // Multiple statuses e.g. ['in_progress', 'replied']
  strategyId?: string[];       // Multiple strategies (use 'none' for unassigned)
  location?: string[];         // Multiple locations
  niche?: string[];            // Multiple industries/niches

  // Channel availability filters
  channels?: ('has_instagram' | 'has_facebook' | 'has_linkedin' | 'has_email' | 'has_phone')[];

  // Rating range filter
  ratingMin?: number;
  ratingMax?: number;

  // Activity recency filter (stale lead detection)
  staleDays?: number;          // Filter leads with no activity in X days

  // Multi-column sorting
  sortBy?: SortField[];
  sortDirection?: SortDirection[];
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

/**
 * Paginated leads query with server-side filtering.
 * Much more efficient than client-side filtering for large datasets.
 * Supports Excel-style multi-select filters with array-based parameters.
 */
export async function getLeadsPaginated(
  userId: string,
  filters: LeadFilters = {}
): Promise<PaginatedResponse<Lead>> {
  const {
    limit = 50,
    offset = 0,
    status,
    strategyId,
    location,
    niche,
    channels,
    ratingMin,
    ratingMax,
    staleDays,
    search,
    sortBy = ['created_at'],
    sortDirection = ['desc']
  } = filters;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Apply multi-column sort
  sortBy.forEach((field, index) => {
    const direction = sortDirection[index] || 'desc';
    query = query.order(field, { ascending: direction === 'asc' });
  });

  // Final stable sort by id
  query = query.order('id', { ascending: true });

  query = query.range(offset, offset + limit - 1);

  // Apply status filter (multi-select)
  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  // Apply strategy filter (multi-select, handle 'none' for unassigned)
  if (strategyId && strategyId.length > 0) {
    const hasNone = strategyId.includes('none');
    const actualIds = strategyId.filter(id => id !== 'none');

    if (hasNone && actualIds.length > 0) {
      // Include both unassigned AND specific strategies
      query = query.or(`strategy_id.is.null,strategy_id.in.(${actualIds.join(',')})`);
    } else if (hasNone) {
      // Only unassigned leads
      query = query.is('strategy_id', null);
    } else {
      // Only specific strategies
      query = query.in('strategy_id', actualIds);
    }
  }

  // Apply location filter (multi-select)
  if (location && location.length > 0) {
    query = query.in('location', location);
  }

  // Apply niche/industry filter (multi-select)
  if (niche && niche.length > 0) {
    query = query.in('niche', niche);
  }

  // Apply channel availability filters
  if (channels && channels.length > 0) {
    channels.forEach(channel => {
      switch (channel) {
        case 'has_instagram':
          query = query.not('instagram_url', 'is', null);
          break;
        case 'has_facebook':
          query = query.not('facebook_url', 'is', null);
          break;
        case 'has_linkedin':
          query = query.not('linkedin_url', 'is', null);
          break;
        case 'has_email':
          query = query.not('email', 'is', null);
          break;
        case 'has_phone':
          query = query.not('phone', 'is', null);
          break;
      }
    });
  }

  // Apply rating range filter
  if (ratingMin !== undefined) {
    query = query.gte('google_rating', ratingMin);
  }
  if (ratingMax !== undefined) {
    query = query.lte('google_rating', ratingMax);
  }

  // Apply stale lead filter (no activity in X days)
  if (staleDays !== undefined && staleDays > 0) {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);
    query = query.lt('last_activity_at', staleDate.toISOString());
  }

  // Apply search filter (searches multiple fields)
  // SECURITY: Wrap search term in double quotes to prevent PostgREST injection
  // Without quotes, input like "test,id.gte.0" could manipulate the query filter
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `company_name.ilike."${searchTerm}",contact_name.ilike."${searchTerm}",email.ilike."${searchTerm}",location.ilike."${searchTerm}",niche.ilike."${searchTerm}"`
    );
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []).map(dbLeadToLead),
    count: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Export all leads matching filters (no pagination limit).
 * Fetches in batches of 1000 to handle large datasets.
 * @param onProgress - Optional callback for progress updates (0-100)
 */
export async function exportAllLeads(
  userId: string,
  filters: Omit<LeadFilters, 'limit' | 'offset'> = {},
  onProgress?: (progress: number) => void
): Promise<Lead[]> {
  const BATCH_SIZE = 1000;
  const allLeads: Lead[] = [];
  let offset = 0;
  let hasMore = true;
  let totalCount = 0;

  // First, get the total count
  const countResult = await getLeadsPaginated(userId, { ...filters, limit: 1, offset: 0 });
  totalCount = countResult.count;

  if (totalCount === 0) return [];

  while (hasMore) {
    const result = await getLeadsPaginated(userId, {
      ...filters,
      limit: BATCH_SIZE,
      offset,
    });

    allLeads.push(...result.data);
    offset += BATCH_SIZE;
    hasMore = result.hasMore;

    // Report progress
    if (onProgress) {
      const progress = Math.min(100, Math.round((allLeads.length / totalCount) * 100));
      onProgress(progress);
    }
  }

  return allLeads;
}

/**
 * Get activities for a specific lead with pagination.
 * Useful for leads with extensive activity history.
 */
export async function getActivitiesByLead(
  userId: string,
  leadId: string,
  params: PaginationParams = {}
): Promise<PaginatedResponse<Activity>> {
  const { limit = 20, offset = 0 } = params;

  const { data, error, count } = await supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: (data || []).map(dbActivityToActivity),
    count: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get paginated activities for reporting/analytics.
 */
export async function getActivitiesPaginated(
  userId: string,
  params: PaginationParams & { startDate?: string; endDate?: string } = {}
): Promise<PaginatedResponse<Activity>> {
  const { limit = 100, offset = 0, startDate, endDate } = params;

  let query = supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startDate) {
    query = query.gte('timestamp', startDate);
  }
  if (endDate) {
    query = query.lte('timestamp', endDate);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: (data || []).map(dbActivityToActivity),
    count: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}

/**
 * Get lead counts by status for dashboard stats.
 * Uses parallel count queries - much more efficient than fetching all leads.
 */
export async function getLeadCountsByStatus(
  userId: string
): Promise<Record<Lead['status'], number>> {
  const statuses: Lead['status'][] = ['not_contacted', 'in_progress', 'replied', 'qualified', 'disqualified'];

  // Run all count queries in parallel for efficiency
  const countPromises = statuses.map(async (status) => {
    const { count, error } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', status);

    if (error) throw error;
    return { status, count: count || 0 };
  });

  const results = await Promise.all(countPromises);

  const counts: Record<Lead['status'], number> = {
    not_contacted: 0,
    in_progress: 0,
    replied: 0,
    qualified: 0,
    disqualified: 0,
  };

  results.forEach(({ status, count }) => {
    counts[status] = count;
  });

  return counts;
}

export async function getLead(id: string, userId: string): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return dbLeadToLead(data);
}

// ============================================
// USER API KEYS
// For scraping workflow integration
// ============================================

export interface UserApiKeys {
  apifyToken: string | null;
  anthropicKey: string | null;
}

/**
 * Get user's API keys for scraping workflow.
 */
export async function getUserApiKeys(userId: string): Promise<UserApiKeys> {
  const { data, error } = await supabase
    .from('profiles')
    .select('apify_api_token, anthropic_api_key')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  return {
    apifyToken: data?.apify_api_token || null,
    anthropicKey: data?.anthropic_api_key || null,
  };
}

/**
 * Update user's API keys for scraping workflow.
 */
export async function updateUserApiKeys(
  userId: string,
  keys: Partial<UserApiKeys>
): Promise<void> {
  const updateData: Record<string, string | null> = {};

  if (keys.apifyToken !== undefined) {
    updateData.apify_api_token = keys.apifyToken;
  }
  if (keys.anthropicKey !== undefined) {
    updateData.anthropic_api_key = keys.anthropicKey;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Check if user has API keys configured for scraping.
 */
export async function hasApiKeysConfigured(userId: string): Promise<boolean> {
  const keys = await getUserApiKeys(userId);
  return !!(keys.apifyToken && keys.anthropicKey);
}

// ============================================
// UNIQUE VALUES FOR COLUMN FILTERS
// For Excel-style dropdown options
// ============================================

export type FilterColumn = 'location' | 'niche' | 'status';

/**
 * Get unique values for a column to populate filter dropdowns.
 * Results are sorted alphabetically and limited to prevent huge lists.
 */
export async function getUniqueColumnValues(
  userId: string,
  column: FilterColumn
): Promise<string[]> {
  const columnMap: Record<FilterColumn, string> = {
    location: 'location',
    niche: 'niche',
    status: 'status',
  };

  const dbColumn = columnMap[column];

  // Use a raw query with DISTINCT for efficiency
  const { data, error } = await supabase
    .from('leads')
    .select(dbColumn)
    .eq('user_id', userId)
    .not(dbColumn, 'is', null)
    .order(dbColumn, { ascending: true })
    .limit(500);

  if (error) throw error;

  // Extract unique values (Supabase doesn't have DISTINCT, so we dedupe client-side)
  const values = new Set<string>();
  (data || []).forEach(row => {
    const value = row[dbColumn as keyof typeof row];
    if (value && typeof value === 'string' && value.trim()) {
      values.add(value.trim());
    }
  });

  return Array.from(values).sort((a, b) => a.localeCompare(b));
}

// ============================================
// TWILIO CREDENTIALS
// For cold calling integration
// ============================================

interface DbTwilioCredentials {
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_twiml_app_sid: string | null;
  twilio_phone_number: string | null;
}

/**
 * Get user's Twilio credentials for calling.
 */
export async function getTwilioCredentials(userId: string): Promise<TwilioCredentials | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid, twilio_phone_number')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const creds = data as DbTwilioCredentials;

  // Only return if all credentials are present
  if (!creds.twilio_account_sid || !creds.twilio_auth_token || !creds.twilio_twiml_app_sid || !creds.twilio_phone_number) {
    return null;
  }

  return {
    accountSid: creds.twilio_account_sid,
    authToken: creds.twilio_auth_token,
    twimlAppSid: creds.twilio_twiml_app_sid,
    phoneNumber: creds.twilio_phone_number,
  };
}

/**
 * Update user's Twilio credentials.
 * Uses edge function for encrypted storage.
 */
export async function updateTwilioCredentials(
  _userId: string,
  creds: TwilioCredentials
): Promise<void> {
  const session = await getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/save-twilio-credentials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accountSid: creds.accountSid,
      authToken: creds.authToken,
      twimlAppSid: creds.twimlAppSid,
      phoneNumber: creds.phoneNumber,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to save Twilio credentials');
  }
}

/**
 * Check if user has Twilio configured for calling.
 */
export async function hasTwilioConfigured(userId: string): Promise<boolean> {
  const creds = await getTwilioCredentials(userId);
  return creds !== null;
}

/**
 * Clear user's Twilio credentials.
 */
export async function clearTwilioCredentials(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      twilio_account_sid: null,
      twilio_auth_token: null,
      twilio_twiml_app_sid: null,
      twilio_phone_number: null,
    })
    .eq('id', userId);

  if (error) throw error;
}

// ============================================
// CALL RECORDS
// For tracking call history and metrics
// ============================================

interface DbCallRecord {
  id: string;
  user_id: string;
  lead_id: string;
  twilio_call_sid: string | null;
  from_number: string;
  to_number: string;
  outcome: string | null;
  status: string;
  duration_seconds: number | null;
  recording_url: string | null;
  recording_saved: boolean;
  transcription: string | null;
  ai_summary: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
}

const dbCallRecordToCallRecord = (db: DbCallRecord): CallRecord => ({
  id: db.id,
  userId: db.user_id,
  leadId: db.lead_id,
  twilioCallSid: db.twilio_call_sid || undefined,
  fromNumber: db.from_number,
  toNumber: db.to_number,
  outcome: db.outcome as CallRecord['outcome'],
  status: db.status as CallRecord['status'],
  durationSeconds: db.duration_seconds || undefined,
  recordingUrl: db.recording_url || undefined,
  recordingSaved: db.recording_saved,
  transcription: db.transcription || undefined,
  aiSummary: db.ai_summary || undefined,
  notes: db.notes || undefined,
  startedAt: db.started_at,
  endedAt: db.ended_at || undefined,
});

/**
 * Create a new call record when initiating a call.
 */
export async function createCallRecord(
  userId: string,
  leadId: string,
  fromNumber: string,
  toNumber: string
): Promise<CallRecord> {
  const { data, error } = await supabase
    .from('call_records')
    .insert({
      user_id: userId,
      lead_id: leadId,
      from_number: fromNumber,
      to_number: toNumber,
      status: 'initiated',
    })
    .select()
    .single();

  if (error) throw error;
  return dbCallRecordToCallRecord(data);
}

/**
 * Update a call record with status, outcome, duration, etc.
 */
export async function updateCallRecord(
  callId: string,
  userId: string,
  updates: Partial<Omit<CallRecord, 'id' | 'userId' | 'leadId'>>
): Promise<CallRecord> {
  const dbUpdates: Partial<DbCallRecord> = {};

  if (updates.twilioCallSid !== undefined) dbUpdates.twilio_call_sid = updates.twilioCallSid || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome || null;
  if (updates.durationSeconds !== undefined) dbUpdates.duration_seconds = updates.durationSeconds || null;
  if (updates.recordingUrl !== undefined) dbUpdates.recording_url = updates.recordingUrl || null;
  if (updates.recordingSaved !== undefined) dbUpdates.recording_saved = updates.recordingSaved;
  if (updates.transcription !== undefined) dbUpdates.transcription = updates.transcription || null;
  if (updates.aiSummary !== undefined) dbUpdates.ai_summary = updates.aiSummary || null;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
  if (updates.endedAt !== undefined) dbUpdates.ended_at = updates.endedAt || null;

  const { data, error } = await supabase
    .from('call_records')
    .update(dbUpdates)
    .eq('id', callId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbCallRecordToCallRecord(data);
}

/**
 * Get call records for a specific lead.
 */
export async function getCallsByLead(
  userId: string,
  leadId: string
): Promise<CallRecord[]> {
  const { data, error } = await supabase
    .from('call_records')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('started_at', { ascending: false })
    .limit(50); // Prevent unbounded queries

  if (error) throw error;
  return (data || []).map(dbCallRecordToCallRecord);
}

/**
 * Get a single call record by ID.
 */
export async function getCallRecord(
  callId: string,
  userId: string
): Promise<CallRecord | null> {
  const { data, error } = await supabase
    .from('call_records')
    .select('*')
    .eq('id', callId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return dbCallRecordToCallRecord(data);
}

/**
 * Get call metrics for reporting/analytics.
 */
export async function getCallMetrics(
  userId: string,
  dateRange?: { start: Date; end: Date }
): Promise<CallMetrics> {
  let query = supabase
    .from('call_records')
    .select('outcome, duration_seconds')
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (dateRange) {
    query = query.gte('started_at', dateRange.start.toISOString());
    query = query.lte('started_at', dateRange.end.toISOString());
  }

  const { data, error } = await query;

  if (error) throw error;

  const records = data || [];
  const metrics: CallMetrics = {
    totalCalls: records.length,
    connected: 0,
    voicemail: 0,
    noAnswer: 0,
    busy: 0,
    wrongNumber: 0,
    totalTalkTimeSeconds: 0,
    connectRate: 0,
  };

  records.forEach(record => {
    switch (record.outcome) {
      case 'connected':
        metrics.connected++;
        metrics.totalTalkTimeSeconds += record.duration_seconds || 0;
        break;
      case 'voicemail':
        metrics.voicemail++;
        break;
      case 'no_answer':
        metrics.noAnswer++;
        break;
      case 'busy':
        metrics.busy++;
        break;
      case 'wrong_number':
        metrics.wrongNumber++;
        break;
    }
  });

  metrics.connectRate = metrics.totalCalls > 0
    ? (metrics.connected / metrics.totalCalls) * 100
    : 0;

  return metrics;
}

// ============================================
// STRATEGY PERFORMANCE ANALYTICS
// ============================================

/**
 * Get performance metrics for all strategies.
 * Uses server-side SQL aggregation for efficiency at scale.
 */
export async function getStrategyPerformance(userId: string): Promise<StrategyPerformance[]> {
  const { data, error } = await supabase.rpc('get_strategy_performance_stats', {
    p_user_id: userId,
  });

  if (error) throw error;

  // Map RPC response to StrategyPerformance type
  return (data || []).map((row: {
    strategy_id: string;
    strategy_name: string;
    leads_assigned: number;
    leads_contacted: number;
    leads_replied: number;
    leads_qualified: number;
    response_rate: number;
    qualification_rate: number;
  }) => ({
    strategyId: row.strategy_id,
    strategyName: row.strategy_name,
    leadsAssigned: Number(row.leads_assigned),
    leadsContacted: Number(row.leads_contacted),
    leadsReplied: Number(row.leads_replied),
    leadsQualified: Number(row.leads_qualified),
    responseRate: Number(row.response_rate),
    qualificationRate: Number(row.qualification_rate),
  }));
}

// ============================================
// EMAIL AUTOMATION
// Gmail OAuth and Resend credentials management
// ============================================

interface DbGmailCredentials {
  gmail_access_token: string | null;
  gmail_refresh_token: string | null;
  gmail_token_expires_at: string | null;
  gmail_email: string | null;
}

interface DbResendCredentials {
  resend_api_key: string | null;
  resend_from_address: string | null;
}

/**
 * Get user's Gmail OAuth credentials.
 */
export async function getGmailCredentials(userId: string): Promise<GmailCredentials | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('gmail_access_token, gmail_refresh_token, gmail_token_expires_at, gmail_email')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const creds = data as DbGmailCredentials;

  // Only return if all credentials are present
  if (!creds.gmail_access_token || !creds.gmail_refresh_token || !creds.gmail_token_expires_at || !creds.gmail_email) {
    return null;
  }

  return {
    accessToken: creds.gmail_access_token,
    refreshToken: creds.gmail_refresh_token,
    expiresAt: creds.gmail_token_expires_at,
    email: creds.gmail_email,
  };
}

/**
 * Update user's Gmail OAuth credentials.
 * SECURITY: Tokens are stored server-side only via edge functions.
 * This function now only updates email and provider from client.
 */
export async function updateGmailCredentials(
  userId: string,
  creds: GmailCredentials
): Promise<void> {
  // Only update email and provider - tokens are stored by edge function
  // The edge function already handles token storage securely
  const updateData: Record<string, string> = {
    gmail_email: creds.email,
    email_provider: 'gmail',
  };

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Clear user's Gmail OAuth credentials.
 */
export async function clearGmailCredentials(userId: string): Promise<void> {
  // Get current provider to check if we need to clear it
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_provider')
    .eq('id', userId)
    .single();

  const updates: Record<string, unknown> = {
    gmail_access_token: null,
    gmail_refresh_token: null,
    gmail_token_expires_at: null,
    gmail_email: null,
  };

  // If Gmail was the active provider, clear it
  if (profile?.email_provider === 'gmail') {
    updates.email_provider = null;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Get user's Resend API credentials.
 */
export async function getResendCredentials(userId: string): Promise<ResendCredentials | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('resend_api_key, resend_from_address')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  const creds = data as DbResendCredentials;

  // Only return if both credentials are present
  if (!creds.resend_api_key || !creds.resend_from_address) {
    return null;
  }

  return {
    apiKey: creds.resend_api_key,
    fromAddress: creds.resend_from_address,
  };
}

/**
 * Update user's Resend API credentials.
 * Uses edge function for encrypted storage.
 */
export async function updateResendCredentials(
  _userId: string,
  creds: ResendCredentials
): Promise<void> {
  const session = await getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/save-resend-credentials`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      apiKey: creds.apiKey,
      fromEmail: creds.fromAddress,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to save Resend credentials');
  }

  // Also update the email provider setting locally
  const { error } = await supabase
    .from('profiles')
    .update({
      email_provider: 'resend',
    })
    .eq('id', session.user.id);

  if (error) throw error;
}

/**
 * Clear user's Resend API credentials.
 */
export async function clearResendCredentials(userId: string): Promise<void> {
  // Get current provider to check if we need to clear it
  const { data: profile } = await supabase
    .from('profiles')
    .select('email_provider')
    .eq('id', userId)
    .single();

  const updates: Record<string, unknown> = {
    resend_api_key: null,
    resend_from_address: null,
  };

  // If Resend was the active provider, clear it
  if (profile?.email_provider === 'resend') {
    updates.email_provider = null;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Get user's current email provider preference.
 */
export async function getEmailProvider(userId: string): Promise<EmailProvider> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email_provider')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return (data.email_provider as EmailProvider) || null;
}

/**
 * Set user's email provider preference.
 */
export async function setEmailProvider(
  userId: string,
  provider: EmailProvider
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ email_provider: provider })
    .eq('id', userId);

  if (error) throw error;
}

/**
 * Check if user has any email provider configured.
 */
export async function hasEmailConfigured(userId: string): Promise<boolean> {
  const [gmail, resend] = await Promise.all([
    getGmailCredentials(userId),
    getResendCredentials(userId),
  ]);

  return gmail !== null || resend !== null;
}

// ============================================================================
// Lead Tags API
// ============================================================================

interface DbLeadTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// DbLeadTagAssignment kept for documentation
// interface DbLeadTagAssignment {
//   lead_id: string;
//   tag_id: string;
//   created_at: string;
// }

const dbTagToTag = (db: DbLeadTag): LeadTag => ({
  id: db.id,
  name: db.name,
  color: db.color,
  createdAt: db.created_at,
});

/**
 * Get all tags for a user.
 */
export async function getLeadTags(userId: string): Promise<LeadTag[]> {
  const { data, error } = await supabase
    .from('lead_tags')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbTagToTag);
}

/**
 * Create a new tag.
 */
export async function createLeadTag(
  userId: string,
  name: string,
  color: string = '#6B7280'
): Promise<LeadTag> {
  const { data, error } = await supabase
    .from('lead_tags')
    .insert({
      user_id: userId,
      name: name.trim(),
      color,
    })
    .select()
    .single();

  if (error) throw error;
  return dbTagToTag(data);
}

/**
 * Update a tag's name or color.
 */
export async function updateLeadTag(
  userId: string,
  tagId: string,
  updates: { name?: string; color?: string }
): Promise<LeadTag> {
  const updateData: Partial<DbLeadTag> = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.color !== undefined) updateData.color = updates.color;

  const { data, error } = await supabase
    .from('lead_tags')
    .update(updateData)
    .eq('id', tagId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbTagToTag(data);
}

/**
 * Delete a tag (also removes all assignments).
 */
export async function deleteLeadTag(userId: string, tagId: string): Promise<void> {
  const { error } = await supabase
    .from('lead_tags')
    .delete()
    .eq('id', tagId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Assign a tag to a lead.
 */
export async function assignTagToLead(
  userId: string,
  leadId: string,
  tagId: string
): Promise<void> {
  // Verify the tag belongs to the user
  const { data: tagData, error: tagError } = await supabase
    .from('lead_tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', userId)
    .single();

  if (tagError || !tagData) {
    throw new Error('Tag not found or does not belong to user');
  }

  // Verify the lead belongs to the user (defense-in-depth)
  const { data: leadData, error: leadError } = await supabase
    .from('leads')
    .select('id')
    .eq('id', leadId)
    .eq('user_id', userId)
    .single();

  if (leadError || !leadData) {
    throw new Error('Lead not found or does not belong to user');
  }

  const { error } = await supabase
    .from('lead_tag_assignments')
    .insert({
      lead_id: leadId,
      tag_id: tagId,
    });

  // Ignore duplicate key errors (tag already assigned)
  if (error && error.code !== '23505') throw error;
}

/**
 * Remove a tag from a lead.
 */
export async function removeTagFromLead(
  userId: string,
  leadId: string,
  tagId: string
): Promise<void> {
  // Verify the tag belongs to the user
  const { data: tagData, error: tagError } = await supabase
    .from('lead_tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', userId)
    .single();

  if (tagError || !tagData) {
    throw new Error('Tag not found or does not belong to user');
  }

  const { error } = await supabase
    .from('lead_tag_assignments')
    .delete()
    .eq('lead_id', leadId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Get all tags assigned to a specific lead.
 */
export async function getTagsForLead(userId: string, leadId: string): Promise<LeadTag[]> {
  const { data, error } = await supabase
    .from('lead_tag_assignments')
    .select(`
      tag_id,
      lead_tags!inner (
        id,
        user_id,
        name,
        color,
        created_at
      )
    `)
    .eq('lead_id', leadId);

  if (error) throw error;

  // Filter to only tags owned by this user and transform
  // Supabase returns lead_tags as an object (not array) when using !inner join
  return (data || [])
    .filter((row) => {
      const tag = row.lead_tags as unknown as DbLeadTag;
      return tag.user_id === userId;
    })
    .map((row) => {
      const tag = row.lead_tags as unknown as DbLeadTag;
      return dbTagToTag(tag);
    });
}

/**
 * Get all lead IDs that have a specific tag.
 */
export async function getLeadIdsByTag(tagId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('lead_tag_assignments')
    .select('lead_id')
    .eq('tag_id', tagId);

  if (error) throw error;
  return (data || []).map((row: { lead_id: string }) => row.lead_id);
}

/**
 * Bulk assign a tag to multiple leads.
 */
export async function bulkAssignTag(
  userId: string,
  leadIds: string[],
  tagId: string
): Promise<void> {
  if (leadIds.length === 0) return;

  // Verify the tag belongs to the user
  const { data: tagData, error: tagError } = await supabase
    .from('lead_tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', userId)
    .single();

  if (tagError || !tagData) {
    throw new Error('Tag not found or does not belong to user');
  }

  // Verify all leads belong to the user (defense-in-depth)
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('id')
    .eq('user_id', userId)
    .in('id', leadIds);

  if (leadsError) throw leadsError;

  // Only assign to leads that belong to the user
  const validLeadIds = new Set((leadsData || []).map(l => l.id));
  const filteredLeadIds = leadIds.filter(id => validLeadIds.has(id));

  if (filteredLeadIds.length === 0) return;

  const assignments = filteredLeadIds.map(leadId => ({
    lead_id: leadId,
    tag_id: tagId,
  }));

  const { error } = await supabase
    .from('lead_tag_assignments')
    .upsert(assignments, { onConflict: 'lead_id,tag_id' });

  if (error) throw error;
}

/**
 * Bulk remove a tag from multiple leads.
 */
export async function bulkRemoveTag(
  userId: string,
  leadIds: string[],
  tagId: string
): Promise<void> {
  if (leadIds.length === 0) return;

  // Verify the tag belongs to the user
  const { data: tagData, error: tagError } = await supabase
    .from('lead_tags')
    .select('id')
    .eq('id', tagId)
    .eq('user_id', userId)
    .single();

  if (tagError || !tagData) {
    throw new Error('Tag not found or does not belong to user');
  }

  const { error } = await supabase
    .from('lead_tag_assignments')
    .delete()
    .eq('tag_id', tagId)
    .in('lead_id', leadIds);

  if (error) throw error;
}

// ============================================================================
// Lead Notes API
// ============================================================================

interface DbLeadNote {
  id: string;
  user_id: string;
  lead_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const dbNoteToNote = (db: DbLeadNote): LeadNote => ({
  id: db.id,
  leadId: db.lead_id,
  content: db.content,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/**
 * Get all notes for a specific lead.
 */
export async function getNotesByLead(
  userId: string,
  leadId: string
): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(dbNoteToNote);
}

/**
 * Create a new note for a lead.
 */
export async function createLeadNote(
  userId: string,
  leadId: string,
  content: string
): Promise<LeadNote> {
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({
      user_id: userId,
      lead_id: leadId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return dbNoteToNote(data);
}

/**
 * Update an existing note.
 */
export async function updateLeadNote(
  userId: string,
  noteId: string,
  content: string
): Promise<LeadNote> {
  const { data, error } = await supabase
    .from('lead_notes')
    .update({ content: content.trim() })
    .eq('id', noteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbNoteToNote(data);
}

/**
 * Delete a note.
 */
export async function deleteLeadNote(
  userId: string,
  noteId: string
): Promise<void> {
  const { error } = await supabase
    .from('lead_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Get note count for a lead.
 */
export async function getLeadNoteCount(
  userId: string,
  leadId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('lead_notes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('lead_id', leadId);

  if (error) throw error;
  return count || 0;
}

// ============================================================================
// Saved Filters / Smart Lists API
// ============================================================================

interface DbSavedFilter {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  filters: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
}

const dbSavedFilterToSavedFilter = (db: DbSavedFilter): SavedFilter => ({
  id: db.id,
  name: db.name,
  icon: db.icon,
  color: db.color,
  filters: db.filters,
  position: db.position,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/**
 * Get all saved filters for a user, ordered by position.
 */
export async function getSavedFilters(userId: string): Promise<SavedFilter[]> {
  const { data, error } = await supabase
    .from('saved_filters')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbSavedFilterToSavedFilter);
}

/**
 * Create a new saved filter.
 */
export async function createSavedFilter(
  userId: string,
  filter: { name: string; icon?: string; color?: string; filters: Record<string, unknown> }
): Promise<SavedFilter> {
  // Get the highest position to place new filter at the end
  const { data: existingFilters } = await supabase
    .from('saved_filters')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1);

  const firstFilter = existingFilters?.[0];
  const nextPosition = firstFilter !== undefined ? firstFilter.position + 1 : 0;

  const { data, error } = await supabase
    .from('saved_filters')
    .insert({
      user_id: userId,
      name: filter.name.trim(),
      icon: filter.icon || 'filter',
      color: filter.color || '#6B7280',
      filters: filter.filters,
      position: nextPosition,
    })
    .select()
    .single();

  if (error) throw error;
  return dbSavedFilterToSavedFilter(data);
}

/**
 * Update a saved filter.
 */
export async function updateSavedFilter(
  userId: string,
  filterId: string,
  updates: Partial<Pick<SavedFilter, 'name' | 'icon' | 'color' | 'filters'>>
): Promise<SavedFilter> {
  const updateData: Partial<DbSavedFilter> = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.filters !== undefined) updateData.filters = updates.filters;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('saved_filters')
    .update(updateData)
    .eq('id', filterId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbSavedFilterToSavedFilter(data);
}

/**
 * Delete a saved filter.
 */
export async function deleteSavedFilter(userId: string, filterId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_filters')
    .delete()
    .eq('id', filterId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Reorder saved filters by updating their positions.
 */
export async function reorderSavedFilters(
  userId: string,
  filterIds: string[]
): Promise<void> {
  // Update each filter's position in parallel
  const updates = filterIds.map((id, index) =>
    supabase
      .from('saved_filters')
      .update({ position: index })
      .eq('id', id)
      .eq('user_id', userId)
  );

  const results = await Promise.all(updates);

  for (const result of results) {
    if (result.error) throw result.error;
  }
}

/**
 * Get the count of leads matching a saved filter.
 * Used for showing count badges in the sidebar.
 */
export async function getSavedFilterCount(
  userId: string,
  filters: Record<string, unknown>
): Promise<number> {
  // Re-use getLeadsPaginated to apply the same filter logic
  const result = await getLeadsPaginated(userId, {
    ...filters as LeadFilters,
    limit: 1, // We only need the count
    offset: 0,
  });

  return result.count;
}

/**
 * Get counts for all saved filters in parallel.
 */
export async function getSavedFilterCounts(
  userId: string,
  savedFilters: SavedFilter[]
): Promise<Record<string, number>> {
  const countPromises = savedFilters.map(async (sf) => {
    const count = await getSavedFilterCount(userId, sf.filters);
    return { id: sf.id, count };
  });

  const results = await Promise.all(countPromises);

  const counts: Record<string, number> = {};
  results.forEach(({ id, count }) => {
    counts[id] = count;
  });

  return counts;
}

// ============================================================================
// Duplicate Detection API
// ============================================================================

/**
 * Find duplicate leads by company name.
 * Uses SQL RPC for server-side grouping (scalable for large datasets).
 */
export async function findDuplicatesByCompanyName(userId: string): Promise<DuplicateGroup[]> {
  // Call SQL RPC for server-side grouping
  const { data: rpcData, error: rpcError } = await supabase.rpc('find_duplicate_leads_by_company', {
    p_user_id: userId,
    p_limit: 100,
  });

  if (rpcError) throw rpcError;
  if (!rpcData || rpcData.length === 0) return [];

  // Collect all lead IDs from all duplicate groups
  const allLeadIds: string[] = rpcData.flatMap((group: { lead_ids: string[] }) => group.lead_ids);

  // Fetch all leads in one query
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', allLeadIds)
    .eq('user_id', userId);

  if (leadsError) throw leadsError;

  // Create a lookup map for leads
  const leadsMap = new Map<string, Lead>();
  (leadsData || []).forEach((dbLead: DbLead) => {
    const lead = dbLeadToLead(dbLead);
    leadsMap.set(lead.id, lead);
  });

  // Build DuplicateGroup array with full lead objects
  const duplicates: DuplicateGroup[] = rpcData.map((group: { company_name: string; lead_count: number; lead_ids: string[] }) => ({
    key: group.company_name,
    type: 'company_name' as const,
    leads: group.lead_ids.map((id: string) => leadsMap.get(id)).filter((lead): lead is Lead => lead !== undefined),
    count: Number(group.lead_count),
  }));

  return duplicates;
}

/**
 * Find duplicate leads by email address.
 * Uses SQL RPC for server-side grouping (scalable for large datasets).
 */
export async function findDuplicatesByEmail(userId: string): Promise<DuplicateGroup[]> {
  // Call SQL RPC for server-side grouping
  const { data: rpcData, error: rpcError } = await supabase.rpc('find_duplicate_leads_by_email', {
    p_user_id: userId,
    p_limit: 100,
  });

  if (rpcError) throw rpcError;
  if (!rpcData || rpcData.length === 0) return [];

  // Collect all lead IDs from all duplicate groups
  const allLeadIds: string[] = rpcData.flatMap((group: { lead_ids: string[] }) => group.lead_ids);

  // Fetch all leads in one query
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', allLeadIds)
    .eq('user_id', userId);

  if (leadsError) throw leadsError;

  // Create a lookup map for leads
  const leadsMap = new Map<string, Lead>();
  (leadsData || []).forEach((dbLead: DbLead) => {
    const lead = dbLeadToLead(dbLead);
    leadsMap.set(lead.id, lead);
  });

  // Build DuplicateGroup array with full lead objects
  const duplicates: DuplicateGroup[] = rpcData.map((group: { email: string; lead_count: number; lead_ids: string[] }) => ({
    key: group.email,
    type: 'email' as const,
    leads: group.lead_ids.map((id: string) => leadsMap.get(id)).filter((lead): lead is Lead => lead !== undefined),
    count: Number(group.lead_count),
  }));

  return duplicates;
}

/**
 * Find duplicate leads by phone number.
 * Uses SQL RPC for server-side grouping (scalable for large datasets).
 */
export async function findDuplicatesByPhone(userId: string): Promise<DuplicateGroup[]> {
  // Call SQL RPC for server-side grouping
  const { data: rpcData, error: rpcError } = await supabase.rpc('find_duplicate_leads_by_phone', {
    p_user_id: userId,
    p_limit: 100,
  });

  if (rpcError) throw rpcError;
  if (!rpcData || rpcData.length === 0) return [];

  // Collect all lead IDs from all duplicate groups
  const allLeadIds: string[] = rpcData.flatMap((group: { lead_ids: string[] }) => group.lead_ids);

  // Fetch all leads in one query
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .in('id', allLeadIds)
    .eq('user_id', userId);

  if (leadsError) throw leadsError;

  // Create a lookup map for leads
  const leadsMap = new Map<string, Lead>();
  (leadsData || []).forEach((dbLead: DbLead) => {
    const lead = dbLeadToLead(dbLead);
    leadsMap.set(lead.id, lead);
  });

  // Build DuplicateGroup array with full lead objects
  const duplicates: DuplicateGroup[] = rpcData.map((group: { phone: string; lead_count: number; lead_ids: string[] }) => ({
    key: group.phone,
    type: 'phone' as const,
    leads: group.lead_ids.map((id: string) => leadsMap.get(id)).filter((lead): lead is Lead => lead !== undefined),
    count: Number(group.lead_count),
  }));

  return duplicates;
}

/**
 * Get all duplicates summary (counts per type).
 * Uses SQL RPC for efficient counting without loading lead data.
 */
export async function getDuplicatesSummary(userId: string): Promise<{
  companyName: number;
  email: number;
  phone: number;
}> {
  // Use SQL RPC for efficient counting
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_duplicates_summary', {
    p_user_id: userId,
  });

  if (rpcError) throw rpcError;

  // Parse RPC response into expected format
  const summary = { companyName: 0, email: 0, phone: 0 };

  if (rpcData) {
    for (const row of rpcData) {
      const total = Number(row.total_duplicates) || 0;
      if (row.duplicate_type === 'company_name') {
        summary.companyName = total;
      } else if (row.duplicate_type === 'email') {
        summary.email = total;
      } else if (row.duplicate_type === 'phone') {
        summary.phone = total;
      }
    }
  }

  return summary;
}

/**
 * Merge duplicate leads by transferring activities and deleting duplicates.
 * Activities from all duplicates are moved to the primary lead.
 *
 * Optimized to use batch operations instead of N+1 queries.
 */
export async function mergeLeads(
  userId: string,
  config: MergeConfig
): Promise<void> {
  const { primaryLeadId, duplicateLeadIds, deleteAfterMerge } = config;

  if (duplicateLeadIds.length === 0) return;

  // Batch transfer all activities from duplicate leads to primary lead
  const { error: transferError } = await supabase
    .from('activities')
    .update({ lead_id: primaryLeadId })
    .in('lead_id', duplicateLeadIds)
    .eq('user_id', userId);

  if (transferError) throw transferError;

  // Batch transfer all notes from duplicate leads to primary lead
  const { error: notesError } = await supabase
    .from('lead_notes')
    .update({ lead_id: primaryLeadId })
    .in('lead_id', duplicateLeadIds)
    .eq('user_id', userId);

  if (notesError) throw notesError;

  // Get all tag assignments from all duplicates in one query
  const { data: tagAssignments, error: tagQueryError } = await supabase
    .from('lead_tag_assignments')
    .select('tag_id')
    .in('lead_id', duplicateLeadIds);

  if (tagQueryError) throw tagQueryError;

  if (tagAssignments && tagAssignments.length > 0) {
    // Get unique tag IDs
    const uniqueTagIds = [...new Set(tagAssignments.map(a => a.tag_id))];

    // Batch upsert all tag assignments to primary lead
    const upsertData = uniqueTagIds.map(tagId => ({
      lead_id: primaryLeadId,
      tag_id: tagId,
    }));

    const { error: upsertError } = await supabase
      .from('lead_tag_assignments')
      .upsert(upsertData, { onConflict: 'lead_id,tag_id' });

    if (upsertError) throw upsertError;

    // Batch delete all old tag assignments
    const { error: tagDeleteError } = await supabase
      .from('lead_tag_assignments')
      .delete()
      .in('lead_id', duplicateLeadIds);

    if (tagDeleteError) throw tagDeleteError;
  }

  // Delete duplicate leads if requested
  if (deleteAfterMerge) {
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .in('id', duplicateLeadIds)
      .eq('user_id', userId);

    if (deleteError) throw deleteError;
  }
}

// ============================================================================
// REPORTING ANALYTICS
// Server-side aggregations for efficient reporting
// ============================================================================

/**
 * Get count of stale leads (in_progress with no recent activity).
 * Uses server-side SQL RPC for efficiency at scale.
 */
export async function getStaleLeadsCount(
  userId: string,
  days: number = 7
): Promise<number> {
  const { data, error } = await supabase.rpc('get_stale_leads_count', {
    p_user_id: userId,
    p_days: days,
  });

  if (error) throw error;
  return Number(data) || 0;
}

/**
 * Get performance stats per channel (email, call, instagram, etc).
 * Uses server-side SQL RPC for efficiency at scale.
 */
export async function getChannelPerformance(
  userId: string
): Promise<ChannelPerformance[]> {
  const { data, error } = await supabase.rpc('get_channel_performance_stats', {
    p_user_id: userId,
  });

  if (error) throw error;

  return (data || []).map((row: {
    channel: string;
    leads_contacted: number;
    leads_replied: number;
    reply_rate: number;
  }) => ({
    channel: row.channel,
    leadsContacted: Number(row.leads_contacted),
    leadsReplied: Number(row.leads_replied),
    replyRate: Number(row.reply_rate),
  }));
}

/**
 * Get weekly trend data for reporting charts.
 * Uses server-side SQL RPC for efficiency at scale.
 */
export async function getWeeklyTrends(
  userId: string,
  weeks: number = 12
): Promise<WeeklyTrend[]> {
  const { data, error } = await supabase.rpc('get_weekly_trends', {
    p_user_id: userId,
    p_weeks: weeks,
  });

  if (error) throw error;

  return (data || []).map((row: {
    week_start: string;
    activities_count: number;
    replies_count: number;
    qualified_count: number;
    response_rate: number;
  }) => ({
    weekStart: row.week_start,
    activitiesCount: Number(row.activities_count),
    repliesCount: Number(row.replies_count),
    qualifiedCount: Number(row.qualified_count),
    responseRate: Number(row.response_rate),
  }));
}

/**
 * Get average days overdue for tasks.
 * Uses server-side SQL RPC for efficiency at scale.
 */
export async function getAvgDaysOverdue(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_avg_days_overdue', {
    p_user_id: userId,
  });

  if (error) throw error;
  return Number(data) || 0;
}

/**
 * Get all reporting dashboard metrics in a single RPC call.
 * Combines stale leads, avg overdue, channel performance, and weekly trends.
 * Reduces 4 separate queries to 1 for the Reporting page.
 */
export async function getReportingDashboard(
  userId: string,
  staleDays: number = 7,
  trendWeeks: number = 12
): Promise<ReportingDashboard> {
  const { data, error } = await supabase.rpc('get_reporting_dashboard', {
    p_user_id: userId,
    p_stale_days: staleDays,
    p_trend_weeks: trendWeeks,
  });

  if (error) throw error;

  // The RPC returns camelCase keys from the JSON, map them to our types
  return {
    staleLeadsCount: Number(data.staleLeadsCount) || 0,
    avgDaysOverdue: Number(data.avgDaysOverdue) || 0,
    channelPerformance: data.channelPerformance || [],
    weeklyTrends: data.weeklyTrends || [],
  };
}

// RPC response types for lead timeline
interface RpcTimelineActivity {
  id: string;
  action: string;
  platform: string | null;
  note: string | null;
  is_first_outreach: boolean;
  direction: string | null;
  timestamp: string;
}

interface RpcTimelineCallRecord {
  id: string;
  outcome: string | null;
  status: string;
  duration_seconds: number | null;
  recording_url: string | null;
  transcription: string | null;
  ai_summary: string | null;
  notes: string | null;
  started_at: string;
}

interface LeadTimelineResponse {
  activities: Activity[];
  callRecords: CallRecord[];
}

/**
 * Get unified timeline for a lead in a single RPC call.
 * Combines activities + call_records queries.
 * Reduces 2 queries to 1 for Lead Detail page.
 */
export async function getLeadTimeline(
  userId: string,
  leadId: string,
  limit: number = 100
): Promise<LeadTimelineResponse> {
  const { data, error } = await supabase.rpc('get_lead_timeline', {
    p_user_id: userId,
    p_lead_id: leadId,
    p_limit: limit,
  });

  if (error) throw error;

  // Map snake_case RPC response to camelCase types
  const activities: Activity[] = (data.activities || []).map((a: RpcTimelineActivity) => ({
    id: a.id,
    leadId: leadId,
    action: a.action,
    platform: a.platform as Activity['platform'],
    note: a.note || undefined,
    isFirstOutreach: a.is_first_outreach,
    timestamp: a.timestamp,
    direction: (a.direction as Activity['direction']) || 'outbound',
  }));

  const callRecords: CallRecord[] = (data.callRecords || []).map((c: RpcTimelineCallRecord) => ({
    id: c.id,
    userId: userId,
    leadId: leadId,
    fromNumber: '', // Not returned by RPC (not needed for timeline display)
    toNumber: '',
    outcome: c.outcome as CallRecord['outcome'],
    status: c.status as CallRecord['status'],
    durationSeconds: c.duration_seconds || undefined,
    recordingUrl: c.recording_url || undefined,
    recordingSaved: false,
    transcription: c.transcription || undefined,
    aiSummary: c.ai_summary || undefined,
    notes: c.notes || undefined,
    startedAt: c.started_at,
  }));

  return { activities, callRecords };
}

// ============================================================================
// NETWORKING / LEADERBOARD API
// ============================================================================

interface DbUserPublicProfile {
  id: string;
  user_id: string;
  is_visible: boolean;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  show_activity_count: boolean;
  show_weekly_activity: boolean;
  created_at: string;
  updated_at: string;
}

interface DbUserActivityMetrics {
  id: string;
  user_id: string;
  weekly_activity_count: number;
  weekly_emails_sent: number;
  weekly_calls_made: number;
  weekly_dms_sent: number;
  monthly_activity_count: number;
  total_activity_count: number;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

const dbPublicProfileToPublicProfile = (db: DbUserPublicProfile): UserPublicProfile => ({
  id: db.id,
  userId: db.user_id,
  isVisible: db.is_visible,
  displayName: db.display_name || undefined,
  avatarUrl: db.avatar_url || undefined,
  bio: db.bio || undefined,
  showActivityCount: db.show_activity_count,
  showWeeklyActivity: db.show_weekly_activity,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const dbActivityMetricsToActivityMetrics = (db: DbUserActivityMetrics): UserActivityMetrics => ({
  id: db.id,
  userId: db.user_id,
  weeklyActivityCount: db.weekly_activity_count,
  weeklyEmailsSent: db.weekly_emails_sent,
  weeklyCallsMade: db.weekly_calls_made,
  weeklyDmsSent: db.weekly_dms_sent,
  monthlyActivityCount: db.monthly_activity_count,
  totalActivityCount: db.total_activity_count,
  lastCalculatedAt: db.last_calculated_at,
});

/**
 * Get user's public profile settings.
 * Returns null if profile doesn't exist yet.
 */
export async function getUserPublicProfile(userId: string): Promise<UserPublicProfile | null> {
  const { data, error } = await supabase
    .from('user_public_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // PGRST116 = no rows found, which is fine for a new user
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return dbPublicProfileToPublicProfile(data);
}

/**
 * Create or update user's public profile.
 */
export async function upsertUserPublicProfile(
  userId: string,
  updates: Partial<Omit<UserPublicProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserPublicProfile> {
  const dbUpdates: Partial<DbUserPublicProfile> & { user_id: string } = {
    user_id: userId,
  };

  if (updates.isVisible !== undefined) dbUpdates.is_visible = updates.isVisible;
  if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName || null;
  if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl || null;
  if (updates.bio !== undefined) dbUpdates.bio = updates.bio || null;
  if (updates.showActivityCount !== undefined) dbUpdates.show_activity_count = updates.showActivityCount;
  if (updates.showWeeklyActivity !== undefined) dbUpdates.show_weekly_activity = updates.showWeeklyActivity;

  const { data, error } = await supabase
    .from('user_public_profiles')
    .upsert(dbUpdates, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return dbPublicProfileToPublicProfile(data);
}

/**
 * Get user's activity metrics.
 * Returns null if metrics haven't been calculated yet.
 */
export async function getUserActivityMetrics(userId: string): Promise<UserActivityMetrics | null> {
  const { data, error } = await supabase
    .from('user_activity_metrics')
    .select('*')
    .eq('user_id', userId)
    .single();

  // PGRST116 = no rows found
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return dbActivityMetricsToActivityMetrics(data);
}

/**
 * Refresh user's activity metrics via RPC.
 * Call when user opts-in to visibility or requests a refresh.
 */
export async function refreshUserActivityMetrics(userId: string): Promise<void> {
  const { error } = await supabase.rpc('refresh_user_activity_metrics', {
    p_user_id: userId,
  });

  if (error) throw error;
}

/**
 * Get leaderboard data.
 * Returns paginated list of visible users sorted by activity count.
 */
export async function getLeaderboard(
  userId: string,
  period: LeaderboardPeriod = 'weekly',
  limit: number = 20,
  offset: number = 0
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_leaderboard', {
    p_user_id: userId,
    p_period: period,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  return (data || []).map((row: {
    rank: number;
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    activity_count: number;
    is_current_user: boolean;
  }) => ({
    rank: Number(row.rank),
    userId: row.user_id,
    displayName: row.display_name || undefined,
    avatarUrl: row.avatar_url || undefined,
    bio: row.bio || undefined,
    activityCount: Number(row.activity_count),
    isCurrentUser: row.is_current_user,
  }));
}

/**
 * Get current user's rank.
 * Returns rank info even if user is not visible on leaderboard.
 */
export async function getUserRank(
  userId: string,
  period: LeaderboardPeriod = 'weekly'
): Promise<UserRankInfo> {
  const { data, error } = await supabase.rpc('get_user_rank', {
    p_user_id: userId,
    p_period: period,
  });

  if (error) throw error;

  // RPC returns single row as array
  const row = data?.[0] || { rank: 0, activity_count: 0, total_participants: 0 };

  return {
    rank: Number(row.rank),
    activityCount: Number(row.activity_count),
    totalParticipants: Number(row.total_participants),
  };
}

// ============================================================================
// CUSTOM FIELDS API
// User-defined custom fields for leads
// ============================================================================

interface DbCustomFieldDefinition {
  id: string;
  user_id: string;
  name: string;
  field_key: string;
  field_type: string;
  is_required: boolean;
  options: SelectOption[];
  default_value: string | null;
  position: number;
  show_in_list: boolean;
  show_in_filters: boolean;
  created_at: string;
  updated_at: string;
}

interface DbCustomFieldValue {
  id: string;
  user_id: string;
  lead_id: string;
  field_id: string;
  value_text: string | null;
  value_number: number | null;
  value_date: string | null;
  value_boolean: boolean | null;
  value_array: string[] | null;
  created_at: string;
  updated_at: string;
}

const dbFieldDefToFieldDef = (db: DbCustomFieldDefinition): CustomFieldDefinition => ({
  id: db.id,
  name: db.name,
  fieldKey: db.field_key,
  fieldType: db.field_type as CustomFieldType,
  isRequired: db.is_required,
  options: db.options || [],
  defaultValue: db.default_value || undefined,
  position: db.position,
  showInList: db.show_in_list,
  showInFilters: db.show_in_filters,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const dbFieldValueToFieldValue = (db: DbCustomFieldValue): CustomFieldValue => ({
  id: db.id,
  leadId: db.lead_id,
  fieldId: db.field_id,
  valueText: db.value_text || undefined,
  valueNumber: db.value_number ?? undefined,
  valueDate: db.value_date || undefined,
  valueBoolean: db.value_boolean ?? undefined,
  valueArray: db.value_array || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

/**
 * Generate URL-safe field key from name.
 */
function generateFieldKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50);
}

/**
 * Get all custom field definitions for a user.
 */
export async function getCustomFieldDefinitions(userId: string): Promise<CustomFieldDefinition[]> {
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) throw error;
  return (data || []).map(dbFieldDefToFieldDef);
}

/**
 * Get a single custom field definition.
 */
export async function getCustomFieldDefinition(
  userId: string,
  fieldId: string
): Promise<CustomFieldDefinition | null> {
  const { data, error } = await supabase
    .from('custom_field_definitions')
    .select('*')
    .eq('user_id', userId)
    .eq('id', fieldId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;

  return dbFieldDefToFieldDef(data);
}

/**
 * Create a new custom field definition.
 */
export async function createCustomFieldDefinition(
  userId: string,
  field: {
    name: string;
    fieldType: CustomFieldType;
    isRequired?: boolean;
    options?: SelectOption[];
    defaultValue?: string;
    showInList?: boolean;
    showInFilters?: boolean;
  }
): Promise<CustomFieldDefinition> {
  // Get next position
  const { data: existingFields } = await supabase
    .from('custom_field_definitions')
    .select('position')
    .eq('user_id', userId)
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = (existingFields?.[0]?.position ?? -1) + 1;
  const fieldKey = generateFieldKey(field.name);

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .insert({
      user_id: userId,
      name: field.name.trim(),
      field_key: fieldKey,
      field_type: field.fieldType,
      is_required: field.isRequired ?? false,
      options: field.options ?? [],
      default_value: field.defaultValue || null,
      position: nextPosition,
      show_in_list: field.showInList ?? false,
      show_in_filters: field.showInFilters ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return dbFieldDefToFieldDef(data);
}

/**
 * Update a custom field definition.
 */
export async function updateCustomFieldDefinition(
  userId: string,
  fieldId: string,
  updates: Partial<Pick<CustomFieldDefinition, 'name' | 'isRequired' | 'options' | 'defaultValue' | 'showInList' | 'showInFilters'>>
): Promise<CustomFieldDefinition> {
  const dbUpdates: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    dbUpdates.name = updates.name.trim();
    dbUpdates.field_key = generateFieldKey(updates.name);
  }
  if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired;
  if (updates.options !== undefined) dbUpdates.options = updates.options;
  if (updates.defaultValue !== undefined) dbUpdates.default_value = updates.defaultValue || null;
  if (updates.showInList !== undefined) dbUpdates.show_in_list = updates.showInList;
  if (updates.showInFilters !== undefined) dbUpdates.show_in_filters = updates.showInFilters;

  const { data, error } = await supabase
    .from('custom_field_definitions')
    .update(dbUpdates)
    .eq('id', fieldId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return dbFieldDefToFieldDef(data);
}

/**
 * Delete a custom field definition (cascades to values).
 */
export async function deleteCustomFieldDefinition(
  userId: string,
  fieldId: string
): Promise<void> {
  const { error } = await supabase
    .from('custom_field_definitions')
    .delete()
    .eq('id', fieldId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Reorder custom field definitions.
 */
export async function reorderCustomFieldDefinitions(
  userId: string,
  fieldIds: string[]
): Promise<void> {
  // Update positions in a transaction-like manner
  for (let i = 0; i < fieldIds.length; i++) {
    const { error } = await supabase
      .from('custom_field_definitions')
      .update({ position: i })
      .eq('id', fieldIds[i])
      .eq('user_id', userId);

    if (error) throw error;
  }
}

/**
 * Get custom field values for a specific lead.
 */
export async function getCustomFieldValues(
  userId: string,
  leadId: string
): Promise<CustomFieldValue[]> {
  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*')
    .eq('user_id', userId)
    .eq('lead_id', leadId);

  if (error) throw error;
  return (data || []).map(dbFieldValueToFieldValue);
}

/**
 * Get custom field values for multiple leads (batch).
 * Returns a map of leadId -> CustomFieldValue[]
 */
export async function getCustomFieldValuesForLeads(
  userId: string,
  leadIds: string[]
): Promise<Map<string, CustomFieldValue[]>> {
  if (leadIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('custom_field_values')
    .select('*')
    .eq('user_id', userId)
    .in('lead_id', leadIds);

  if (error) throw error;

  const result = new Map<string, CustomFieldValue[]>();
  for (const row of data || []) {
    const value = dbFieldValueToFieldValue(row);
    const existing = result.get(value.leadId) || [];
    existing.push(value);
    result.set(value.leadId, existing);
  }

  return result;
}

/**
 * Set a custom field value for a lead.
 * Upserts: creates if doesn't exist, updates if it does.
 */
export async function setCustomFieldValue(
  userId: string,
  leadId: string,
  fieldId: string,
  value: CustomFieldFormValue
): Promise<CustomFieldValue> {
  // Verify field belongs to user and get its type
  const { data: fieldDef, error: fieldError } = await supabase
    .from('custom_field_definitions')
    .select('id, field_type')
    .eq('id', fieldId)
    .eq('user_id', userId)
    .single();

  if (fieldError || !fieldDef) {
    throw new Error('Custom field not found or does not belong to user');
  }

  // Build value object based on field type
  const valueData: Record<string, unknown> = {
    user_id: userId,
    lead_id: leadId,
    field_id: fieldId,
    value_text: null,
    value_number: null,
    value_date: null,
    value_boolean: null,
    value_array: null,
  };

  switch (fieldDef.field_type) {
    case 'text':
    case 'url':
    case 'single_select':
      valueData.value_text = typeof value === 'string' ? value : null;
      break;
    case 'number':
      valueData.value_number = typeof value === 'number' ? value : null;
      break;
    case 'date':
      valueData.value_date = typeof value === 'string' ? value : null;
      break;
    case 'checkbox':
      valueData.value_boolean = typeof value === 'boolean' ? value : null;
      break;
    case 'multi_select':
      valueData.value_array = Array.isArray(value) ? value : null;
      break;
  }

  const { data, error } = await supabase
    .from('custom_field_values')
    .upsert(valueData, { onConflict: 'lead_id,field_id' })
    .select()
    .single();

  if (error) throw error;
  return dbFieldValueToFieldValue(data);
}

/**
 * Bulk set custom field values for a lead (efficient for forms).
 */
export async function setCustomFieldValues(
  userId: string,
  leadId: string,
  values: Array<{ fieldId: string; value: CustomFieldFormValue }>
): Promise<void> {
  // Process sequentially to maintain data integrity
  for (const { fieldId, value } of values) {
    await setCustomFieldValue(userId, leadId, fieldId, value);
  }
}

/**
 * Delete a custom field value for a lead.
 */
export async function deleteCustomFieldValue(
  userId: string,
  leadId: string,
  fieldId: string
): Promise<void> {
  const { error } = await supabase
    .from('custom_field_values')
    .delete()
    .eq('user_id', userId)
    .eq('lead_id', leadId)
    .eq('field_id', fieldId);

  if (error) throw error;
}

/**
 * Check if a custom field has any values (for preventing type changes).
 */
export async function customFieldHasValues(
  userId: string,
  fieldId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('custom_field_values')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('field_id', fieldId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

