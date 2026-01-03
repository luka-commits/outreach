import React from 'react';
import { Trophy, Medal, Award, User, TrendingUp, Loader2 } from 'lucide-react';
import { LeaderboardEntry, LeaderboardPeriod, UserRankInfo } from '../../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  userRank: UserRankInfo | undefined;
  period: LeaderboardPeriod;
  onPeriodChange: (period: LeaderboardPeriod) => void;
  isLoading: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  entries,
  userRank,
  period,
  onPeriodChange,
  isLoading,
}) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={18} className="text-amber-500" />;
      case 2:
        return <Medal size={18} className="text-slate-400" />;
      case 3:
        return <Award size={18} className="text-amber-700" />;
      default:
        return null;
    }
  };

  const getRankBadgeClass = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white';
      case 2:
        return 'bg-gradient-to-br from-slate-300 to-slate-400 text-white';
      case 3:
        return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-lg text-amber-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Leaderboard</h3>
              <p className="text-xs font-medium text-slate-400">
                {userRank?.totalParticipants || 0} Active Members
              </p>
            </div>
          </div>

          {/* Period Toggle */}
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['weekly', 'monthly', 'all_time'] as LeaderboardPeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === p
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Current User Rank Card */}
        {userRank && userRank.totalParticipants > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                  Your Rank
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  #{userRank.rank}
                  <span className="text-sm font-medium text-slate-400 ml-2">
                    of {userRank.totalParticipants}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Activities
                </p>
                <p className="text-xl font-bold text-blue-600">
                  {userRank.activityCount}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={28} className="text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-slate-400 font-medium">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <User size={28} className="text-slate-400" />
            </div>
            <h4 className="font-bold text-slate-900 mb-1">No visible users yet</h4>
            <p className="text-sm text-slate-500">
              Be the first to make your profile visible!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.userId}
                entry={entry}
                rankIcon={getRankIcon(entry.rank)}
                rankBadgeClass={getRankBadgeClass(entry.rank)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rankIcon: React.ReactNode | null;
  rankBadgeClass: string;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  entry,
  rankIcon,
  rankBadgeClass,
}) => (
  <div
    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
      entry.isCurrentUser
        ? 'bg-blue-50 border border-blue-100'
        : 'hover:bg-slate-50'
    }`}
  >
    {/* Rank */}
    <div
      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${rankBadgeClass}`}
    >
      {rankIcon || entry.rank}
    </div>

    {/* Avatar */}
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
      {entry.avatarUrl ? (
        <img
          src={entry.avatarUrl}
          alt={entry.displayName || 'User'}
          className="w-full h-full rounded-lg object-cover"
        />
      ) : (
        <User size={20} className="text-slate-400" />
      )}
    </div>

    {/* Name & Bio */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-slate-900 truncate text-sm">
          {entry.displayName || 'Anonymous'}
        </p>
        {entry.isCurrentUser && (
          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
            YOU
          </span>
        )}
      </div>
      {entry.bio && (
        <p className="text-xs text-slate-500 truncate">{entry.bio}</p>
      )}
    </div>

    {/* Activity Count */}
    <div className="text-right flex-shrink-0">
      <p className="text-base font-bold text-slate-900">{entry.activityCount}</p>
      <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
        Activities
      </p>
    </div>
  </div>
);

export default Leaderboard;
