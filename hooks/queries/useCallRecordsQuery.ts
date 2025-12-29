import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { CallRecord } from '../../types';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../useAuth';

/**
 * Query hook for fetching call records for a specific lead.
 */
export function useCallRecordsByLead(leadId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.callRecordsByLead(user?.id, leadId!),
    queryFn: () => api.getCallsByLead(user!.id, leadId!),
    enabled: !!user?.id && !!leadId,
  });
}

/**
 * Query hook for fetching call metrics for reporting/analytics.
 */
export function useCallMetrics(dateRange?: { start: Date; end: Date }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.callMetrics(user?.id),
    queryFn: () => api.getCallMetrics(user!.id, dateRange),
    enabled: !!user?.id,
  });
}

/**
 * Mutation hook for creating a new call record.
 */
export function useCreateCallRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      fromNumber,
      toNumber,
    }: {
      leadId: string;
      fromNumber: string;
      toNumber: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.createCallRecord(user.id, leadId, fromNumber, toNumber);
    },
    onSuccess: (newRecord) => {
      // Invalidate call records for the lead
      queryClient.invalidateQueries({
        queryKey: queryKeys.callRecordsByLead(user?.id, newRecord.leadId),
      });
    },
  });
}

/**
 * Mutation hook for updating a call record.
 */
export function useUpdateCallRecord() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      updates,
    }: {
      callId: string;
      leadId: string;
      updates: Partial<Omit<CallRecord, 'id' | 'userId' | 'leadId'>>;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.updateCallRecord(callId, user.id, updates);
    },
    onMutate: async ({ callId, leadId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.callRecordsByLead(user?.id, leadId),
      });

      // Snapshot the previous value
      const previousRecords = queryClient.getQueryData<CallRecord[]>(
        queryKeys.callRecordsByLead(user?.id, leadId)
      );

      // Optimistically update
      if (previousRecords) {
        queryClient.setQueryData<CallRecord[]>(
          queryKeys.callRecordsByLead(user?.id, leadId),
          previousRecords.map((record) =>
            record.id === callId ? { ...record, ...updates } : record
          )
        );
      }

      return { previousRecords, leadId };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousRecords) {
        queryClient.setQueryData(
          queryKeys.callRecordsByLead(user?.id, context.leadId),
          context.previousRecords
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.callRecordsByLead(user?.id, variables.leadId),
      });
      // Also invalidate metrics
      queryClient.invalidateQueries({
        queryKey: queryKeys.callMetrics(user?.id),
      });
    },
  });
}
