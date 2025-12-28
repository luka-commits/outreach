import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { LeadFilters, PaginatedResponse } from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';
import { Lead } from '../../types';

export function useLeadsPaginatedQuery(userId: string | undefined, filters: LeadFilters) {
    return useQuery({
        queryKey: [...queryKeys.leads(userId!), 'paginated', filters],
        queryFn: () => api.getLeadsPaginated(userId!, filters),
        enabled: !!userId,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching next page
    });
}

// Type for mutation variables that can be either a Lead object or a string ID
type MutationVariables = Lead | Lead[] | string;

/**
 * We also need a mutation hook that knows how to invalidate the paginated queries.
 * When a lead is updated, we might need to refresh the list.
 */
export function usePaginatedLeadMutations(userId: string | undefined) {
    const queryClient = useQueryClient();

    const invalidateLeads = (_data: Lead | Lead[] | void | null, variables: MutationVariables) => {
        // Invalidate list
        queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });

        // Invalidate tasks (queue)
        queryClient.invalidateQueries({ queryKey: ['tasks', userId] });

        // If we updated/deleted a specific lead, invalidate that lead's detail query
        // variables is the argument passed to mutate (Lead or id)
        const leadId = typeof variables === 'object' && !Array.isArray(variables)
            ? variables.id
            : (typeof variables === 'string' ? variables : null);

        if (leadId && userId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.lead(userId, leadId) });
        }
    };

    return {
        addLead: useMutation({
            mutationFn: (lead: Lead) => api.createLead(lead, userId!),
            onSuccess: invalidateLeads,
        }),
        addLeads: useMutation({
            mutationFn: (leads: Lead[]) => api.createLeads(leads, userId!),
            onSuccess: invalidateLeads,
        }),
        updateLead: useMutation({
            mutationFn: (lead: Lead) => api.updateLead(lead, userId!),
            onMutate: async (updatedLead) => {
                // Cancel refetches
                await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });

                // Snapshot previous data (returns array of [queryKey, data])
                const previousQueries = queryClient.getQueriesData({ queryKey: queryKeys.leads(userId!) });

                // Optimistically update all matching queries
                type QueryData = Lead[] | PaginatedResponse<Lead> | undefined;
                queryClient.setQueriesData<QueryData>({ queryKey: queryKeys.leads(userId!) }, (old) => {
                    // Case 1: Full list (Lead[])
                    if (Array.isArray(old)) {
                        return old.map(l => l.id === updatedLead.id ? { ...l, ...updatedLead } : l);
                    }
                    // Case 2: Paginated response ({ data: Lead[], count: number })
                    else if (old && 'data' in old && Array.isArray(old.data)) {
                        return {
                            ...old,
                            data: old.data.map((l: Lead) => l.id === updatedLead.id ? { ...l, ...updatedLead } : l)
                        };
                    }
                    return old;
                });

                // Optimistically update the single lead detail view
                if (userId) {
                    queryClient.setQueryData<Lead>(queryKeys.lead(userId, updatedLead.id), (old) => {
                        if (old) {
                            return { ...old, ...updatedLead };
                        }
                        return old;
                    });
                }

                return { previousQueries };
            },
            onError: (_err, newLead, context) => {
                // Rollback lists
                if (context?.previousQueries) {
                    context.previousQueries.forEach(([key, data]) => {
                        queryClient.setQueryData(key, data);
                    });
                }
                // Rollback single lead (simple invalidation is safer or refetch)
                if (userId) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.lead(userId, newLead.id) });
                }
            },
            onSettled: (_data, _err, variables) => {
                // Invalidate to ensure consistency
                invalidateLeads(null, variables);
            }
        }),
        deleteLead: useMutation({
            mutationFn: (id: string) => api.deleteLead(id, userId!),
            onSuccess: invalidateLeads,
        }),
    };
}
