import { useQuery } from '@tanstack/react-query';
import { getLeadCountsByStatus } from '../../services/supabase';
import { useAuth } from '../useAuth';
import { Lead } from '../../types';
import { queryKeys } from '../../lib/queryClient';

export function useLeadCountQuery() {
    const { user } = useAuth();

    return useQuery({
        queryKey: queryKeys.leadCounts(user?.id),
        queryFn: async () => {
            if (!user?.id) return 0;
            const counts = await getLeadCountsByStatus(user.id);
            // Sum all counts to get total leads
            return Object.values(counts).reduce((acc, curr) => acc + curr, 0);
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // Cache for 5 mins
    });
}

/**
 * Hook to get lead counts broken down by status for funnel visualization
 */
export function useLeadStatusCounts() {
    const { user } = useAuth();

    return useQuery<Record<Lead['status'], number>>({
        queryKey: queryKeys.leadStatusCounts(user?.id),
        queryFn: async () => {
            if (!user?.id) {
                return {
                    not_contacted: 0,
                    in_progress: 0,
                    replied: 0,
                    qualified: 0,
                    disqualified: 0,
                };
            }
            return await getLeadCountsByStatus(user.id);
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 2, // Cache for 2 mins
    });
}
