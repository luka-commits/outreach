import { useQuery } from '@tanstack/react-query';
import {
  getStaleLeadsCount,
  getChannelPerformance,
  getWeeklyTrends,
  getAvgDaysOverdue,
  getReportingDashboard,
} from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../useAuth';
import { ReportingDashboard } from '../../types';

/**
 * Query hook for fetching stale leads count.
 * Stale leads are in_progress leads with no activity in X days.
 */
export function useStaleLeadsCount(days: number = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.staleLeadsCount(user?.id),
    queryFn: () => getStaleLeadsCount(user!.id, days),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Query hook for fetching channel performance stats.
 * Returns reply rates per channel (email, call, instagram, etc).
 */
export function useChannelPerformance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.channelPerformance(user?.id),
    queryFn: () => getChannelPerformance(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Query hook for fetching weekly trend data.
 * Returns activities, replies, and qualified counts per week.
 */
export function useWeeklyTrends(weeks: number = 12) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.weeklyTrends(user?.id, weeks),
    queryFn: () => getWeeklyTrends(user!.id, weeks),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Query hook for fetching average days overdue.
 * Returns average number of days tasks are overdue.
 */
export function useAvgDaysOverdue() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.avgDaysOverdue(user?.id),
    queryFn: () => getAvgDaysOverdue(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes - task data changes frequently
  });
}

/**
 * Combined query hook for fetching all reporting dashboard data in a single RPC call.
 * Reduces 4 separate queries to 1 for better performance on the Reporting page.
 */
export function useReportingDashboard(staleDays: number = 7, trendWeeks: number = 12) {
  const { user } = useAuth();

  return useQuery<ReportingDashboard>({
    queryKey: queryKeys.reportingDashboard(user?.id, staleDays, trendWeeks),
    queryFn: () => getReportingDashboard(user!.id, staleDays, trendWeeks),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - reporting data doesn't change frequently
  });
}
