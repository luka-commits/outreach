import { useCallback } from 'react';
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
        staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes (was 30s)
    });
}

/**
 * Hook to prefetch the next/previous page of leads.
 * Call prefetchPage on hover over pagination buttons for instant navigation feel.
 */
export function usePrefetchLeadsPage(userId: string | undefined, currentFilters: LeadFilters) {
    const queryClient = useQueryClient();

    const prefetchPage = useCallback((page: number) => {
        if (!userId) return;

        const pageSize = currentFilters.limit || 25;
        const prefetchFilters: LeadFilters = {
            ...currentFilters,
            offset: (page - 1) * pageSize,
        };

        queryClient.prefetchQuery({
            queryKey: [...queryKeys.leads(userId), 'paginated', prefetchFilters],
            queryFn: () => api.getLeadsPaginated(userId, prefetchFilters),
            staleTime: 1000 * 60 * 2, // Keep prefetched data fresh for 2 minutes
        });
    }, [queryClient, userId, currentFilters]);

    return { prefetchPage };
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
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });

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
            // The optimistic update handles the UI, and React Query's staleTime
            // will eventually refresh the data. This prevents lead position jumping.
            // Smart invalidation: only invalidate tasks if the update might affect task queue
            onSettled: (_data, _error, updatedLead) => {
                // Only invalidate tasks if status, nextTaskDate, or strategy changed
                // These are the fields that affect the task queue
                const taskRelevantFields = ['status', 'nextTaskDate', 'strategyId', 'currentStepIndex'];
                const needsTaskInvalidation = taskRelevantFields.some(field =>
                    field in updatedLead && updatedLead[field as keyof Lead] !== undefined
                );

                if (needsTaskInvalidation) {
                    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
                    queryClient.invalidateQueries({ queryKey: queryKeys.tasksAllScheduled(userId) });
                }
            }
        }),
        deleteLead: useMutation({
            mutationFn: (id: string) => api.deleteLead(id, userId!),
            onSuccess: invalidateLeads,
        }),

        // ========================================
        // BULK MUTATIONS
        // ========================================
        bulkDelete: useMutation({
            mutationFn: (ids: string[]) => api.deleteLeads(ids, userId!),
            onMutate: async (ids) => {
                await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });

                // Snapshot previous data
                const previousQueries = queryClient.getQueriesData({ queryKey: queryKeys.leads(userId!) });

                // Optimistically remove leads from cache
                type QueryData = Lead[] | PaginatedResponse<Lead> | undefined;
                const idSet = new Set(ids);
                queryClient.setQueriesData<QueryData>({ queryKey: queryKeys.leads(userId!) }, (old) => {
                    if (Array.isArray(old)) {
                        return old.filter(l => !idSet.has(l.id));
                    } else if (old && 'data' in old && Array.isArray(old.data)) {
                        return {
                            ...old,
                            data: old.data.filter((l: Lead) => !idSet.has(l.id)),
                            count: old.count - ids.length,
                        };
                    }
                    return old;
                });

                return { previousQueries };
            },
            onError: (_err, _ids, context) => {
                // Rollback on error
                if (context?.previousQueries) {
                    context.previousQueries.forEach(([key, data]) => {
                        queryClient.setQueryData(key, data);
                    });
                }
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasksAllScheduled(userId) });
            },
        }),

        bulkUpdateStatus: useMutation({
            mutationFn: ({ ids, status }: { ids: string[]; status: Lead['status'] }) =>
                api.updateLeadsStatus(ids, status, userId!),
            onMutate: async ({ ids, status }) => {
                await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });

                // Snapshot previous data
                const previousQueries = queryClient.getQueriesData({ queryKey: queryKeys.leads(userId!) });

                // Optimistically update status in cache
                type QueryData = Lead[] | PaginatedResponse<Lead> | undefined;
                const idSet = new Set(ids);
                const terminalStatuses = ['replied', 'qualified', 'disqualified'];
                const isTerminal = terminalStatuses.includes(status);

                queryClient.setQueriesData<QueryData>({ queryKey: queryKeys.leads(userId!) }, (old) => {
                    const updateLead = (l: Lead): Lead => {
                        if (!idSet.has(l.id)) return l;
                        return {
                            ...l,
                            status,
                            nextTaskDate: isTerminal ? undefined : l.nextTaskDate,
                        };
                    };

                    if (Array.isArray(old)) {
                        return old.map(updateLead);
                    } else if (old && 'data' in old && Array.isArray(old.data)) {
                        return {
                            ...old,
                            data: old.data.map(updateLead),
                        };
                    }
                    return old;
                });

                return { previousQueries };
            },
            onError: (_err, _vars, context) => {
                if (context?.previousQueries) {
                    context.previousQueries.forEach(([key, data]) => {
                        queryClient.setQueryData(key, data);
                    });
                }
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasksAllScheduled(userId) });
            },
        }),

        bulkAssignStrategy: useMutation({
            mutationFn: ({ ids, strategyId }: { ids: string[]; strategyId: string | null }) =>
                api.updateLeadsStrategy(ids, strategyId, userId!),
            onMutate: async ({ ids, strategyId }) => {
                await queryClient.cancelQueries({ queryKey: queryKeys.leads(userId!) });

                // Snapshot previous data
                const previousQueries = queryClient.getQueriesData({ queryKey: queryKeys.leads(userId!) });

                // Optimistically update strategy in cache
                type QueryData = Lead[] | PaginatedResponse<Lead> | undefined;
                const idSet = new Set(ids);

                queryClient.setQueriesData<QueryData>({ queryKey: queryKeys.leads(userId!) }, (old) => {
                    const updateLead = (l: Lead): Lead => {
                        if (!idSet.has(l.id)) return l;
                        return {
                            ...l,
                            strategyId: strategyId || undefined,
                            currentStepIndex: strategyId ? 0 : 0,
                            nextTaskDate: undefined,
                        };
                    };

                    if (Array.isArray(old)) {
                        return old.map(updateLead);
                    } else if (old && 'data' in old && Array.isArray(old.data)) {
                        return {
                            ...old,
                            data: old.data.map(updateLead),
                        };
                    }
                    return old;
                });

                return { previousQueries };
            },
            onError: (_err, _vars, context) => {
                if (context?.previousQueries) {
                    context.previousQueries.forEach(([key, data]) => {
                        queryClient.setQueryData(key, data);
                    });
                }
            },
            onSettled: () => {
                queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId!) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasksAllScheduled(userId) });
            },
        }),
    };
}
