import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';
import type { SavedFilter } from '../../types';

/**
 * Hook to get all saved filters for the current user.
 */
export function useSavedFiltersQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.savedFilters(userId),
    queryFn: () => api.getSavedFilters(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to get counts for all saved filters.
 * Useful for showing count badges in the sidebar.
 */
export function useSavedFilterCounts(userId: string | undefined, savedFilters: SavedFilter[] | undefined) {
  return useQuery({
    queryKey: queryKeys.savedFilterCounts(userId),
    queryFn: () => api.getSavedFilterCounts(userId!, savedFilters!),
    enabled: !!userId && !!savedFilters && savedFilters.length > 0,
    // Counts can be stale for a bit longer since they're not critical
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to create a new saved filter.
 */
export function useCreateSavedFilter(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filter: { name: string; icon?: string; color?: string; filters: Record<string, unknown> }) =>
      api.createSavedFilter(userId!, filter),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFilters(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFilterCounts(userId) });
    },
  });
}

/**
 * Hook to update a saved filter.
 */
export function useUpdateSavedFilter(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ filterId, updates }: { filterId: string; updates: Partial<Pick<SavedFilter, 'name' | 'icon' | 'color' | 'filters'>> }) =>
      api.updateSavedFilter(userId!, filterId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFilters(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFilterCounts(userId) });
    },
  });
}

/**
 * Hook to delete a saved filter.
 */
export function useDeleteSavedFilter(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filterId: string) => api.deleteSavedFilter(userId!, filterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFilters(userId) });
    },
  });
}

/**
 * Hook to reorder saved filters.
 */
export function useReorderSavedFilters(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filterIds: string[]) => api.reorderSavedFilters(userId!, filterIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedFilters(userId) });
    },
  });
}
