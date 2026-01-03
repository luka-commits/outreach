import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys, invalidateLeadRelatedQueries } from '../../lib/queryClient';
import type { DuplicateType, MergeConfig } from '../../types';

/**
 * Hook to get duplicates by type.
 */
export function useDuplicatesQuery(userId: string | undefined, type: DuplicateType) {
  return useQuery({
    queryKey: queryKeys.duplicates(userId, type),
    queryFn: () => {
      switch (type) {
        case 'company_name':
          return api.findDuplicatesByCompanyName(userId!);
        case 'email':
          return api.findDuplicatesByEmail(userId!);
        case 'phone':
          return api.findDuplicatesByPhone(userId!);
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes - duplicates don't change often
  });
}

/**
 * Hook to get duplicates summary (count per type).
 */
export function useDuplicatesSummary(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.duplicatesSummary(userId),
    queryFn: () => api.getDuplicatesSummary(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to merge duplicate leads.
 */
export function useMergeLeads(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: MergeConfig) => api.mergeLeads(userId!, config),
    onSuccess: () => {
      // Invalidate all duplicate queries
      queryClient.invalidateQueries({ queryKey: ['duplicates', userId] });
      // Invalidate lead queries since we deleted/modified leads
      if (userId) {
        invalidateLeadRelatedQueries(queryClient, userId);
      }
    },
  });
}
