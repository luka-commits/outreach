import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { OutreachGoals } from '../../types';
import { queryKeys } from '../../lib/queryClient';
import { useRef, useCallback, useEffect } from 'react';
import { getErrorMessage } from '../../utils/errorMessages';

const DEFAULT_GOALS: OutreachGoals = {
  instagram: 25,
  facebook: 15,
  linkedin: 20,
  email: 30,
  call: 20,
  walkIn: 5,
};

/**
 * Query hook for fetching goals for a user.
 */
export function useGoalsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.goals(userId!),
    queryFn: async () => {
      const data = await api.getGoals(userId!);
      return data ?? DEFAULT_GOALS;
    },
    enabled: !!userId,
    initialData: DEFAULT_GOALS,
  });
}

/**
 * Mutation hook for updating goals with debouncing.
 */
export function useGoalsMutations(userId: string | undefined, onError?: (message: string) => void) {
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const updateGoals = useMutation({
    mutationFn: (goals: OutreachGoals) => api.updateGoals(goals, userId!),
    onError: (error) => {
      const message = getErrorMessage(error);
      onError?.(message);
      // Rollback: invalidate to refetch the correct goals
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.goals(userId) });
      }
    },
  });

  // Debounced update function
  const debouncedUpdate = useCallback(
    (newGoals: OutreachGoals) => {
      if (!userId) return;

      // Update cache immediately for responsive UI
      queryClient.setQueryData(queryKeys.goals(userId), newGoals);

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce the actual API call
      timeoutRef.current = setTimeout(() => {
        updateGoals.mutate(newGoals);
      }, 500);
    },
    [userId, queryClient, updateGoals]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { updateGoals: debouncedUpdate };
}

/**
 * Combined hook that provides both query and mutations.
 * Drop-in replacement for useGoals hook.
 */
export function useGoals(userId: string | undefined, onMutationError?: (message: string) => void) {
  const { data = DEFAULT_GOALS, isLoading, error, refetch } = useGoalsQuery(userId);
  const { updateGoals } = useGoalsMutations(userId, onMutationError);

  return {
    goals: data,
    loading: isLoading,
    error: error?.message ?? null,
    updateGoals,
    refetch: async () => {
      await refetch();
    },
  };
}
