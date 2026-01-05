import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';
import type { PipelinePreferences } from '../../types';

/**
 * Hook to get pipeline preferences (column visibility) for the current user.
 * Returns null if no preferences have been saved yet.
 */
export function usePipelinePreferencesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.pipelinePreferences(userId),
    queryFn: () => api.getPipelinePreferences(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to update pipeline preferences with optimistic updates.
 */
export function useUpdatePipelinePreferences(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: Partial<Pick<PipelinePreferences, 'visibleColumns' | 'visibleCustomFields' | 'columnOrder'>>
    ) => api.upsertPipelinePreferences(userId!, updates),
    onMutate: async (updates) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.pipelinePreferences(userId) });

      // Snapshot the previous value
      const previous = queryClient.getQueryData<PipelinePreferences | null>(
        queryKeys.pipelinePreferences(userId)
      );

      // Optimistically update to the new value
      queryClient.setQueryData<PipelinePreferences | null>(
        queryKeys.pipelinePreferences(userId),
        (old) => {
          if (!old) {
            // Create a new preferences object if none exists
            return {
              id: 'temp',
              visibleColumns: updates.visibleColumns || [],
              visibleCustomFields: updates.visibleCustomFields || [],
              columnOrder: updates.columnOrder,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            ...old,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
      );

      return { previous };
    },
    onSuccess: (data) => {
      // Update cache with the real server response
      // This ensures subsequent refetches won't overwrite with stale data
      queryClient.setQueryData(queryKeys.pipelinePreferences(userId), data);
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.pipelinePreferences(userId), context.previous);
      }
    },
    // Note: We intentionally don't invalidate queries here.
    // The optimistic update already has the correct data, and invalidating
    // would trigger a refetch that could overwrite our changes before
    // the database write completes.
  });
}
