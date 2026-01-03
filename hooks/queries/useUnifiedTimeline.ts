import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { queryKeys } from '../../lib/queryClient';
import * as api from '../../services/supabase';
import { Activity, CallRecord } from '../../types';

// Unified timeline item type that can represent activities or calls
export type TimelineItemType = 'activity' | 'call' | 'system';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  timestamp: string;
  // Activity fields
  action?: string;
  platform?: Activity['platform'];
  note?: string;
  isFirstOutreach?: boolean;
  direction?: Activity['direction'];
  // Call fields
  outcome?: CallRecord['outcome'];
  status?: CallRecord['status'];
  durationSeconds?: number;
  recordingUrl?: string;
  transcription?: string;
  aiSummary?: string;
  callNotes?: string;
}

/**
 * Converts an Activity to a TimelineItem
 */
function activityToTimelineItem(activity: Activity): TimelineItem {
  return {
    id: `activity-${activity.id}`,
    type: 'activity',
    timestamp: activity.timestamp,
    action: activity.action,
    platform: activity.platform,
    note: activity.note,
    isFirstOutreach: activity.isFirstOutreach,
    direction: activity.direction,
  };
}

/**
 * Converts a CallRecord to a TimelineItem
 */
function callRecordToTimelineItem(record: CallRecord): TimelineItem {
  return {
    id: `call-${record.id}`,
    type: 'call',
    timestamp: record.startedAt,
    platform: 'call',
    outcome: record.outcome,
    status: record.status,
    durationSeconds: record.durationSeconds,
    recordingUrl: record.recordingUrl,
    transcription: record.transcription,
    aiSummary: record.aiSummary,
    callNotes: record.notes,
  };
}

/**
 * Hook that fetches activities + call records in a single RPC call
 * and merges them into a unified timeline.
 * Results are sorted by timestamp descending (most recent first).
 *
 * Uses get_lead_timeline RPC to reduce 2 queries to 1.
 */
export function useUnifiedTimeline(leadId: string | undefined) {
  const { user } = useAuth();

  // Fetch unified timeline via single RPC call
  const timelineQuery = useQuery({
    queryKey: queryKeys.leadTimeline(user?.id, leadId!),
    queryFn: () => api.getLeadTimeline(user!.id, leadId!),
    enabled: !!user?.id && !!leadId,
  });

  // Merge and sort the data - memoized to prevent re-sorting on every render
  const timelineItems = useMemo(() => {
    if (!timelineQuery.data) return [];

    const items: TimelineItem[] = [];

    // Activities are already filtered by RPC (platform != 'call')
    items.push(...timelineQuery.data.activities.map(activityToTimelineItem));

    // Call records are already filtered by RPC (completed or with outcome)
    items.push(...timelineQuery.data.callRecords.map(callRecordToTimelineItem));

    // Sort by timestamp descending
    items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return items;
  }, [timelineQuery.data]);

  return {
    data: timelineItems,
    isLoading: timelineQuery.isLoading,
    isError: timelineQuery.isError,
    error: timelineQuery.error,
    refetch: timelineQuery.refetch,
  };
}
