// Re-export all query hooks for easy importing
export { useLeadsQuery, useLeadMutations, useLeads } from './useLeadsQuery';
export { useActivitiesQuery, useActivityMutations, useActivities } from './useActivitiesQuery';
export { useStrategiesQuery, useStrategyMutations, useStrategies } from './useStrategiesQuery';
export { useGoalsQuery, useGoalsMutations, useGoals } from './useGoalsQuery';
export { useLeadsInfinite, useLeadsInfiniteFlat, usePrefetchLeads } from './useLeadsInfinite';
export { useScrapeJobsQuery, useCreateScrapeJobMutation, useScrapeJobsRealtime, useScrapeJobs } from './useScrapeJobsQuery';

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
