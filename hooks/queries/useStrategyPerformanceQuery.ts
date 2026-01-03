import { useQuery } from '@tanstack/react-query';
import { getStrategyPerformance } from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../useAuth';

/**
 * Query hook for fetching strategy performance metrics.
 */
export function useStrategyPerformance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.strategyPerformance(user?.id),
    queryFn: () => getStrategyPerformance(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes - strategy stats don't change frequently
  });
}
