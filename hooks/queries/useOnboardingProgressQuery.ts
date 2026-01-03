import { useAuth } from '../useAuth';
import { useHasEmailConfigured } from './useEmailSettingsQuery';
import { useLeadCountQuery } from './useLeadCountQuery';
import { useStrategiesQuery } from './useStrategiesQuery';
import { useActivitiesQuery } from './useActivitiesQuery';

export interface OnboardingProgress {
  emailConnected: boolean;
  hasLeads: boolean;
  hasStrategy: boolean;
  hasCompletedTask: boolean;
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isLoading: boolean;
  isComplete: boolean;
}

/**
 * Composite hook that aggregates onboarding progress from existing data.
 * No new database tables needed - derives state from existing queries.
 */
export function useOnboardingProgress(): OnboardingProgress {
  const { user } = useAuth();
  const userId = user?.id;

  const { isConfigured: emailConfigured, isLoading: emailLoading } = useHasEmailConfigured();
  const { data: leadCount, isLoading: leadsLoading } = useLeadCountQuery();
  const { data: strategies, isLoading: strategiesLoading } = useStrategiesQuery(userId);
  const { data: activities, isLoading: activitiesLoading } = useActivitiesQuery(userId);

  const steps = {
    emailConnected: !!emailConfigured,
    hasLeads: (leadCount ?? 0) > 0,
    hasStrategy: (strategies?.length ?? 0) > 0,
    hasCompletedTask: (activities?.length ?? 0) > 0,
  };

  const completedCount = Object.values(steps).filter(Boolean).length;

  return {
    ...steps,
    completedCount,
    totalCount: 4,
    percentComplete: Math.round((completedCount / 4) * 100),
    isLoading: emailLoading || leadsLoading || strategiesLoading || activitiesLoading,
    isComplete: completedCount === 4,
  };
}
