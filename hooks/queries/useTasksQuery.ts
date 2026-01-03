import { useQuery } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';

/**
 * Fetches tasks due up to today (overdue + today).
 */
export function useTasksQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.tasks(userId),
        queryFn: () => api.getDueTasks(userId!),
        enabled: !!userId,
        // Tasks change frequently, but we can keep them fresh for a bit
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

/**
 * Fetches all scheduled tasks including upcoming ones.
 * Limited to 500 for performance.
 */
export function useAllScheduledTasksQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.tasksAllScheduled(userId),
        queryFn: () => api.getAllScheduledTasks(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 5,
    });
}

/**
 * Fetches task counts by category efficiently (server-side counting).
 */
export function useTaskCountsQuery(userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.tasksCounts(userId),
        queryFn: () => api.getTaskCounts(userId!),
        enabled: !!userId,
        staleTime: 1000 * 60 * 2, // 2 minutes - counts change more frequently
    });
}
