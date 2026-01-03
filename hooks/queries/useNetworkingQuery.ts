import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import {
  UserPublicProfile,
  UserActivityMetrics,
  LeaderboardEntry,
  UserRankInfo,
  LeaderboardPeriod,
} from '../../types';
import { queryKeys } from '../../lib/queryClient';
import { getErrorMessage } from '../../utils/errorMessages';

// ============================================
// User Public Profile Hooks
// ============================================

/**
 * Query hook for fetching current user's public profile.
 */
export function useUserPublicProfileQuery(userId: string | undefined) {
  return useQuery<UserPublicProfile | null>({
    queryKey: queryKeys.userPublicProfile(userId),
    queryFn: () => api.getUserPublicProfile(userId!),
    enabled: !!userId,
  });
}

/**
 * Mutation hook for updating user's public profile.
 * Includes rollback on error via invalidation.
 */
export function useUserPublicProfileMutations(
  userId: string | undefined,
  onError?: (message: string) => void,
  onSuccess?: () => void
) {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: (
      updates: Partial<Omit<UserPublicProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
    ) => api.upsertUserPublicProfile(userId!, updates),
    onSuccess: (data) => {
      // Update cache with new profile
      queryClient.setQueryData(queryKeys.userPublicProfile(userId), data);
      // Invalidate leaderboard queries since visibility may have changed
      // Use prefix match to invalidate all leaderboard periods
      queryClient.invalidateQueries({ queryKey: ['networking', userId, 'leaderboard'], exact: false });
      onSuccess?.();
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      onError?.(message);
      // Rollback: invalidate to refetch the correct profile
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userPublicProfile(userId) });
      }
    },
  });

  return { updateProfile };
}

// ============================================
// User Activity Metrics Hooks
// ============================================

/**
 * Query hook for fetching current user's activity metrics.
 */
export function useUserActivityMetricsQuery(userId: string | undefined) {
  return useQuery<UserActivityMetrics | null>({
    queryKey: queryKeys.userActivityMetrics(userId),
    queryFn: () => api.getUserActivityMetrics(userId!),
    enabled: !!userId,
  });
}

/**
 * Mutation hook for refreshing user's activity metrics.
 */
export function useRefreshUserActivityMetrics(
  userId: string | undefined,
  onSuccess?: () => void,
  onError?: (message: string) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.refreshUserActivityMetrics(userId!),
    onSuccess: () => {
      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.userActivityMetrics(userId) });
      // Use prefix match to invalidate all leaderboard periods and ranks
      queryClient.invalidateQueries({ queryKey: ['networking', userId, 'leaderboard'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['networking', userId, 'rank'], exact: false });
      onSuccess?.();
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      onError?.(message);
    },
  });
}

// ============================================
// Leaderboard Hooks
// ============================================

/**
 * Query hook for fetching leaderboard data.
 */
export function useLeaderboardQuery(
  userId: string | undefined,
  period: LeaderboardPeriod = 'weekly',
  limit: number = 20
) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: queryKeys.leaderboard(userId, period),
    queryFn: () => api.getLeaderboard(userId!, period, limit),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - leaderboard doesn't change frequently
  });
}

/**
 * Query hook for fetching current user's rank.
 */
export function useUserRankQuery(
  userId: string | undefined,
  period: LeaderboardPeriod = 'weekly'
) {
  return useQuery<UserRankInfo>({
    queryKey: queryKeys.userRank(userId, period),
    queryFn: () => api.getUserRank(userId!, period),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// Combined Hook for Networking Tab
// ============================================

/**
 * Combined hook for the Networking tab.
 * Provides all necessary data and mutations.
 */
export function useNetworking(userId: string | undefined, period: LeaderboardPeriod = 'weekly') {
  const profile = useUserPublicProfileQuery(userId);
  const metrics = useUserActivityMetricsQuery(userId);
  const leaderboard = useLeaderboardQuery(userId, period);
  const userRank = useUserRankQuery(userId, period);

  return {
    // Profile
    profile: profile.data,
    profileLoading: profile.isLoading,
    profileError: profile.error,

    // Metrics
    metrics: metrics.data,
    metricsLoading: metrics.isLoading,

    // Leaderboard
    leaderboard: leaderboard.data || [],
    leaderboardLoading: leaderboard.isLoading,
    leaderboardError: leaderboard.error,

    // User rank
    userRank: userRank.data,
    userRankLoading: userRank.isLoading,

    // Refetch functions
    refetchLeaderboard: leaderboard.refetch,
    refetchProfile: profile.refetch,
    refetchMetrics: metrics.refetch,
  };
}
