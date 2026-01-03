import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Trash2, MessageCircle, ChevronDown, Check } from 'lucide-react';
import { Lead, Strategy, Activity, LeadStatus, TaskAction } from '../../types';

const STATUS_OPTIONS: { status: LeadStatus; label: string; color: string }[] = [
  { status: 'not_contacted', label: 'Not Contacted', color: 'bg-gray-100 text-gray-600' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-amber-50 text-amber-700' },
  { status: 'replied', label: 'Replied', color: 'bg-pilot-blue/10 text-pilot-blue' },
  { status: 'qualified', label: 'Qualified', color: 'bg-pilot-blue/10 text-pilot-blue' },
  { status: 'disqualified', label: 'Disqualified', color: 'bg-rose-50 text-rose-600' },
];
import ConfirmModal from '../ConfirmModal';
import LeadInfoColumn from './LeadInfoColumn';
import StrategySection from './StrategySection';
import ActivityFeed, { actionToChannel, ComposerChannel } from './ActivityFeed';
import LogReplyModal from '../LogReplyModal';
import RescheduleModal from '../RescheduleModal';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { useAuth } from '../../hooks/useAuth';
import { useLeadQuery } from '../../hooks/queries/useLeadQuery';
import { useToast } from '../Toast';
// Note: Full calling functionality with call records is in TaskQueue/CallProcessingPanel
// Here we just check if Twilio is configured and direct users there
import { useTwilioDevice } from '../../hooks/useTwilioDevice';

interface LeadDetailProps {
  leadId: string;
  strategies: Strategy[];
  onBack: () => void;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onAddActivity: (
    leadId: string,
    action: string,
    note?: string,
    isFirstOutreach?: boolean,
    platform?: Activity['platform'],
    direction?: Activity['direction']
  ) => void;
}

const LeadDetail: React.FC<LeadDetailProps> = ({
  leadId,
  strategies,
  onBack,
  onUpdate,
  onDelete,
  onAddActivity,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { deviceStatus } = useTwilioDevice();
  const twilioReady = deviceStatus === 'ready';
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [composerChannel, setComposerChannel] = useState<ComposerChannel>('note');
  const activityFeedRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Data
  const {
    data: lead,
    isLoading: leadLoading,
    isError: leadError,
    error: leadQueryError,
    refetch: refetchLead,
  } = useLeadQuery(leadId, user?.id);

  const activeStrategy = lead?.strategyId
    ? strategies.find((s) => s.id === lead.strategyId) ?? null
    : null;
  const currentStep = activeStrategy && lead ? activeStrategy.steps[lead.currentStepIndex] ?? null : null;

  // Handlers
  const handleStatusChange = useCallback(
    async (newStatus: LeadStatus) => {
      if (!lead) return;
      const isTerminal = newStatus === 'qualified' || newStatus === 'disqualified' || newStatus === 'replied';
      await onUpdate({
        ...lead,
        status: newStatus,
        nextTaskDate: isTerminal ? undefined : lead.nextTaskDate,
      });
      await onAddActivity(lead.id, `Lead status changed to: ${newStatus.replace('_', ' ')}`);
      setShowStatusDropdown(false);
    },
    [lead, onUpdate, onAddActivity]
  );

  const handleSelectStrategy = useCallback(
    async (strategy: Strategy) => {
      if (!lead) return;
      // Calculate nextTaskDate from first step's dayOffset
      const firstStep = strategy.steps[0];
      const nextTaskDate = new Date();
      if (firstStep) {
        nextTaskDate.setDate(nextTaskDate.getDate() + firstStep.dayOffset);
      }
      const updatedLead: Lead = {
        ...lead,
        strategyId: strategy.id,
        currentStepIndex: 0,
        status: 'in_progress',
        nextTaskDate: nextTaskDate.toISOString(),
      };
      await onUpdate(updatedLead);
      await onAddActivity(lead.id, `Strategy selected: ${strategy.name}`);
    },
    [lead, onUpdate, onAddActivity]
  );

  const handleCompleteCurrentStep = useCallback(() => {
    if (!lead || !activeStrategy || !currentStep) return;

    const nextStepIndex = lead.currentStepIndex + 1;
    const isLastStep = nextStepIndex >= activeStrategy.steps.length;

    let nextTaskDate: string | undefined = undefined;
    if (!isLastStep) {
      const nextStep = activeStrategy.steps[nextStepIndex];
      if (nextStep) {
        const date = new Date();
        date.setDate(date.getDate() + (nextStep.dayOffset - currentStep.dayOffset));
        nextTaskDate = date.toISOString();
      }
    }

    const updatedLead: Lead = {
      ...lead,
      currentStepIndex: nextStepIndex,
      nextTaskDate: nextTaskDate,
      status: isLastStep ? 'replied' : 'in_progress',
    };

    onUpdate(updatedLead);
    onAddActivity(lead.id, `Step completed: ${currentStep.action}`, `Marked as done from detail view.`);
    showToast('Step completed! Moving to next step.', 'success');
  }, [lead, activeStrategy, currentStep, onUpdate, onAddActivity, showToast]);

  const handleSwitchStrategy = useCallback(() => {
    if (!lead) return;
    onUpdate({
      ...lead,
      strategyId: undefined,
      currentStepIndex: 0,
      status: 'not_contacted',
    });
  }, [lead, onUpdate]);

  const handleExecuteAction = useCallback((action: TaskAction) => {
    const channel = actionToChannel(action);

    // Handle Call action - direct to Task Queue for full call processing
    if (action === 'call') {
      if (!lead?.phone) {
        showToast('No phone number available for this lead', 'error');
        return;
      }
      if (!twilioReady) {
        showToast('Twilio not configured. Set up calling in Settings.', 'info');
        return;
      }
      // Show info to use Tasks view for full call processing with call records
      showToast('Use the Tasks view to make calls with full processing.', 'info');
      // Still scroll to activity feed to log the call outcome manually
      setComposerChannel('call');
      activityFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    // Handle Email action - scroll to activity feed with email channel selected
    if (action === 'send_email') {
      setComposerChannel('email');
      activityFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    // For other actions, set the channel and scroll to composer
    setComposerChannel(channel);
    activityFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lead, twilioReady, showToast]);

  const handleComposerSubmit = useCallback(
    (
      note: string,
      platform: Activity['platform'] | undefined,
      scheduleFollowUp?: { hours: number | null; customDate?: string; note?: string }
    ) => {
      if (!lead) return;

      const actionLabel = platform
        ? `${platform.charAt(0).toUpperCase() + platform.slice(1)} Log`
        : 'Manual Note';
      onAddActivity(lead.id, actionLabel, note, false, platform);

      // Auto-advance strategy if activity matches current step
      if (activeStrategy && currentStep && platform) {
        const expectedChannel = actionToChannel(currentStep.action);
        if (platform === expectedChannel || (expectedChannel === 'instagram' && platform === 'instagram')) {
          handleCompleteCurrentStep();
        }
      }

      // Handle follow-up scheduling
      if (scheduleFollowUp) {
        let nextDate: Date;
        if (scheduleFollowUp.customDate) {
          nextDate = new Date(scheduleFollowUp.customDate);
        } else if (scheduleFollowUp.hours !== null) {
          nextDate = new Date();
          nextDate.setHours(nextDate.getHours() + scheduleFollowUp.hours);
        } else {
          return;
        }

        onUpdate({
          ...lead,
          nextTaskDate: nextDate.toISOString(),
          nextTaskNote: scheduleFollowUp.note,
          status: 'in_progress',
        });
        showToast(`Follow-up scheduled for ${nextDate.toLocaleString()}`, 'success');
      }
    },
    [lead, activeStrategy, currentStep, onAddActivity, onUpdate, handleCompleteCurrentStep, showToast]
  );

  const handleLogReply = useCallback(
    (data: { platform: Activity['platform']; note: string; updateStatus: boolean }) => {
      if (!lead || !data.platform) return;
      const platformLabel = data.platform.charAt(0).toUpperCase() + data.platform.slice(1);
      const actionLabel = `Reply via ${platformLabel}`;
      onAddActivity(lead.id, actionLabel, data.note || undefined, false, data.platform, 'inbound');

      if (data.updateStatus && lead.status !== 'replied' && lead.status !== 'qualified') {
        onUpdate({ ...lead, status: 'replied' });
      }
    },
    [lead, onAddActivity, onUpdate]
  );

  const handleReschedule = useCallback(
    (hours: number | null, customDate?: string, note?: string) => {
      if (!lead) return;
      let nextDate: Date;
      if (customDate) {
        nextDate = new Date(customDate);
      } else if (hours !== null) {
        nextDate = new Date();
        nextDate.setHours(nextDate.getHours() + hours);
      } else {
        return;
      }

      onUpdate({
        ...lead,
        nextTaskDate: nextDate.toISOString(),
        nextTaskNote: note,
        status: 'in_progress',
      });
      onAddActivity(lead.id, `Task rescheduled to ${nextDate.toLocaleString()}`, note);
      setShowRescheduleModal(false);
    },
    [lead, onUpdate, onAddActivity]
  );

  const handleInitiateCall = useCallback(() => {
    if (!lead?.phone) {
      showToast('No phone number available for this lead', 'error');
      return;
    }
    if (!twilioReady) {
      showToast('Twilio not configured. Set up calling in Settings.', 'info');
      return;
    }
    // Direct to Task Queue for full call processing with call records
    showToast('Use the Tasks view to make calls with full processing.', 'info');
    // Scroll to activity feed to log call notes manually
    setComposerChannel('call');
    activityFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lead, twilioReady, showToast]);

  const handleOpenEmailComposer = useCallback(() => {
    setComposerChannel('email');
    activityFeedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  // Loading State
  if (leadLoading) {
    return <LoadingSpinner fullScreen={false} message="Loading lead details..." />;
  }

  // Error State
  if (leadError || !lead) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <ErrorState
          title="Failed to load lead"
          error={leadQueryError}
          onRetry={() => refetchLead()}
        />
      </div>
    );
  }

  return (
    <>
      {/* Wide Two-Column Layout */}
      <div className="max-w-6xl mx-auto space-y-4 animate-in slide-in-from-right-4 duration-150 pb-20">
        {/* Combined Info Card */}
        <div className="bg-white border border-gray-200/60 rounded-xl overflow-hidden">
          {/* Top Bar: Back + Actions */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-500 font-medium hover:text-gray-900 transition-colors duration-150 text-xs uppercase tracking-wide"
            >
              <ArrowLeft size={16} /> Back to Pipeline
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-lg border border-gray-200/60 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-all duration-150"
                title="Delete lead"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() => setShowReplyModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50 hover:bg-emerald-100 transition-all duration-150"
                title="Log a reply from this lead"
              >
                <MessageCircle size={16} />
                Log Reply
              </button>

              {/* Status Dropdown */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    STATUS_OPTIONS.find((s) => s.status === lead.status)?.color ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_OPTIONS.find((s) => s.status === lead.status)?.label ?? 'Unknown'}
                  <ChevronDown size={14} className={`transition-transform duration-150 ${showStatusDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showStatusDropdown && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200/60 rounded-xl shadow-lg py-1 min-w-[180px]">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.status}
                        onClick={() => handleStatusChange(option.status)}
                        className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between transition-colors duration-150 hover:bg-gray-50 ${
                          lead.status === option.status ? 'bg-gray-50' : ''
                        }`}
                      >
                        <span className={`px-2 py-0.5 rounded-lg ${option.color}`}>
                          {option.label}
                        </span>
                        {lead.status === option.status && (
                          <Check size={14} className="text-pilot-blue" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5">
            {/* Left Column: Lead Info (3/5) */}
            <div className="lg:col-span-3 p-6 lg:border-r border-gray-100">
              <LeadInfoColumn
                lead={lead}
                onUpdate={onUpdate}
                onInitiateCall={handleInitiateCall}
                onOpenEmailComposer={handleOpenEmailComposer}
              />
            </div>

            {/* Right Column: Strategy (2/5) */}
            <div className="lg:col-span-2 p-6 bg-gray-50/50">
              <StrategySection
                lead={lead}
                strategy={activeStrategy}
                strategies={strategies}
                onSelectStrategy={handleSelectStrategy}
                onSwitchStrategy={handleSwitchStrategy}
                onExecute={handleExecuteAction}
                onSkipStep={handleCompleteCurrentStep}
                onReschedule={() => setShowRescheduleModal(true)}
                embedded
              />
            </div>
          </div>
        </div>

        {/* Activity Feed - Full Width */}
        <div ref={activityFeedRef}>
          <ActivityFeed
            leadId={lead.id}
            onSubmit={handleComposerSubmit}
            onInitiateCall={handleInitiateCall}
            onOpenEmailComposer={handleOpenEmailComposer}
            initialChannel={composerChannel}
            onChannelChange={setComposerChannel}
          />
        </div>
      </div>

      {/* Modals */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(lead.id)}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.companyName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <LogReplyModal
        isOpen={showReplyModal}
        leadName={lead.companyName}
        onClose={() => setShowReplyModal(false)}
        onSubmit={handleLogReply}
      />

      <RescheduleModal
        isOpen={showRescheduleModal}
        leadName={lead.companyName}
        currentDate={lead.nextTaskDate}
        onClose={() => setShowRescheduleModal(false)}
        onReschedule={(newDate: Date) => {
          handleReschedule(null, newDate.toISOString());
        }}
      />
    </>
  );
};

export default LeadDetail;
