import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      // Cache is kept for 30 minutes after last use
      gcTime: 1000 * 60 * 30,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus (reduces unnecessary requests)
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

// Type-safe query keys for cache invalidation
export const queryKeys = {
  // Leads
  leads: (userId: string) => ['leads', userId] as const,
  leadsFiltered: (userId: string, filters: Record<string, unknown>) =>
    ['leads', userId, 'filtered', filters] as const,
  leadsInfinite: (userId: string, filters: Record<string, unknown>) =>
    ['leads', userId, 'infinite', filters] as const,
  lead: (userId: string, leadId: string) => ['leads', userId, leadId] as const,

  // Activities
  activities: (userId: string) => ['activities', userId] as const,
  activitiesByLead: (userId: string, leadId: string) =>
    ['activities', userId, 'byLead', leadId] as const,
  activitiesPaginated: (userId: string | undefined, options: { startDate?: string; endDate?: string; limit?: number }) =>
    ['activities', userId, 'paginated', options] as const,

  // Lead Counts
  leadCounts: (userId: string | undefined) => ['lead-counts', userId] as const,
  leadStatusCounts: (userId: string | undefined) => ['lead-status-counts', userId] as const,

  // Strategies
  strategies: (userId: string) => ['strategies', userId] as const,
  strategy: (userId: string, strategyId: string) =>
    ['strategies', userId, strategyId] as const,

  // Goals
  goals: (userId: string) => ['goals', userId] as const,

  // Scrape Jobs
  scrapeJobs: (userId: string) => ['scrape-jobs', userId] as const,
  scrapeJob: (userId: string, jobId: string) => ['scrape-jobs', userId, jobId] as const,

  // Call Records
  callRecords: (userId: string | undefined) => ['callRecords', userId] as const,
  callRecordsByLead: (userId: string | undefined, leadId: string) =>
    ['callRecords', userId, 'byLead', leadId] as const,
  callMetrics: (userId: string | undefined) => ['callMetrics', userId] as const,

  // Twilio Credentials
  twilioCredentials: (userId: string | undefined) => ['twilioCredentials', userId] as const,

  // Email Automation
  gmailCredentials: (userId: string | undefined) => ['gmailCredentials', userId] as const,
  resendCredentials: (userId: string | undefined) => ['resendCredentials', userId] as const,
  emailProvider: (userId: string | undefined) => ['emailProvider', userId] as const,

  // Lead Tags
  leadTags: (userId: string | undefined) => ['leadTags', userId] as const,
  leadTagsForLead: (userId: string | undefined, leadId: string) =>
    ['leadTags', userId, 'byLead', leadId] as const,

  // Lead Notes
  notesByLead: (userId: string | undefined, leadId: string) =>
    ['leadNotes', userId, 'byLead', leadId] as const,

  // Strategy Performance
  strategyPerformance: (userId: string | undefined) =>
    ['strategyPerformance', userId] as const,

  // Saved Filters / Smart Lists
  savedFilters: (userId: string | undefined) => ['savedFilters', userId] as const,
  savedFilterCounts: (userId: string | undefined) => ['savedFilterCounts', userId] as const,

  // Duplicate Detection
  duplicates: (userId: string | undefined, type: string) => ['duplicates', userId, type] as const,
  duplicatesSummary: (userId: string | undefined) => ['duplicates', userId, 'summary'] as const,

  // Tasks
  tasks: (userId: string | undefined) => ['tasks', userId] as const,
  tasksAllScheduled: (userId: string | undefined) => ['tasks', userId, 'all-scheduled'] as const,
  tasksCounts: (userId: string | undefined) => ['tasks', userId, 'counts'] as const,

  // Lead Tags - prefix for bulk invalidation of lead-specific tag queries
  leadTagsByLeadPrefix: (userId: string | undefined) => ['leadTags', userId, 'byLead'] as const,

  // Reporting Analytics
  staleLeadsCount: (userId: string | undefined) => ['reporting', userId, 'staleLeads'] as const,
  channelPerformance: (userId: string | undefined) => ['reporting', userId, 'channelPerformance'] as const,
  weeklyTrends: (userId: string | undefined, weeks: number) => ['reporting', userId, 'weeklyTrends', weeks] as const,
  avgDaysOverdue: (userId: string | undefined) => ['reporting', userId, 'avgDaysOverdue'] as const,
  reportingDashboard: (userId: string | undefined, staleDays: number, trendWeeks: number) =>
    ['reporting', userId, 'dashboard', staleDays, trendWeeks] as const,

  // Subscription
  subscription: (userId: string | undefined) => ['subscription', userId] as const,

  // Scrape Usage (monthly limit tracking)
  scrapeUsage: (userId: string | undefined) => ['scrapeUsage', userId] as const,
  urlScrapeUsage: (userId: string | undefined) => ['urlScrapeUsage', userId] as const,

  // Networking / Leaderboard
  userPublicProfile: (userId: string | undefined) => ['networking', userId, 'profile'] as const,
  userActivityMetrics: (userId: string | undefined) => ['networking', userId, 'metrics'] as const,
  leaderboard: (userId: string | undefined, period: string) =>
    ['networking', userId, 'leaderboard', period] as const,
  userRank: (userId: string | undefined, period: string) =>
    ['networking', userId, 'rank', period] as const,

  // Unified Lead Timeline (activities + call records combined)
  leadTimeline: (userId: string | undefined, leadId: string) =>
    ['leadTimeline', userId, leadId] as const,

  // Custom Fields
  customFieldDefinitions: (userId: string | undefined) =>
    ['customFields', userId, 'definitions'] as const,
  customFieldValues: (userId: string | undefined, leadId: string) =>
    ['customFields', userId, 'values', leadId] as const,
  customFieldValuesPrefix: (userId: string | undefined) =>
    ['customFields', userId, 'values'] as const,
  customFieldHasValues: (userId: string | undefined, fieldId: string) =>
    ['customFields', userId, 'hasValues', fieldId] as const,
} as const;

// Helper for invalidating related queries
export const invalidateLeadRelatedQueries = async (
  queryClient: QueryClient,
  userId: string
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['leads', userId] }),
    queryClient.invalidateQueries({ queryKey: ['activities', userId] }),
  ]);
};
