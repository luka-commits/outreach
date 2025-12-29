import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { TwilioCredentials } from '../../types';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../useAuth';

/**
 * Query hook for fetching Twilio credentials.
 */
export function useTwilioCredentials() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.twilioCredentials(user?.id),
    queryFn: () => api.getTwilioCredentials(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Mutation hook for updating Twilio credentials.
 */
export function useUpdateTwilioCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: TwilioCredentials) => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.updateTwilioCredentials(user.id, creds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.twilioCredentials(user?.id),
      });
    },
  });
}

/**
 * Mutation hook for clearing Twilio credentials.
 */
export function useClearTwilioCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.clearTwilioCredentials(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.twilioCredentials(user?.id),
      });
    },
  });
}

/**
 * Hook to check if Twilio is configured.
 */
export function useHasTwilioConfigured() {
  const { data: credentials, isLoading } = useTwilioCredentials();

  return {
    isConfigured: !!credentials,
    isLoading,
    credentials,
  };
}
