import React, { memo } from 'react';
import { Zap, Calendar, Clock, AlertTriangle, CheckCircle, SkipForward, CalendarClock } from 'lucide-react';
import { Lead, Strategy, StrategyStep } from '../../types';
import { formatRelativeDate } from '../../utils/dateFormat';

interface NextActionCardProps {
  lead: Lead;
  strategy: Strategy | null;
  currentStep: StrategyStep | null;
  onOpenComposer: (platform: StrategyStep['action']) => void;
  onSkipStep: () => void;
  onReschedule: () => void;
  onSelectStrategy: () => void;
}

type TaskUrgency = 'overdue' | 'due_today' | 'upcoming' | 'no_task' | 'completed';

const NextActionCard: React.FC<NextActionCardProps> = memo(({
  lead,
  strategy,
  currentStep,
  onOpenComposer,
  onSkipStep,
  onReschedule,
  onSelectStrategy,
}) => {
  // Determine task urgency
  const getTaskUrgency = (): TaskUrgency => {
    if (!strategy) return 'no_task';
    if (lead.currentStepIndex >= strategy.steps.length) return 'completed';
    if (!lead.nextTaskDate) return 'upcoming';

    const taskDate = new Date(lead.nextTaskDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

    if (taskDay < today) return 'overdue';
    if (taskDay.getTime() === today.getTime()) return 'due_today';
    return 'upcoming';
  };

  const urgency = getTaskUrgency();

  // Render different states
  if (!strategy) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-200 text-slate-500">
              <Zap size={18} />
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Next Step</span>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-slate-600 font-medium mb-3">No strategy assigned</p>
          <button
            onClick={onSelectStrategy}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Select Strategy
          </button>
        </div>
      </div>
    );
  }

  if (urgency === 'completed') {
    return (
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-white">
              <CheckCircle size={18} />
            </div>
            <div>
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Strategy Complete</span>
              <p className="text-emerald-800 font-medium mt-1">{strategy.name} finished</p>
            </div>
          </div>
          <button
            onClick={onSelectStrategy}
            className="px-4 py-2 bg-white text-emerald-700 text-sm font-medium rounded-lg border border-emerald-300 hover:bg-emerald-50 transition-colors"
          >
            Start New Strategy
          </button>
        </div>
      </div>
    );
  }

  // Active task state
  const urgencyStyles = {
    overdue: {
      container: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200',
      badge: 'bg-rose-500 text-white',
      badgeText: 'Overdue',
      icon: <AlertTriangle size={18} />,
    },
    due_today: {
      container: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',
      badge: 'bg-amber-500 text-white',
      badgeText: 'Due Today',
      icon: <Clock size={18} />,
    },
    upcoming: {
      container: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-700',
      badgeText: lead.nextTaskDate ? formatRelativeDate(lead.nextTaskDate) : 'Scheduled',
      icon: <Calendar size={18} />,
    },
    no_task: {
      container: 'bg-slate-50 border-slate-200',
      badge: 'bg-slate-100 text-slate-600',
      badgeText: 'No Date',
      icon: <Zap size={18} />,
    },
    completed: {
      container: 'bg-emerald-50 border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700',
      badgeText: 'Done',
      icon: <CheckCircle size={18} />,
    },
  };

  const styles = urgencyStyles[urgency];
  const actionLabel = currentStep?.action.replace(/_/g, ' ') || 'Next Step';

  return (
    <div className={`border rounded-xl p-6 ${styles.container}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${urgency === 'overdue' ? 'bg-rose-500 text-white' : urgency === 'due_today' ? 'bg-amber-500 text-white' : 'bg-indigo-500 text-white'}`}>
            <Zap size={18} />
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Next Step</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
          {styles.badgeText}
        </span>
      </div>

      {/* Task Content */}
      <div className="mb-5">
        <p className="text-lg font-bold text-slate-900 capitalize mb-1">
          Day {currentStep?.dayOffset}: {actionLabel}
        </p>
        {currentStep?.template && (
          <p className="text-sm text-slate-600 line-clamp-2 italic">
            "{currentStep.template.substring(0, 100)}..."
          </p>
        )}
        {lead.nextTaskNote && (
          <p className="text-sm text-slate-500 mt-2 bg-white/50 p-2 rounded-lg border border-slate-200">
            Note: {lead.nextTaskNote}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => currentStep && onOpenComposer(currentStep.action)}
          className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all ${
            urgency === 'overdue'
              ? 'bg-rose-500 hover:bg-rose-600 text-white'
              : urgency === 'due_today'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {getActionIcon(currentStep?.action)}
          Do It Now
        </button>
        <button
          onClick={onSkipStep}
          className="p-3 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
          title="Skip this step"
        >
          <SkipForward size={18} />
        </button>
        <button
          onClick={onReschedule}
          className="p-3 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
          title="Reschedule"
        >
          <CalendarClock size={18} />
        </button>
      </div>
    </div>
  );
});

NextActionCard.displayName = 'NextActionCard';

// Helper to get action icon
function getActionIcon(action?: StrategyStep['action']) {
  switch (action) {
    case 'send_dm':
      return <span>💬</span>;
    case 'send_email':
      return <span>📧</span>;
    case 'call':
      return <span>📞</span>;
    case 'fb_message':
      return <span>👤</span>;
    case 'linkedin_dm':
      return <span>💼</span>;
    case 'walk_in':
      return <span>🚶</span>;
    default:
      return <Zap size={16} />;
  }
}

export default NextActionCard;
