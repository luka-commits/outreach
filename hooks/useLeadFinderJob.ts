import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '../services/supabase';
import { queryKeys } from '../lib/queryClient';

export interface LeadFinderLead {
  company_name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating?: number;
  review_count?: number;
  category?: string;
  facebook_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
}

export interface LeadFinderJob {
  id: string;
  user_id: string;
  job_type: string;
  keyword: string;
  location: string | null;
  country: string;
  max_ads: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage: string;
  progress: number;
  stage_message: string | null;
  result_leads: LeadFinderLead[] | null;
  result_duplicates: LeadFinderLead[] | null;
  total_found: number | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Hook to fetch and subscribe to a lead finder job.
 * Uses Supabase realtime to get instant updates when the job status changes.
 */
export function useLeadFinderJob(jobId: string | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for this job
  useEffect(() => {
    if (!userId || !jobId) return;

    const channel = supabase
      .channel(`lead-finder-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scrape_jobs',
          filter: `id=eq.${jobId}`,
        },
        () => {
          // Force refetch to get latest data - invalidateQueries is more reliable than setQueryData
          queryClient.invalidateQueries({
            queryKey: queryKeys.leadFinderJob(userId, jobId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, jobId, queryClient]);

  // Timeout for stuck jobs (10 minutes)
  const JOB_TIMEOUT_MS = 10 * 60 * 1000;

  const query = useQuery({
    queryKey: queryKeys.leadFinderJob(userId, jobId!),
    queryFn: async (): Promise<LeadFinderJob | null> => {
      const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('id', jobId!)
        .eq('user_id', userId!)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - job not found
          return null;
        }
        throw error;
      }

      // Auto-fail jobs stuck in processing for too long
      if (data.status === 'processing' || data.status === 'pending') {
        const createdAt = new Date(data.created_at);
        const elapsed = Date.now() - createdAt.getTime();
        if (elapsed > JOB_TIMEOUT_MS) {
          return {
            ...data,
            status: 'failed',
            error_message: 'Search timed out. Please try again.',
          } as LeadFinderJob;
        }
      }

      return data as LeadFinderJob;
    },
    enabled: !!userId && !!jobId,
    // Refetch more frequently while job is in progress
    refetchInterval: (query) => {
      const job = query.state.data;
      if (job && (job.status === 'pending' || job.status === 'processing')) {
        return 3000; // Poll every 3 seconds while processing
      }
      return false; // Stop polling when complete
    },
  });

  return {
    job: query.data,
    isLoading: query.isLoading,
    error: query.error,
    // Convenience properties
    isProcessing: query.data?.status === 'pending' || query.data?.status === 'processing',
    isCompleted: query.data?.status === 'completed',
    isFailed: query.data?.status === 'failed',
    leads: query.data?.result_leads || [],
    duplicates: query.data?.result_duplicates || [],
  };
}

/**
 * Hook to fetch the user's most recent lead finder job.
 * Useful for checking if there's an active search in progress.
 */
export function useActiveLeadFinderJob() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Subscribe to realtime updates for user's lead finder jobs
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`lead-finder-jobs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scrape_jobs',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate the jobs list query
          queryClient.invalidateQueries({ queryKey: queryKeys.leadFinderJobs(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: queryKeys.leadFinderJobs(userId),
    queryFn: async (): Promise<LeadFinderJob | null> => {
      const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('user_id', userId!)
        .eq('job_type', 'lead_finder')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LeadFinderJob | null;
    },
    enabled: !!userId,
    refetchInterval: 10000, // Poll every 10 seconds to check for active jobs
  });
}
