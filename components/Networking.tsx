import React, { useState, useCallback } from 'react';
import { Users, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import ProfileCard from './networking/ProfileCard';
import Leaderboard from './networking/Leaderboard';
import {
  useNetworking,
  useUserPublicProfileMutations,
  useRefreshUserActivityMetrics,
} from '../hooks/queries';
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
          />
        </div>
      </div>
    </div>
  );
};

export default Networking;
