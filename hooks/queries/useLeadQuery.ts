import { useQuery } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { queryKeys } from '../../lib/queryClient';

export function useLeadQuery(leadId: string | undefined, userId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.lead(userId!, leadId!),
        queryFn: () => api.getLead(leadId!, userId!),
        enabled: !!leadId && !!userId,
    });
}
