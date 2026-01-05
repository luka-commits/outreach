import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { Strategy } from '../../types';
import { queryKeys } from '../../lib/queryClient';

type PositionUpdate = { id: string; position: number };

/**
 * Query hook for fetching all strategies for a user.
 */
export function useStrategiesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.strategies(userId!),
    queryFn: () => api.getStrategies(userId!),
    enabled: !!userId,
  });
}

/**
 * Mutation hooks for strategy CRUD operations.
 */
export function useStrategyMutations(userId: string | undefined) {
  const queryClient = useQueryClient();

  const addStrategy = useMutation({
    mutationFn: (strategy: Strategy) => api.createStrategy(strategy, userId!),
    onMutate: async (newStrategy) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies(userId!) });

      const previousStrategies = queryClient.getQueryData<Strategy[]>(
        queryKeys.strategies(userId!)
      );

      queryClient.setQueryData<Strategy[]>(queryKeys.strategies(userId!), (old = []) => [
        newStrategy,
        ...old,
      ]);

      return { previousStrategies };
    },
    onError: (_err, _newStrategy, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(userId!), context.previousStrategies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId!) });
    },
  });

  const updateStrategy = useMutation({
    mutationFn: (strategy: Strategy) => api.updateStrategy(strategy, userId!),
    onMutate: async (updatedStrategy) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies(userId!) });

      const previousStrategies = queryClient.getQueryData<Strategy[]>(
        queryKeys.strategies(userId!)
      );

      queryClient.setQueryData<Strategy[]>(queryKeys.strategies(userId!), (old = []) =>
        old.map((s) => (s.id === updatedStrategy.id ? updatedStrategy : s))
      );

      return { previousStrategies };
    },
    onError: (_err, _updatedStrategy, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(userId!), context.previousStrategies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId!) });
    },
  });

  const deleteStrategy = useMutation({
    mutationFn: (id: string) => api.deleteStrategy(id, userId!),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies(userId!) });

      const previousStrategies = queryClient.getQueryData<Strategy[]>(
        queryKeys.strategies(userId!)
      );

      queryClient.setQueryData<Strategy[]>(queryKeys.strategies(userId!), (old = []) =>
        old.filter((s) => s.id !== id)
      );

      return { previousStrategies };
    },
    onError: (_err, _id, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(userId!), context.previousStrategies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId!) });
    },
  });

  const reorderStrategies = useMutation({
    mutationFn: (updates: PositionUpdate[]) => api.updateStrategyPositions(updates, userId!),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.strategies(userId!) });

      const previousStrategies = queryClient.getQueryData<Strategy[]>(
        queryKeys.strategies(userId!)
      );

      // Apply position updates optimistically
      queryClient.setQueryData<Strategy[]>(queryKeys.strategies(userId!), (old = []) => {
        const positionMap = new Map(updates.map((u) => [u.id, u.position]));
        return old
          .map((s) => ({
            ...s,
            position: positionMap.has(s.id) ? positionMap.get(s.id)! : (s.position ?? 0),
          }))
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      });

      return { previousStrategies };
    },
    onError: (_err, _updates, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(queryKeys.strategies(userId!), context.previousStrategies);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(userId!) });
    },
  });

  return { addStrategy, updateStrategy, deleteStrategy, reorderStrategies };
}

/**
 * Combined hook that provides both query and mutations.
 * Drop-in replacement for useStrategies hook.
 */
export function useStrategies(userId: string | undefined) {
  const { data = [], isLoading, error, refetch } = useStrategiesQuery(userId);
  const { addStrategy, updateStrategy, deleteStrategy, reorderStrategies } = useStrategyMutations(userId);

  return {
    strategies: data,
    loading: isLoading,
    error: error?.message ?? null,
    addStrategy: async (strategy: Strategy) => {
      await addStrategy.mutateAsync(strategy);
    },
    updateStrategy: async (strategy: Strategy) => {
      await updateStrategy.mutateAsync(strategy);
    },
    deleteStrategy: async (id: string) => {
      await deleteStrategy.mutateAsync(id);
    },
    reorderStrategies: async (updates: PositionUpdate[]) => {
      await reorderStrategies.mutateAsync(updates);
    },
    refetch: async () => {
      await refetch();
    },
  };
}
