import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import * as api from '../../services/supabase';
import { Activity } from '../../types';
import { queryKeys, queryClient } from '../../lib/queryClient';

/**
 * Query hook for fetching all activities for a user.
 * Note: Consider using useActivitiesPaginatedQuery for large datasets.
 */
export function useActivitiesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activities(userId!),
    queryFn: () => api.getActivities(userId!),
    enabled: !!userId,
  });
}

/**
 * Query hook for fetching activities with date range filtering.
 * More efficient for Dashboard and Reporting views.
 */
export function useActivitiesPaginatedQuery(
  userId: string | undefined,
  options: { startDate?: string; endDate?: string; limit?: number } = {}
) {
  const { startDate, endDate, limit = 1000 } = options;

  return useQuery({
    queryKey: queryKeys.activitiesPaginated(userId, { startDate, endDate, limit }),
    queryFn: () => api.getActivitiesPaginated(userId!, { startDate, endDate, limit, offset: 0 }),
    enabled: !!userId,
    select: (response) => response.data, // Just return the activities array
  });
}

/**
 * Hook for Dashboard that fetches activities for current timeframe.
 * Automatically calculates date range based on timeframe.
 */
export function useDashboardActivities(
  userId: string | undefined,
  timeframe: 'daily' | 'weekly'
) {
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfPeriod = new Date();

    if (timeframe === 'daily') {
      startOfPeriod.setHours(0, 0, 0, 0);
    } else {
      // Weekly: start from beginning of current week (Sunday)
      startOfPeriod.setDate(now.getDate() - now.getDay());
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    return {
      startDate: startOfPeriod.toISOString(),
      endDate: now.toISOString(),
    };
  }, [timeframe]);

  return useActivitiesPaginatedQuery(userId, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 10000, // High limit for dashboard stats
  });
}

/**
 * Mutation hook for adding activities.
 */
export function useActivityMutations(userId: string | undefined) {
  const queryClient = useQueryClient();

  const addActivity = useMutation({
    mutationFn: (activity: Activity) => api.createActivity(activity, userId!),
    onMutate: async (newActivity) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.activities(userId!) });

      const previousActivities = queryClient.getQueryData<Activity[]>(
        queryKeys.activities(userId!)
      );

      queryClient.setQueryData<Activity[]>(queryKeys.activities(userId!), (old = []) => [
        newActivity,
        ...old,
      ]);

      return { previousActivities };
    },
    onError: (_err, _newActivity, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(queryKeys.activities(userId!), context.previousActivities);
      }
    },
    onSettled: (_data, _error, newActivity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities(userId!) });
      // Also invalidate the lead timeline to update ActivityFeed
      if (newActivity?.leadId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.leadTimeline(userId, newActivity.leadId),
        });
      }
    },
  });

  return { addActivity };
}

/**
 * Combined hook that provides both query and mutations.
 * Drop-in replacement for useActivities hook.
 */
export function useActivities(userId: string | undefined) {
  const { data = [], isLoading, error, refetch } = useActivitiesQuery(userId);
  const { addActivity } = useActivityMutations(userId);

  return {
    activities: data,
    loading: isLoading,
    error: error?.message ?? null,
    addActivity: async (activity: Activity) => {
      await addActivity.mutateAsync(activity);
    },
    refetch: async () => {
      await refetch();
    },
  };
}

/**
 * Hook for prefetching activities for a specific lead.
 * Use this on hover to preload data before navigation.
 */
export function usePrefetchLeadActivities(userId: string | undefined) {
  return useCallback(
    (leadId: string) => {
      if (!userId) return;

      // Prefetch activities for this lead
      queryClient.prefetchQuery({
        queryKey: queryKeys.activitiesByLead(userId, leadId),
        queryFn: () => api.getActivitiesByLead(userId, leadId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    },
    [userId]
  );
}
