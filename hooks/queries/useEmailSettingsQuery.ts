import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../../services/supabase';
import { GmailCredentials, ResendCredentials, EmailProvider } from '../../types';
import { queryKeys } from '../../lib/queryClient';
import { useAuth } from '../useAuth';

// ============================================
// GMAIL CREDENTIALS
// ============================================

/**
 * Query hook for fetching Gmail OAuth credentials.
 */
export function useGmailCredentials() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.gmailCredentials(user?.id),
    queryFn: () => api.getGmailCredentials(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Mutation hook for updating Gmail OAuth credentials.
 */
export function useUpdateGmailCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: GmailCredentials) => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.updateGmailCredentials(user.id, creds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gmailCredentials(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailProvider(user?.id),
      });
    },
  });
}

/**
 * Mutation hook for clearing Gmail OAuth credentials.
 */
export function useClearGmailCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.clearGmailCredentials(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.gmailCredentials(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailProvider(user?.id),
      });
    },
  });
}

/**
 * Hook to check if Gmail is configured.
 */
export function useHasGmailConfigured() {
  const { data: credentials, isLoading } = useGmailCredentials();

  return {
    isConfigured: !!credentials,
    isLoading,
    credentials,
  };
}

// ============================================
// RESEND CREDENTIALS
// ============================================

/**
 * Query hook for fetching Resend API credentials.
 */
export function useResendCredentials() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.resendCredentials(user?.id),
    queryFn: () => api.getResendCredentials(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Mutation hook for updating Resend API credentials.
 */
export function useUpdateResendCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: ResendCredentials) => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.updateResendCredentials(user.id, creds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.resendCredentials(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailProvider(user?.id),
      });
    },
  });
}

/**
 * Mutation hook for clearing Resend API credentials.
 */
export function useClearResendCredentials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.clearResendCredentials(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.resendCredentials(user?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailProvider(user?.id),
      });
    },
  });
}

/**
 * Hook to check if Resend is configured.
 */
export function useHasResendConfigured() {
  const { data: credentials, isLoading } = useResendCredentials();

  return {
    isConfigured: !!credentials,
    isLoading,
    credentials,
  };
}

// ============================================
// EMAIL PROVIDER
// ============================================

/**
 * Query hook for fetching the current email provider.
 */
export function useEmailProvider() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.emailProvider(user?.id),
    queryFn: () => api.getEmailProvider(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Mutation hook for setting the email provider.
 */
export function useSetEmailProvider() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: EmailProvider) => {
      if (!user?.id) throw new Error('User not authenticated');
      return api.setEmailProvider(user.id, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.emailProvider(user?.id),
      });
    },
  });
}

// ============================================
// COMBINED EMAIL CONFIGURATION
// ============================================

/**
 * Hook to check if any email provider is configured.
 */
export function useHasEmailConfigured() {
  const { isConfigured: gmailConfigured, isLoading: gmailLoading } = useHasGmailConfigured();
  const { isConfigured: resendConfigured, isLoading: resendLoading } = useHasResendConfigured();
  const { data: provider, isLoading: providerLoading } = useEmailProvider();

  return {
    isConfigured: gmailConfigured || resendConfigured,
    isLoading: gmailLoading || resendLoading || providerLoading,
    provider,
    gmailConfigured,
    resendConfigured,
  };
}
