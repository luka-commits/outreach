import React, { useState, useEffect } from 'react';
import { User, Eye, EyeOff, Edit2, Check, X } from 'lucide-react';
import { UserPublicProfile, UserActivityMetrics } from '../../types';

interface ProfileCardProps {
  profile: UserPublicProfile | null;
  metrics: UserActivityMetrics | null;
  onUpdate: (updates: Partial<UserPublicProfile>) => Promise<void>;
  isUpdating: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  metrics,
  onUpdate,
  isUpdating,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');

  // Sync local state when profile changes
  useEffect(() => {
    setDisplayName(profile?.displayName || '');
    setBio(profile?.bio || '');
  }, [profile?.displayName, profile?.bio]);

  const handleSave = async () => {
    await onUpdate({ displayName: displayName.trim(), bio: bio.trim() });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDisplayName(profile?.displayName || '');
    setBio(profile?.bio || '');
    setIsEditing(false);
  };

  const handleToggleVisibility = async () => {
    await onUpdate({ isVisible: !profile?.isVisible });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900">Your Profile</h3>
        <button
          onClick={handleToggleVisibility}
          disabled={isUpdating}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            profile?.isVisible
              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {profile?.isVisible ? (
            <>
              <Eye size={16} />
              Visible
            </>
          ) : (
            <>
              <EyeOff size={16} />
              Hidden
            </>
          )}
        </button>
      </div>

      {/* Avatar & Info */}
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName || 'Profile'}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <User size={32} className="text-white" />
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium"
                maxLength={50}
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short bio (optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm resize-none"
                rows={2}
                maxLength={500}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Check size={14} />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-base font-bold text-slate-900 truncate">
                  {profile?.displayName || 'Anonymous User'}
                </h4>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Edit profile"
                >
                  <Edit2 size={14} />
                </button>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">
                {profile?.bio || 'No bio yet. Click edit to add one.'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Activity Stats */}
      {metrics && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Your Activity
          </p>
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="This Week" value={metrics.weeklyActivityCount} />
            <StatBox label="This Month" value={metrics.monthlyActivityCount} />
            <StatBox label="All Time" value={metrics.totalActivityCount} />
          </div>
        </div>
      )}

      {/* Privacy Note */}
      {!profile?.isVisible && (
        <div className="mt-5 p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-sm text-amber-700">
            <strong>Your profile is hidden.</strong> Turn on visibility to appear on the leaderboard.
          </p>
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="text-center p-3 rounded-lg bg-slate-50">
    <p className="text-xl font-bold text-slate-900">{value.toLocaleString()}</p>
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
      {label}
    </p>
  </div>
);

export default ProfileCard;
