import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { radius, shadows } from '../../lib/designTokens';

interface ConnectedInfo {
  label: string;
  value: string;
}

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconTextColor: string;
  status: 'connected' | 'not_connected' | 'loading';
  connectedInfo?: ConnectedInfo[];
  onSetup?: () => void;
  setupButtonText?: string;
  onReconfigure?: () => void;
  onDisconnect?: () => void;
  isDisconnecting?: boolean;
  children?: React.ReactNode;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  title,
  description,
  icon,
  iconBgColor,
  iconTextColor,
  status,
  connectedInfo = [],
  onSetup,
  setupButtonText = 'Set Up',
  onReconfigure,
  onDisconnect,
  isDisconnecting = false,
  children,
}) => {
  return (
    <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-12 h-12 ${iconBgColor} ${radius.md} flex items-center justify-center ${iconTextColor}`}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm">{description}</p>
        </div>
      </div>

      {/* Content */}
      {status === 'loading' ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </div>
      ) : status === 'connected' ? (
        <div className="space-y-4">
          {/* Connected status box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <span className="font-medium text-emerald-800">Connected</span>
            </div>
            {connectedInfo.length > 0 && (
              <div className="space-y-1 text-sm text-emerald-700">
                {connectedInfo.map((info, index) => (
                  <p key={index}>
                    <strong>{info.label}:</strong> {info.value}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {onReconfigure && (
              <Button
                variant="secondary"
                size="md"
                onClick={onReconfigure}
                fullWidth
              >
                Reconfigure
              </Button>
            )}
            {onDisconnect && (
              <Button
                variant="ghost"
                size="md"
                onClick={onDisconnect}
                loading={isDisconnecting}
                className="text-red-600 hover:bg-red-50"
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Setup content or children */}
          {children ? (
            children
          ) : (
            <div className="bg-slate-50 rounded-lg p-4">
              <Button
                variant="primary"
                size="lg"
                onClick={onSetup}
                fullWidth
              >
                {setupButtonText}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationCard;
