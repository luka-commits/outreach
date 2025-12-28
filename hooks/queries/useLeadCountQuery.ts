import { useQuery } from '@tanstack/react-query';
import { getLeadCountsByStatus } from '../../services/supabase';
import { useAuth } from '../useAuth';

export function useLeadCountQuery() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['lead-counts', user?.id],
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
