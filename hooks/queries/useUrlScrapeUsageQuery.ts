import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryClient';
import { getUrlScrapeUsageThisMonth } from '../../services/supabase';

/**
 * Query hook to get the number of URL scrapes used this month.
 * Used for enforcing the free tier URL scrape limit (20/month).
 */
export function useUrlScrapeUsageQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.urlScrapeUsage(userId),
    queryFn: () => getUrlScrapeUsageThisMonth(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60, // 1 minute - update more frequently since it changes with each scrape
  });
}
