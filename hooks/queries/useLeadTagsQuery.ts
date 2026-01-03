import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';

/**
 * Hook to get all tags for the current user.
 */
export function useLeadTagsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leadTags(userId),
    queryFn: () => api.getLeadTags(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to get tags assigned to a specific lead.
 */
export function useLeadTagsForLeadQuery(userId: string | undefined, leadId: string) {
  return useQuery({
    queryKey: queryKeys.leadTagsForLead(userId, leadId),
    queryFn: () => api.getTagsForLead(userId!, leadId),
    enabled: !!userId && !!leadId,
  });
}

/**
 * Hook to create a new tag.
 */
export function useCreateLeadTag(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color?: string }) =>
      api.createLeadTag(userId!, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTags(userId) });
    },
  });
}

/**
 * Hook to update a tag.
 */
export function useUpdateLeadTag(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, updates }: { tagId: string; updates: { name?: string; color?: string } }) =>
      api.updateLeadTag(userId!, tagId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTags(userId) });
    },
  });
}

/**
 * Hook to delete a tag.
 */
export function useDeleteLeadTag(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) => api.deleteLeadTag(userId!, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTags(userId) });
      // Also invalidate all lead-specific tag queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTagsByLeadPrefix(userId) });
    },
  });
}

/**
 * Hook to assign a tag to a lead.
 */
export function useAssignTagToLead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, tagId }: { leadId: string; tagId: string }) =>
      api.assignTagToLead(userId!, leadId, tagId),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTagsForLead(userId, leadId) });
    },
  });
}

/**
 * Hook to remove a tag from a lead.
 */
export function useRemoveTagFromLead(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadId, tagId }: { leadId: string; tagId: string }) =>
      api.removeTagFromLead(userId!, leadId, tagId),
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTagsForLead(userId, leadId) });
    },
  });
}

/**
 * Hook to bulk assign a tag to multiple leads.
 */
export function useBulkAssignTag(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, tagId }: { leadIds: string[]; tagId: string }) =>
      api.bulkAssignTag(userId!, leadIds, tagId),
    onSuccess: () => {
      // Invalidate all lead-specific tag queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTagsByLeadPrefix(userId) });
    },
  });
}

/**
 * Hook to bulk remove a tag from multiple leads.
 */
export function useBulkRemoveTag(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leadIds, tagId }: { leadIds: string[]; tagId: string }) =>
      api.bulkRemoveTag(userId!, leadIds, tagId),
    onSuccess: () => {
      // Invalidate all lead-specific tag queries
      queryClient.invalidateQueries({ queryKey: queryKeys.leadTagsByLeadPrefix(userId) });
    },
  });
}
