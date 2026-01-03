import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import SettingsTabs, { type SettingsTab } from './settings/SettingsTabs';
import SetupPromptBanner from './settings/SetupPromptBanner';
import AccountTab from './settings/AccountTab';
import CallingTab from './settings/CallingTab';
import EmailTab from './settings/EmailTab';
import LeadFinderTab from './settings/LeadFinderTab';
import CustomFieldsTab from './settings/CustomFieldsTab';
import TwilioSetupWizard from './TwilioSetupWizard';
import { useHasTwilioConfigured } from '../hooks/queries/useTwilioCredentialsQuery';
import { useHasGmailConfigured, useHasResendConfigured } from '../hooks/queries/useEmailSettingsQuery';

interface SettingsViewProps {
  onClose: () => void;
  onOpenPricing: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onClose, onOpenPricing }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [showTwilioWizard, setShowTwilioWizard] = useState(false);

  // Check what's connected for tab badges and banner
  const { isConfigured: twilioConfigured } = useHasTwilioConfigured();
  const { isConfigured: gmailConfigured } = useHasGmailConfigured();
  const { isConfigured: resendConfigured } = useHasResendConfigured();

  const hasEmail = gmailConfigured || resendConfigured;
  const hasCalling = twilioConfigured;

  // Build list of connected tabs for badges
  const connectedTabs: SettingsTab[] = [];
  if (hasCalling) connectedTabs.push('calling');
  if (hasEmail) connectedTabs.push('email');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountTab onOpenPricing={onOpenPricing} />;
      case 'calling':
        return <CallingTab onOpenWizard={() => setShowTwilioWizard(true)} />;
      case 'email':
        return <EmailTab />;
      case 'lead-finder':
        return <LeadFinderTab />;
      case 'custom-fields':
        return <CustomFieldsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-soft-slate animate-in slide-in-from-bottom-8 duration-150">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-semibold tracking-tight text-navy">Settings</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-6">
          <SettingsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            connectedTabs={connectedTabs}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Setup banner for new users */}
        <SetupPromptBanner
          hasEmail={hasEmail}
          hasCalling={hasCalling}
          onNavigateToTab={setActiveTab}
        />

        {/* Tab content */}
        {renderTabContent()}
      </div>

      {/* Twilio Setup Wizard Modal */}
      {showTwilioWizard && (
        <TwilioSetupWizard
          onClose={() => setShowTwilioWizard(false)}
          onComplete={() => setShowTwilioWizard(false)}
        />
      )}
    </div>
  );
};

export default SettingsView;
