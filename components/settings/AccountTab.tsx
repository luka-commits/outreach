import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ExternalLink, Camera, Check, X, Pencil, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { radius, shadows } from '../../lib/designTokens';
import { useAuth } from '../../hooks/useAuth';
import { useSubscription } from '../../hooks/useSubscription';
import { useUserPublicProfileQuery, useUserPublicProfileMutations, useResetUserActivityMetrics } from '../../hooks/queries/useNetworkingQuery';
import { supabase } from '../../services/supabase';
import { useToast } from '../Toast';
import ConfirmModal from '../ConfirmModal';

interface AccountTabProps {
  onOpenPricing: () => void;
}

const STRIPE_PORTAL_LINK = 'https://billing.stripe.com/p/login/cNi8wP59W3790FT1iidwc00';

const AccountTab: React.FC<AccountTabProps> = ({ onOpenPricing }) => {
  const { user, signOut } = useAuth();
  const { subscription, isPro, isTrial, trialDaysLeft, trialEndsAt } = useSubscription();
  const { showToast } = useToast();

  // Profile data
  const { data: publicProfile, isLoading: profileLoading } = useUserPublicProfileQuery(user?.id);
  const { updateProfile } = useUserPublicProfileMutations(
    user?.id,
    (message) => showToast(message, 'error'),
    () => showToast('Profile updated!', 'success')
  );

  // Reset activity metrics mutation
  const resetMetrics = useResetUserActivityMetrics(
    user?.id,
    () => showToast('Activity data reset successfully!', 'success'),
    (message) => showToast(message, 'error')
  );

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync form state with profile data
  useEffect(() => {
    if (publicProfile) {
      setDisplayName(publicProfile.displayName || '');
      setBio(publicProfile.bio || '');
      setAvatarUrl(publicProfile.avatarUrl || '');
    }
  }, [publicProfile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);

      // Save immediately
      await updateProfile.mutateAsync({ avatarUrl: publicUrl });
    } catch (error) {
      console.error('Avatar upload error:', error);
      showToast('Failed to upload avatar', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      setIsEditing(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleCancelEdit = () => {
    // Reset to saved values
    if (publicProfile) {
      setDisplayName(publicProfile.displayName || '');
      setBio(publicProfile.bio || '');
      setAvatarUrl(publicProfile.avatarUrl || '');
    }
    setIsEditing(false);
  };

  const displayedName = displayName || user?.email?.split('@')[0] || 'User';
  const avatarInitial = displayedName.charAt(0).toUpperCase();

  const handleManageBilling = () => {
    window.open(STRIPE_PORTAL_LINK, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Profile
          </h3>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-sm text-pilot-blue hover:text-pilot-blue/80 font-medium transition-colors"
            >
              <Pencil size={14} />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelEdit}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Cancel"
              >
                <X size={18} />
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={updateProfile.isPending}
                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                title="Save"
              >
                <Check size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayedName}
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-100"
              />
            ) : (
              <div className="w-20 h-20 bg-pilot-blue/10 rounded-full flex items-center justify-center text-pilot-blue font-bold text-2xl border-2 border-pilot-blue/20">
                {avatarInitial}
              </div>
            )}

            {/* Avatar upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 p-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Change avatar"
            >
              <Camera size={14} className={uploadingAvatar ? 'animate-pulse' : ''} />
            </button>
          </div>

          {/* Profile info */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pilot-blue/20 focus:border-pilot-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell others about yourself..."
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pilot-blue/20 focus:border-pilot-blue transition-colors resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">{bio.length}/500 characters</p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-slate-900 truncate">
                  {displayedName}
                </h2>
                <p className="text-slate-500 text-sm truncate">{user?.email}</p>
                {bio && (
                  <p className="text-slate-600 text-sm mt-2 line-clamp-2">{bio}</p>
                )}
                {!bio && !profileLoading && (
                  <p className="text-slate-400 text-sm mt-2 italic">No bio added yet</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-slate-400 text-xs">
            Account ID: {user?.id.slice(0, 8)}...
          </p>
        </div>
      </div>

      {/* Subscription Section */}
      <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Subscription
        </h3>

        <div className="bg-slate-50 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <p className="font-bold text-lg text-slate-900">
                {isPro ? 'Pro Pilot Plan' : 'Starter Plan'}
              </p>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                  isTrial
                    ? 'bg-amber-100 text-amber-700'
                    : isPro
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isTrial ? 'Trial' : subscription?.status}
              </span>
            </div>
            <p className="text-slate-500 text-sm">
              {isTrial
                ? `Trial ends ${trialEndsAt?.toLocaleDateString()} (${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left)`
                : isPro
                ? 'Full access to all features'
                : 'Upgrade to remove limits'}
            </p>
          </div>

          {isPro ? (
            <Button
              variant="outline"
              size="md"
              icon={<ExternalLink size={16} />}
              iconPosition="right"
              onClick={handleManageBilling}
            >
              {isTrial ? 'Upgrade Now' : 'Manage Billing'}
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={onOpenPricing}>
              Upgrade Now
            </Button>
          )}
        </div>
      </div>

      {/* Sign Out Section */}
      <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
        <button
          onClick={() => signOut()}
          className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      {/* Danger Zone Section */}
      <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-red-200`}>
        <h3 className="text-sm font-medium text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertTriangle size={16} />
          Danger Zone
        </h3>

        <div className="bg-red-50/50 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="font-semibold text-slate-900">Reset All Activity Data</p>
              <p className="text-slate-500 text-sm">
                Permanently delete all your outreach history and reset statistics to zero.
              </p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetMetrics.isPending}
              className="px-4 py-2 bg-white border border-red-300 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {resetMetrics.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Data'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => resetMetrics.mutate()}
        title="Reset Activity Data?"
        message="This will permanently delete all your outreach activities and reset your statistics to zero. This action cannot be undone."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default AccountTab;
