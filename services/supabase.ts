import { createClient } from '@supabase/supabase-js';
import { Lead, Activity, Strategy, StrategyStep, OutreachGoals, ScrapeJob } from '../types';

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

// Get the current session (for auth headers in Edge Function calls)
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
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
  next_task_date: string | null;
  status: string;
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
}

interface DbStrategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  steps: StrategyStep[];
  is_default: boolean;
  created_at: string;
}

interface DbGoals {
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
  nextTaskDate: db.next_task_date || undefined,
  status: db.status as Lead['status'],
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
  next_task_date: lead.nextTaskDate || null,
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
});

const dbStrategyToStrategy = (db: DbStrategy): Strategy => ({
  id: db.id,
  name: db.name,
  description: db.description || '',
  steps: db.steps,
});

const strategyToDbStrategy = (strategy: Strategy, userId: string): Partial<DbStrategy> => ({
  id: strategy.id,
  user_id: userId,
  name: strategy.name,
  description: strategy.description,
  steps: strategy.steps,
});

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
    .order('next_task_date', { ascending: true });

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

export async function getLeads(userId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

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
  const { data, error } = await supabase
    .from('leads')
    .update(leadToDbLead(lead, userId))
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

// Activities API
export async function getActivities(userId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });

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
      console.log(`Job ${job.id} marked as timed out`);
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
  console.log('[Realtime] Subscribing to scrape_jobs updates for user:', userId);

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
        console.log('[Realtime] Received update:', payload.new);
        const db = payload.new as DbScrapeJob;
        onUpdate(dbScrapeJobToScrapeJob(db));
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

  // Return unsubscribe function
  return () => {
    console.log('[Realtime] Unsubscribing from scrape_jobs');
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

export interface LeadFilters extends PaginationParams {
  status?: Lead['status'] | 'all';
  strategyId?: string | 'all';
  search?: string;
  channelFilter?: 'all' | 'all_socials' | 'ig_only' | 'no_socials' | 'has_email' | 'has_phone';
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
}

/**
 * Paginated leads query with server-side filtering.
 * Much more efficient than client-side filtering for large datasets.
 */
export async function getLeadsPaginated(
  userId: string,
  filters: LeadFilters = {}
): Promise<PaginatedResponse<Lead>> {
  const { limit = 50, offset = 0, status, strategyId, search, channelFilter } = filters;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply status filter
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply strategy filter
  if (strategyId && strategyId !== 'all') {
    query = query.eq('strategy_id', strategyId);
  }

  // Apply search filter (searches multiple fields)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `company_name.ilike.${searchTerm},contact_name.ilike.${searchTerm},email.ilike.${searchTerm},location.ilike.${searchTerm},niche.ilike.${searchTerm}`
    );
  }

  // Apply channel filters
  if (channelFilter && channelFilter !== 'all') {
    switch (channelFilter) {
      case 'all_socials':
        query = query
          .not('instagram_url', 'is', null)
          .not('facebook_url', 'is', null)
          .not('linkedin_url', 'is', null);
        break;
      case 'ig_only':
        query = query
          .not('instagram_url', 'is', null)
          .is('facebook_url', null)
          .is('linkedin_url', null);
        break;
      case 'no_socials':
        query = query
          .is('instagram_url', null)
          .is('facebook_url', null)
          .is('linkedin_url', null);
        break;
      case 'has_email':
        query = query.not('email', 'is', null);
        break;
      case 'has_phone':
        query = query.not('phone', 'is', null);
        break;
    }
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

