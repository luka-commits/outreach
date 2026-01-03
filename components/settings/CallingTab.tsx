import React from 'react';
import { Phone } from 'lucide-react';
import IntegrationCard from './IntegrationCard';
import { Button } from '../ui/Button';
import {
  useHasTwilioConfigured,
  useClearTwilioCredentials,
} from '../../hooks/queries/useTwilioCredentialsQuery';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

interface CallingTabProps {
  onOpenWizard: () => void;
}

const CallingTab: React.FC<CallingTabProps> = ({ onOpenWizard }) => {
  const {
    isConfigured: twilioConfigured,
    isLoading: twilioLoading,
    credentials: twilioCredentials,
  } = useHasTwilioConfigured();
  const clearTwilioCredentials = useClearTwilioCredentials();
  const { showToast } = useToast();

  const handleDisconnect = () => {
    clearTwilioCredentials.mutate(undefined, {
      onSuccess: () => showToast('Twilio disconnected', 'success'),
      onError: (error) => showToast(getErrorMessage(error), 'error'),
    });
  };

  const status = twilioLoading
    ? 'loading'
    : twilioConfigured
    ? 'connected'
    : 'not_connected';

  const connectedInfo = twilioCredentials
    ? [
        { label: 'Phone Number', value: twilioCredentials.phoneNumber },
        { label: 'Account', value: `${twilioCredentials.accountSid.slice(0, 10)}...` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <IntegrationCard
        title="Cold Calling"
        description="Make calls directly from your browser"
        icon={<Phone size={24} />}
        iconBgColor="bg-emerald-100"
        iconTextColor="text-emerald-600"
        status={status}
        connectedInfo={connectedInfo}
        onReconfigure={onOpenWizard}
        onDisconnect={handleDisconnect}
        isDisconnecting={clearTwilioCredentials.isPending}
      >
        {/* Setup content when not connected */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <p className="text-sm text-slate-600">
            Connect your Twilio account to make calls directly from Outbound Pilot.
            Calls cost around $0.014/min and are billed to your Twilio account.
          </p>

          <Button
            variant="success"
            size="lg"
            icon={<Phone size={18} />}
            onClick={onOpenWizard}
            fullWidth
          >
            Set Up Calling
          </Button>

          <p className="text-xs text-slate-500 text-center">
            Takes about 5 minutes to set up
          </p>
        </div>
      </IntegrationCard>

      {/* Tips section */}
      {!twilioConfigured && !twilioLoading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h4 className="font-medium text-emerald-800 mb-2">
            What you'll need:
          </h4>
          <ul className="text-sm text-emerald-700 space-y-1 list-disc list-inside">
            <li>A Twilio account (free to create)</li>
            <li>A phone number from Twilio (~$1/month)</li>
            <li>About 5 minutes to complete setup</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CallingTab;
