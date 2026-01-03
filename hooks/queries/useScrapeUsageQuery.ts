import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { getScrapeUsageThisMonth } from '../../services/supabase';

/**
 * Query hook to get the number of leads scraped this month.
 * Used for enforcing the free tier scrape limit (100 leads/month).
 */
export function useScrapeUsageQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.scrapeUsage(userId),
    queryFn: () => getScrapeUsageThisMonth(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - doesn't need frequent updates
  });
}
