import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { LeadFilters, PaginatedResponse } from '../../services/supabase';
import { Lead } from '../../types';
import { queryKeys } from '../../lib/queryClient';

const PAGE_SIZE = 50;

type LeadInfiniteFilters = Omit<LeadFilters, 'limit' | 'offset'>;

/**
 * Infinite query hook for paginated lead loading.
 * Ideal for virtual scrolling in LeadList component.
 * Loads leads in batches of 50 as user scrolls.
 */
export function useLeadsInfinite(
  userId: string | undefined,
  filters: LeadInfiniteFilters = {}
) {
  return useInfiniteQuery({
    queryKey: queryKeys.leadsInfinite(userId!, filters),
    queryFn: async ({ pageParam = 0 }): Promise<PaginatedResponse<Lead>> => {
      return api.getLeadsPaginated(userId!, {
        ...filters,
        limit: PAGE_SIZE,
        offset: pageParam,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    enabled: !!userId,
  });
}

/**
 * Helper hook that flattens infinite query pages into a single array.
 * Also provides total count and loading states.
 */
export function useLeadsInfiniteFlat(
  userId: string | undefined,
  filters: LeadInfiniteFilters = {}
) {
  const query = useLeadsInfinite(userId, filters);

  // Flatten all pages into a single array
  const leads = query.data?.pages.flatMap((page) => page.data) ?? [];

  // Get total count from the first page
  const totalCount = query.data?.pages[0]?.count ?? 0;

  return {
    leads,
    totalCount,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

/**
 * Hook for prefetching the next page of leads.
 * Call this when user is approaching the end of the current page.
 */
export function usePrefetchLeads(userId: string | undefined) {
  const queryClient = useQueryClient();

  const prefetchNextPage = async (
    filters: LeadInfiniteFilters,
    currentOffset: number
  ) => {
    if (!userId) return;

    await queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.leadsInfinite(userId, filters),
      queryFn: async () => {
        return api.getLeadsPaginated(userId, {
          ...filters,
          limit: PAGE_SIZE,
          offset: currentOffset + PAGE_SIZE,
        });
      },
      initialPageParam: 0,
    });
  };

  return { prefetchNextPage };
}
