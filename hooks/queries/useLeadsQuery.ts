import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { Lead } from '../../types';
import { queryKeys } from '../../lib/queryClient';

/**
 * Query hook for fetching all leads for a user.
 * Provides automatic caching, background refetching, and stale-while-revalidate.
 */
export function useLeadsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.leads(userId!),
    queryFn: () => api.getLeads(userId!),
    enabled: !!userId,
  });
}

/**
 * Mutation hooks for lead CRUD operations with optimistic updates.
 */
export function useLeadMutations(userId: string | undefined) {
  const queryClient = useQueryClient();

  const addLead = useMutation({
    mutationFn: (lead: Lead) => api.createLead(lead, userId!),
    onMutate: async (newLead) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });

      // Snapshot the previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads(userId!));

      // Optimistically update
      queryClient.setQueryData<Lead[]>(queryKeys.leads(userId!), (old = []) => [
        newLead,
        ...old,
      ]);

      return { previousLeads };
    },
    onError: (_err, _newLead, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads(userId!), context.previousLeads);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
    },
  });

  const addLeads = useMutation({
    mutationFn: (leads: Lead[]) => api.createLeads(leads, userId!),
    onMutate: async (newLeads) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads(userId!));

      queryClient.setQueryData<Lead[]>(queryKeys.leads(userId!), (old = []) => [
        ...newLeads,
        ...old,
      ]);

      return { previousLeads };
    },
    onError: (_err, _newLeads, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads(userId!), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
    },
  });

  const updateLead = useMutation({
    mutationFn: (lead: Lead) => api.updateLead(lead, userId!),
    onMutate: async (updatedLead) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads(userId!));

      queryClient.setQueryData<Lead[]>(queryKeys.leads(userId!), (old = []) =>
        old.map((l) => (l.id === updatedLead.id ? updatedLead : l))
      );

      return { previousLeads };
    },
    onError: (_err, _updatedLead, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads(userId!), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
    },
  });

  const deleteLead = useMutation({
    mutationFn: (id: string) => api.deleteLead(id, userId!),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads(userId!));

      queryClient.setQueryData<Lead[]>(queryKeys.leads(userId!), (old = []) =>
        old.filter((l) => l.id !== id)
      );

      return { previousLeads };
    },
    onError: (_err, _id, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads(userId!), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
    },
  });

  return { addLead, addLeads, updateLead, deleteLead };
}

/**
 * Combined hook that provides both query and mutations.
 * Drop-in replacement for useLeads hook.
 */
export function useLeads(userId: string | undefined) {
  const { data = [], isLoading, error, refetch } = useLeadsQuery(userId);
  const { addLead, addLeads, updateLead, deleteLead } = useLeadMutations(userId);

  return {
    leads: data,
    loading: isLoading,
    error: error?.message ?? null,
    addLead: async (lead: Lead) => {
      await addLead.mutateAsync(lead);
    },
    addLeads: async (leads: Lead[]) => {
      await addLeads.mutateAsync(leads);
    },
    updateLead: async (lead: Lead) => {
      await updateLead.mutateAsync(lead);
    },
    deleteLead: async (id: string) => {
      await deleteLead.mutateAsync(id);
    },
    refetch: async () => {
      await refetch();
    },
  };
}
