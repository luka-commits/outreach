import React, { useState, useEffect } from 'react';
import { X, Mail, Phone } from 'lucide-react';
import { Button } from '../ui/Button';
import { radius, shadows } from '../../lib/designTokens';
import type { SettingsTab } from './SettingsTabs';

const STORAGE_KEY = 'outreach-settings-banner-dismissed';

interface SetupPromptBannerProps {
  hasEmail: boolean;
  hasCalling: boolean;
  onNavigateToTab: (tab: SettingsTab) => void;
}

const SetupPromptBanner: React.FC<SetupPromptBannerProps> = ({
  hasEmail,
  hasCalling,
  onNavigateToTab,
}) => {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDismissed(true);
  };

  // Don't show if already set up or dismissed
  if (isDismissed || (hasEmail && hasCalling)) {
    return null;
  }

  // Determine what to show
  const showEmailPrompt = !hasEmail;
  const showCallingPrompt = !hasCalling;

  return (
    <div
      className={`bg-blue-50 border border-blue-200 ${radius.md} p-4 mb-6 ${shadows.sm}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 mb-1">
            Complete your setup
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Set up email or calling to start reaching out to leads.
          </p>

          <div className="flex flex-wrap gap-2">
            {showEmailPrompt && (
              <Button
                variant="primary"
                size="sm"
                icon={<Mail size={16} />}
                onClick={() => onNavigateToTab('email')}
              >
                Connect Email
              </Button>
            )}
            {showCallingPrompt && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Phone size={16} />}
                onClick={() => onNavigateToTab('calling')}
              >
                Set Up Calling
              </Button>
            )}
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default SetupPromptBanner;
