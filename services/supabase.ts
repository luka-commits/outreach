import { createClient } from '@supabase/supabase-js';
import { Lead, Activity, Strategy, StrategyStep, OutreachGoals, ScrapeJob, CallRecord, TwilioCredentials, CallMetrics, GmailCredentials, ResendCredentials, EmailProvider } from '../types';

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
  current_step_index: number;
  next_task_date: string | null;
  next_task_note: string | null;
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
  nextTaskDate: db.next_task_date || undefined,
  nextTaskNote: db.next_task_note || undefined,
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
  next_task_date: lead.nextTaskDate || null,
  // next_task_note: lead.nextTaskNote || null, // DISABLED TO PREVENT CRASH - DB MIGRATION PENDING
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

export type SortField = 'created_at' | 'company_name' | 'google_rating' | 'status';
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

  // Apply search filter (searches multiple fields)
  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `company_name.ilike.${searchTerm},contact_name.ilike.${searchTerm},email.ilike.${searchTerm},location.ilike.${searchTerm},niche.ilike.${searchTerm}`
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
 */
export async function updateTwilioCredentials(
  userId: string,
  creds: TwilioCredentials
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      twilio_account_sid: creds.accountSid,
      twilio_auth_token: creds.authToken,
      twilio_twiml_app_sid: creds.twimlAppSid,
      twilio_phone_number: creds.phoneNumber,
    })
    .eq('id', userId);

  if (error) throw error;
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
    .order('started_at', { ascending: false });

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
 */
export async function updateGmailCredentials(
  userId: string,
  creds: GmailCredentials
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      gmail_access_token: creds.accessToken,
      gmail_refresh_token: creds.refreshToken,
      gmail_token_expires_at: creds.expiresAt,
      gmail_email: creds.email,
      email_provider: 'gmail', // Auto-set provider when connecting Gmail
    })
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
 */
export async function updateResendCredentials(
  userId: string,
  creds: ResendCredentials
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      resend_api_key: creds.apiKey,
      resend_from_address: creds.fromAddress,
      email_provider: 'resend', // Auto-set provider when connecting Resend
    })
    .eq('id', userId);

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

