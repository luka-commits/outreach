import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import * as api from '../../services/supabase';
import { ScrapeJob } from '../../types';
import { queryKeys } from '../../lib/queryClient';

// Timeout check interval (every 30 seconds)
const TIMEOUT_CHECK_INTERVAL = 30 * 1000;

// Polling interval when jobs are active (every 5 seconds)
const ACTIVE_JOB_POLL_INTERVAL = 5 * 1000;

/**
 * Query hook for fetching scrape job history.
 * Automatically polls when there are active jobs (pending/processing).
 */
export function useScrapeJobsQuery(userId: string | undefined, hasActiveJobs: boolean = false) {
  return useQuery({
    queryKey: queryKeys.scrapeJobs(userId!),
    queryFn: () => api.getScrapeJobs(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter than default for more real-time feel
    // Poll every 5 seconds when there are active jobs (fallback for realtime)
    refetchInterval: hasActiveJobs ? ACTIVE_JOB_POLL_INTERVAL : false,
  });
}

/**
 * Mutation hook for creating a new scrape job and triggering via Edge Function.
 * The Edge Function securely fetches user's API keys and calls Modal.
 */
export function useCreateScrapeJobMutation(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      niche: string;
      location: string;
      leadCount: number;
      expandedRadius: boolean;
    }) => {
      // 1. Create job in database
      const job = await api.createScrapeJob(params, userId!);

      // 2. Call start-scrape Edge Function (fetches API keys server-side)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const session = await api.getSession();

      console.log(' Debug: Starting Scrape...');
      console.log(' Debug: URL', `${supabaseUrl}/functions/v1/start-scrape`);
      console.log(' Debug: Session Present?', !!session);
      console.log(' Debug: Token Present?', !!session?.access_token);
      if (session?.access_token) {
        console.log(' Debug: Token Preview', session.access_token.substring(0, 10) + '...');
      }

      if (!session?.access_token) {
        await api.updateScrapeJobStatus(job.id, userId!, 'failed');
        throw new Error('Not authenticated');
      }

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/start-scrape`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            job_id: job.id,
            niche: params.niche,
            location: params.location,
            limit: params.leadCount,
            increase_radius: params.expandedRadius,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          // Check for specific error about API keys
          if (result.error === 'API keys not configured') {
            throw new Error('API keys not configured. Please add your Apify and Anthropic API keys in Settings.');
          }
          throw new Error(result.error || 'Failed to start scraping workflow');
        }
      } catch (error) {
        // Update job status to failed on error
        await api.updateScrapeJobStatus(job.id, userId!, 'failed');
        throw error;
      }

      return job;
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.scrapeJobs(userId!) });

      const previousJobs = queryClient.getQueryData<ScrapeJob[]>(
        queryKeys.scrapeJobs(userId!)
      );

      // Optimistically add the new job
      const optimisticJob: ScrapeJob = {
        id: crypto.randomUUID(),
        niche: params.niche,
        location: params.location,
        leadCount: params.leadCount,
        expandedRadius: params.expandedRadius,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ScrapeJob[]>(
        queryKeys.scrapeJobs(userId!),
        (old = []) => [optimisticJob, ...old]
      );

      return { previousJobs };
    },
    onError: (_err, _params, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(queryKeys.scrapeJobs(userId!), context.previousJobs);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scrapeJobs(userId!) });
    },
  });
}

/**
 * Hook that subscribes to realtime updates for scrape jobs.
 * Updates the query cache when jobs change status.
 */
export function useScrapeJobsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = api.subscribeScrapeJobUpdates(userId, (updatedJob) => {
      // Update the specific job in the cache
      queryClient.setQueryData<ScrapeJob[]>(
        queryKeys.scrapeJobs(userId),
        (oldData) => {
          if (!oldData) return [updatedJob];
          return oldData.map((job) =>
            job.id === updatedJob.id ? updatedJob : job
          );
        }
      );

      // If job completed successfully, invalidate leads queries to show new leads
      if (updatedJob.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads(userId) });
      }
    });

    return unsubscribe;
  }, [userId, queryClient]);
}

/**
 * Hook that polls for stale jobs and marks them as timed out.
 * This is a fallback in case the Modal webhook fails to call back.
 */
export function useScrapeJobsTimeoutCheck(
  userId: string | undefined,
  hasActiveJobs: boolean
) {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId || !hasActiveJobs) {
      // Clear interval if no active jobs
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling for stale jobs
    const checkTimeouts = async () => {
      try {
        const timedOutIds = await api.checkAndTimeoutStaleJobs(userId);
        if (timedOutIds.length > 0) {
          // Refresh the jobs list to show updated status
          queryClient.invalidateQueries({ queryKey: queryKeys.scrapeJobs(userId) });
        }
      } catch (error) {
        console.error('Failed to check for stale jobs:', error);
      }
    };

    // Check immediately on mount
    checkTimeouts();

    // Then check every 30 seconds
    intervalRef.current = setInterval(checkTimeouts, TIMEOUT_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, hasActiveJobs, queryClient]);
}

/**
 * Combined hook for scrape jobs - provides query, mutations, and realtime updates.
 */
export function useScrapeJobs(userId: string | undefined) {
  // Track if we have active jobs for polling
  const [hasActiveJobs, setHasActiveJobs] = useState(false);

  const { data = [], isLoading, error, refetch } = useScrapeJobsQuery(userId, hasActiveJobs);
  const createJobMutation = useCreateScrapeJobMutation(userId);

  // Update hasActiveJobs when data changes
  useEffect(() => {
    const active = data.some(
      job => job.status === 'pending' || job.status === 'processing'
    );
    setHasActiveJobs(active);
  }, [data]);

  // Subscribe to realtime updates
  useScrapeJobsRealtime(userId);

  // Poll for stale jobs and mark them as timed out (fallback for failed callbacks)
  useScrapeJobsTimeoutCheck(userId, hasActiveJobs);

  const queryClient = useQueryClient();
  const resetJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!userId) throw new Error('User not authenticated');
      await api.cancelScrapeJob(jobId, userId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scrapeJobs(userId!) });
    }
  });

  return {
    scrapeJobs: data,
    loading: isLoading,
    error: error?.message ?? null,
    createJob: createJobMutation.mutateAsync,
    isCreating: createJobMutation.isPending,
    resetJob: resetJobMutation.mutateAsync,
    refetch,
  };
}
