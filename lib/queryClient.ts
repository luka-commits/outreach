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
