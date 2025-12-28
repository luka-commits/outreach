import React, { useState, useCallback } from 'react';
import { Lead, Strategy, Activity, LeadStatus } from '../../types';
import ConfirmModal from '../ConfirmModal';
import LeadHeader from './LeadHeader';
import StrategyPanel from './StrategyPanel';
import SchedulePanel from './SchedulePanel';
import ActivityComposer from './ActivityComposer';
import ActivityFeed from './ActivityFeed';
import QualifyModal from './QualifyModal';
import LoadingSpinner from '../LoadingSpinner';
import ExecutiveSummary from './ExecutiveSummary';
import { useAuth } from '../../hooks/useAuth';
import { useLeadQuery } from '../../hooks/queries/useLeadQuery';
import { useLeadActivitiesQuery } from '../../hooks/queries/useLeadActivitiesQuery';

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
    platform?: Activity['platform']
  ) => void;
  onNavigate: (direction: 'next' | 'prev') => void;
}

const LeadDetail: React.FC<LeadDetailProps> = ({
  leadId,
  strategies,
  onBack,
  onUpdate,
  onDelete,
  onAddActivity,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [qualifying, setQualifying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch Data
  const { data: lead, isLoading: leadLoading } = useLeadQuery(leadId, user?.id);
  const { data: activities = [], isLoading: activityLoading } = useLeadActivitiesQuery(user?.id, leadId);

  // Handle Updates (optimistic UI is handled by parent or mutation hook, but here we just call the prop)
  // Ideally, useMutation here too, but for now we reuse the passed handlers to minimize refactor

  // Handle Updates (optimistic UI is handled by parent or mutation hook, but here we just call the prop)
  // Ideally, useMutation here too, but for now we reuse the passed handlers to minimize refactor

  const activeStrategy = lead?.strategyId
    ? strategies.find((s) => s.id === lead.strategyId)
    : null;
  const currentStep = activeStrategy && lead ? activeStrategy.steps[lead.currentStepIndex] : null;

  // Activities are already sorted by API usually, but ensure here
  const sortedActivities = [...activities].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleQualify = useCallback(
    (status: LeadStatus) => {
      if (!lead) return;
      onUpdate({ ...lead, status });
      onAddActivity(lead.id, `Lead status changed to: ${status.replace('_', ' ')}`);
      setQualifying(false);
    },
    [lead, onUpdate, onAddActivity]
  );

  const handleSelectStrategy = useCallback(
    (strategy: Strategy) => {
      if (!lead) return;
      const updatedLead: Lead = {
        ...lead,
        strategyId: strategy.id,
        currentStepIndex: 0,
        status: 'in_progress',
        nextTaskDate: new Date().toISOString(),
      };
      onUpdate(updatedLead);
      onAddActivity(lead.id, `Strategy selected: ${strategy.name}`);
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
      const date = new Date();
      date.setDate(date.getDate() + (nextStep.dayOffset - currentStep.dayOffset));
      nextTaskDate = date.toISOString();
    }

    const updatedLead: Lead = {
      ...lead,
      currentStepIndex: nextStepIndex,
      nextTaskDate: nextTaskDate,
      status: isLastStep ? 'replied' : 'in_progress',
    };

    onUpdate(updatedLead);
    onAddActivity(
      lead.id,
      `Step completed: ${currentStep.action}`,
      `Marked as done from detail view.`
    );
  }, [lead, activeStrategy, currentStep, onUpdate, onAddActivity]);

  const handleSwitchStrategy = useCallback(() => {
    if (!lead) return;
    onUpdate({
      ...lead,
      strategyId: undefined,
      currentStepIndex: 0,
      status: 'not_contacted',
    });
  }, [lead, onUpdate]);

  const handleManualAction = useCallback(
    (platform: Activity['platform'], actionName: string) => {
      if (!lead) return;
      onAddActivity(lead.id, actionName, 'Quick outreach logged from buttons', true, platform);
    },
    [lead, onAddActivity]
  );

  const handleManualSchedule = useCallback(
    (hours: number | null, customDate?: string) => {
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

      const updatedLead: Lead = {
        ...lead,
        nextTaskDate: nextDate.toISOString(),
        status: 'in_progress',
      };
      onUpdate(updatedLead);
      onAddActivity(
        lead.id,
        `Task rescheduled to ${nextDate.toLocaleString()}`,
        `Manual schedule set by user.`
      );
    },
    [lead, onUpdate, onAddActivity]
  );

  const handleComposerSubmit = useCallback(
    (note: string, platform: Activity['platform'] | undefined) => {
      if (!lead) return;
      const actionLabel = platform
        ? `${platform.charAt(0).toUpperCase() + platform.slice(1)} Log`
        : 'Manual Note';
      onAddActivity(lead.id, actionLabel, note, false, platform);
    },
    [lead, onAddActivity]
  );

  if (leadLoading || !lead) {
    return <LoadingSpinner fullScreen={false} message="Loading lead details..." />;
  }


  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 pb-20 max-w-6xl mx-auto">
      <LeadHeader
        lead={lead}
        onBack={onBack}
        onNavigate={onNavigate}
        onDelete={() => setShowDeleteConfirm(true)}
        onQualify={() => setQualifying(true)}
        onManualAction={handleManualAction}
        onUpdate={onUpdate}
      />

      {/* Executive Summary Section */}
      {lead.executiveSummary && (
        <ExecutiveSummary summary={lead.executiveSummary} searchQuery={lead.searchQuery} />
      )}

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Strategy & Scheduling (7 Cols) */}
        <div className="lg:col-span-7 space-y-8">
          <StrategyPanel
            lead={lead}
            strategies={strategies}
            onSelectStrategy={handleSelectStrategy}
            onCompleteStep={handleCompleteCurrentStep}
            onSwitchStrategy={handleSwitchStrategy}
          />

          <SchedulePanel initialDate={lead.nextTaskDate} onSchedule={handleManualSchedule} />
        </div>

        {/* Right Column: Activity Feed & Composer (5 Cols) */}
        <div className="lg:col-span-5 space-y-8">
          <ActivityComposer onSubmit={handleComposerSubmit} />
          <ActivityFeed activities={sortedActivities} />
        </div>
      </div>

      {/* Modals */}
      <QualifyModal
        isOpen={qualifying}
        companyName={lead.companyName}
        onClose={() => setQualifying(false)}
        onQualify={handleQualify}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete(lead.id)}
        title="Delete Lead"
        message={`Are you sure you want to delete "${lead.companyName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default LeadDetail;
