import { useQuery } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';

export function useLeadActivitiesQuery(userId: string | undefined, leadId: string) {
    return useQuery({
        queryKey: ['activities', userId, leadId],
        queryFn: () => api.getActivitiesByLead(userId!, leadId, { limit: 100 }), // Fetch last 100 activities
        enabled: !!userId && !!leadId,
        select: (data) => data.data // Extract just the array from PaginatedResponse
    });
}
