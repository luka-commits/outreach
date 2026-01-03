// Re-export all query hooks for easy importing
export { useActivitiesQuery, useActivityMutations, useActivities } from './useActivitiesQuery';
export { useStrategiesQuery, useStrategyMutations, useStrategies } from './useStrategiesQuery';
export { useGoalsQuery, useGoalsMutations, useGoals } from './useGoalsQuery';
export { useScrapeJobsQuery, useCreateScrapeJobMutation, useScrapeJobsRealtime, useScrapeJobs } from './useScrapeJobsQuery';
export { useLeadsPaginatedQuery, usePaginatedLeadMutations, usePrefetchLeadsPage } from './useLeadsPaginated';
export { useLeadCountQuery } from './useLeadCountQuery';

// Call Records
export {
  useCallRecordsByLead,
  useCallMetrics,
  useCreateCallRecord,
  useUpdateCallRecord,
} from './useCallRecordsQuery';

// Twilio Credentials
export {
  useTwilioCredentials,
  useUpdateTwilioCredentials,
  useClearTwilioCredentials,
  useHasTwilioConfigured,
} from './useTwilioCredentialsQuery';

// Email Automation (Gmail + Resend)
export {
  // Gmail
  useGmailCredentials,
  useUpdateGmailCredentials,
  useClearGmailCredentials,
  useHasGmailConfigured,
  // Resend
  useResendCredentials,
  useUpdateResendCredentials,
  useClearResendCredentials,
  useHasResendConfigured,
  // Email Provider
  useEmailProvider,
  useSetEmailProvider,
  useHasEmailConfigured,
} from './useEmailSettingsQuery';

// Lead Tags
export {
  useLeadTagsQuery,
  useLeadTagsForLeadQuery,
  useCreateLeadTag,
  useUpdateLeadTag,
  useDeleteLeadTag,
  useAssignTagToLead,
  useRemoveTagFromLead,
  useBulkAssignTag,
  useBulkRemoveTag,
} from './useLeadTagsQuery';

// Lead Notes
export {
  useLeadNotesQuery,
  useCreateLeadNote,
  useUpdateLeadNote,
  useDeleteLeadNote,
} from './useLeadNotesQuery';

// Strategy Performance Analytics
export { useStrategyPerformance } from './useStrategyPerformanceQuery';

// Saved Filters / Smart Lists
export {
  useSavedFiltersQuery,
  useSavedFilterCounts,
  useCreateSavedFilter,
  useUpdateSavedFilter,
  useDeleteSavedFilter,
  useReorderSavedFilters,
} from './useSavedFiltersQuery';

// Duplicate Detection
export {
  useDuplicatesQuery,
  useDuplicatesSummary,
  useMergeLeads,
} from './useDuplicatesQuery';

// Reporting Analytics
export {
  useStaleLeadsCount,
  useChannelPerformance,
  useWeeklyTrends,
  useAvgDaysOverdue,
} from './useReportingQueries';

// Scrape Usage (for free tier limits)
export { useScrapeUsageQuery } from './useScrapeUsageQuery';

// Networking / Leaderboard
export {
  useUserPublicProfileQuery,
  useUserPublicProfileMutations,
  useUserActivityMetricsQuery,
  useRefreshUserActivityMetrics,
  useLeaderboardQuery,
  useUserRankQuery,
  useNetworking,
} from './useNetworkingQuery';

// Unified Lead Timeline (activities + call records in single RPC)
export { useUnifiedTimeline, type TimelineItem, type TimelineItemType } from './useUnifiedTimeline';

// Custom Fields
export {
  useCustomFieldDefinitionsQuery,
  useCustomFieldValuesQuery,
  useCreateCustomFieldDefinition,
  useUpdateCustomFieldDefinition,
  useDeleteCustomFieldDefinition,
  useReorderCustomFieldDefinitions,
  useSetCustomFieldValue,
  useSetCustomFieldValues,
  useDeleteCustomFieldValue,
  useCustomFieldHasValues,
} from './useCustomFieldsQuery';

// Onboarding Progress
export { useOnboardingProgress, type OnboardingProgress } from './useOnboardingProgressQuery';
