import React, { useState, useCallback, useMemo } from 'react';
import { Users, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ProfileCard from './networking/ProfileCard';
import Leaderboard from './networking/Leaderboard';
import {
  useNetworking,
  useUserPublicProfileMutations,
  useRefreshUserActivityMetrics,
  useGoalsQuery,
} from '../hooks/queries';
import { useActivitiesPaginatedQuery } from '../hooks/queries/useActivitiesQuery';
import { LeaderboardPeriod, UserPublicProfile } from '../types';
import { useToast } from './Toast';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errorMessages';

const Networking: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');

  const {
    profile,
    profileLoading,
    profileError,
    metrics,
    metricsLoading,
    leaderboard,
    leaderboardLoading,
    leaderboardError,
    userRank,
    refetchLeaderboard,
    refetchProfile,
  } = useNetworking(user?.id, period);

  // Fetch goals for chart calculation
  const { data: goals } = useGoalsQuery(user?.id);

  // Fetch last 7 days of activities for chart
  const chartStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Last 7 days including today
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: chartActivities = [] } = useActivitiesPaginatedQuery(user?.id, {
    startDate: chartStartDate,
    limit: 5000,
  });

  // Calculate chart data (same logic as Dashboard.tsx)
  const chartData = useMemo(() => {
    if (!goals) return [];

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isoDateParts = d.toISOString().split('T');
      const dateKey = isoDateParts[0] ?? '';

      const dayActivities = chartActivities.filter((a) =>
        a.timestamp.startsWith(dateKey)
      ).length;

      // Calculate total daily goal sum
      const totalDailyGoal = Object.values(goals).reduce(
        (acc, val) => acc + (val as number),
        0
      );

      const percentage =
        totalDailyGoal > 0
          ? Math.min(100, Math.round((dayActivities / totalDailyGoal) * 100))
          : 0;

      days.push({ name: dayName, score: percentage });
    }
    return days;
  }, [chartActivities, goals]);

  // Channel breakdown for current user in leaderboard
  const currentUserChannelBreakdown = useMemo(() => {
    if (!metrics) return undefined;
    return {
      emails: metrics.weeklyEmailsSent,
      calls: metrics.weeklyCallsMade,
      dms: metrics.weeklyDmsSent,
    };
  }, [metrics]);

  const { updateProfile } = useUserPublicProfileMutations(
    user?.id,
    (message) => showToast(message, 'error'),
    () => showToast('Profile updated!', 'success')
  );

  const refreshMetrics = useRefreshUserActivityMetrics(
    user?.id,
    () => showToast('Activity stats refreshed!', 'success'),
    (message) => showToast(message, 'error')
  );

  const handleUpdateProfile = useCallback(
    async (updates: Partial<UserPublicProfile>) => {
      await updateProfile.mutateAsync(updates);
      // Refresh metrics when visibility is turned on for the first time
      if (updates.isVisible && !profile?.isVisible) {
        refreshMetrics.mutate();
      }
    },
    [updateProfile, profile?.isVisible, refreshMetrics]
  );

  const isInitialLoading = profileLoading && metricsLoading && leaderboardLoading;
  const hasError = profileError || leaderboardError;

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={36} className="text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Loading networking...</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-14 h-14 rounded-xl bg-rose-50 flex items-center justify-center mb-5">
          <AlertCircle size={28} className="text-rose-500" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">Failed to load data</h3>
        <p className="text-slate-500 max-w-sm mb-5 text-center text-sm">
          {getErrorMessage(profileError || leaderboardError)}
        </p>
        <button
          onClick={() => {
            refetchProfile();
            refetchLeaderboard();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="text-slate-400" size={24} />
            Networking
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Connect with other sales professionals
          </p>
        </div>
        <button
          onClick={() => refreshMetrics.mutate()}
          disabled={refreshMetrics.isPending}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshMetrics.isPending ? 'animate-spin' : ''}
          />
          Refresh Stats
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          <ProfileCard
            profile={profile ?? null}
            metrics={metrics ?? null}
            chartData={chartData}
            onUpdate={handleUpdateProfile}
            isUpdating={updateProfile.isPending}
          />
        </div>

        {/* Leaderboard (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <Leaderboard
            entries={leaderboard}
            userRank={userRank}
            period={period}
            onPeriodChange={setPeriod}
            isLoading={leaderboardLoading}
            currentUserChannelBreakdown={currentUserChannelBreakdown}
          />
        </div>
      </div>
    </div>
  );
};

export default Networking;
