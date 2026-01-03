import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  SkipForward,
  CalendarClock,
  ChevronDown,
  Check,
  Instagram,
  Mail,
  Phone,
  Facebook,
  Linkedin,
  Footprints,
  Zap,
} from 'lucide-react';
import { Lead, Strategy, TaskAction } from '../../types';
import { formatRelativeDate } from '../../utils/dateFormat';
import { getStrategyColor } from '../../utils/styles';

// Action to platform style mapping
const ACTION_STYLES: Record<TaskAction, { icon: React.ReactNode; buttonClass: string }> = {
  send_dm: {
    icon: <Instagram size={16} />,
    buttonClass: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500',
  },
  send_email: {
    icon: <Mail size={16} />,
    buttonClass: 'bg-rose-500 hover:bg-rose-600',
  },
  call: {
    icon: <Phone size={16} />,
    buttonClass: 'bg-emerald-500 hover:bg-emerald-600',
  },
  fb_message: {
    icon: <Facebook size={16} />,
    buttonClass: 'bg-blue-600 hover:bg-blue-700',
  },
  linkedin_dm: {
    icon: <Linkedin size={16} />,
    buttonClass: 'bg-sky-600 hover:bg-sky-700',
  },
  walk_in: {
    icon: <Footprints size={16} />,
    buttonClass: 'bg-amber-500 hover:bg-amber-600',
  },
  manual: {
    icon: <Zap size={16} />,
    buttonClass: 'bg-slate-600 hover:bg-slate-700',
  },
};

interface StrategySectionProps {
  lead: Lead;
  strategy: Strategy | null;
  strategies: Strategy[];
  onSelectStrategy: (strategy: Strategy) => void;
  onSwitchStrategy: () => void;
  onExecute: (action: TaskAction) => void;
  onSkipStep: () => void;
  onReschedule: () => void;
  /** When true, removes outer container styling (for embedding in parent card) */
  embedded?: boolean;
}

type TaskUrgency = 'overdue' | 'due_today' | 'upcoming' | 'no_task' | 'completed';

const StrategySection: React.FC<StrategySectionProps> = memo(({
  lead,
  strategy,
  strategies,
  onSelectStrategy,
  onSwitchStrategy,
  onExecute,
  onSkipStep,
  onReschedule,
  embedded = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const currentStep = strategy && lead.currentStepIndex < strategy.steps.length
    ? strategy.steps[lead.currentStepIndex]
    : null;
  const isComplete = strategy && lead.currentStepIndex >= strategy.steps.length;

  // Urgency styling
  const urgencyStyles = {
    overdue: {
      container: 'bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200',
      badge: 'bg-rose-500 text-white',
      badgeText: 'Overdue',
      buttonBg: 'bg-rose-500 hover:bg-rose-600',
    },
    due_today: {
      container: 'bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200',
      badge: 'bg-amber-500 text-white',
      badgeText: 'Due Today',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
    },
    upcoming: {
      container: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
      badge: 'bg-blue-100 text-blue-700',
      badgeText: lead.nextTaskDate ? formatRelativeDate(lead.nextTaskDate) : 'Scheduled',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
    },
    no_task: {
      container: 'bg-slate-50 border-slate-200',
      badge: 'bg-slate-100 text-slate-600',
      badgeText: 'No Date',
      buttonBg: 'bg-indigo-600 hover:bg-indigo-700',
    },
    completed: {
      container: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200',
      badge: 'bg-emerald-500 text-white',
      badgeText: 'Complete',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    },
  };

  const styles = urgencyStyles[urgency];

  // No strategy state
  if (!strategy) {
    return (
      <div className={embedded ? '' : 'bg-white border border-slate-200 rounded-xl overflow-hidden'}>
        <div className={`flex items-center justify-between ${embedded ? 'mb-4' : 'px-4 py-3 border-b border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-300" />
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Strategy
            </h4>
          </div>
          <StrategyDropdown
            strategies={strategies}
            currentStrategy={null}
            onSelect={onSelectStrategy}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
            dropdownRef={dropdownRef}
          />
        </div>
        <div className={embedded ? 'text-center py-8' : 'p-8 text-center'}>
          <div className="inline-flex p-4 rounded-full bg-slate-100 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-300" />
          </div>
          <p className="text-lg text-slate-700 font-semibold mb-2">No strategy assigned</p>
          <p className="text-sm text-slate-500 mb-6">
            Assign a strategy to automate your outreach workflow
          </p>
          <button
            onClick={() => setShowDropdown(true)}
            className="px-6 py-3 bg-indigo-600 text-white text-base font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Select Strategy
          </button>
        </div>
      </div>
    );
  }

  const strategyColor = getStrategyColor(strategy.color);

  return (
    <div className={embedded ? '' : `border rounded-xl overflow-hidden ${styles.container}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${embedded ? 'mb-4' : 'px-4 py-3 border-b border-slate-100/50 bg-white/50'}`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${strategyColor.solid}`} />
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Strategy & Next Step
          </h4>
        </div>
        <StrategyDropdown
          strategies={strategies}
          currentStrategy={strategy}
          onSelect={onSelectStrategy}
          onSwitch={onSwitchStrategy}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
          dropdownRef={dropdownRef}
        />
      </div>

      <div className={embedded ? '' : 'p-4'}>
        {/* Strategy Name + Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-800">{strategy.name}</span>
            {isComplete && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
                Complete
              </span>
            )}
          </div>

          {/* Horizontal Progress Steps */}
          <div className="relative">
            {/* Progress Line Background */}
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 rounded-full" />
            {/* Progress Line Filled */}
            <div
              className={`absolute top-3 left-0 h-0.5 ${strategyColor.solid} rounded-full transition-all duration-500`}
              style={{
                width: isComplete
                  ? '100%'
                  : `${(lead.currentStepIndex / Math.max(strategy.steps.length - 1, 1)) * 100}%`,
              }}
            />

            {/* Step Circles */}
            <div className="relative flex justify-between">
              {strategy.steps.map((step, idx) => {
                const isCompleted = idx < lead.currentStepIndex;
                const isCurrent = idx === lead.currentStepIndex;

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center"
                    style={{ width: `${100 / strategy.steps.length}%` }}
                  >
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? `${strategyColor.solid} text-white`
                          : isCurrent
                            ? `bg-white border-2 ${strategyColor.border} ${strategyColor.text}`
                            : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      )}
                    </div>
                    <div className="mt-1.5 text-center">
                      <p className={`text-[9px] font-bold uppercase tracking-tight ${
                        isCurrent ? strategyColor.text : isCompleted ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        Day {step.dayOffset}
                      </p>
                      <p className={`text-[8px] capitalize ${
                        isCurrent ? strategyColor.text : 'text-slate-400'
                      }`}>
                        {formatAction(step.action)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Next Action Card */}
        {!isComplete && currentStep ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UrgencyIcon urgency={urgency} />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Next: Day {currentStep.dayOffset}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
                {styles.badgeText}
              </span>
            </div>

            <p className="text-base font-bold text-slate-900 capitalize mb-2">
              {formatAction(currentStep.action)}
            </p>

            {currentStep.template && (
              <p className="text-sm text-slate-600 line-clamp-2 italic mb-3">
                "{currentStep.template.substring(0, 80)}..."
              </p>
            )}

            {lead.nextTaskNote && (
              <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 mb-3">
                Note: {lead.nextTaskNote}
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExecute(currentStep.action)}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all text-white ${
                  ACTION_STYLES[currentStep.action]?.buttonClass ?? styles.buttonBg
                }`}
              >
                {ACTION_STYLES[currentStep.action]?.icon ?? <Zap size={16} />}
                Execute
              </button>
              <button
                onClick={onSkipStep}
                className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
                title="Skip this step"
              >
                <SkipForward size={16} />
              </button>
              <button
                onClick={onReschedule}
                className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-all"
                title="Reschedule"
              >
                <CalendarClock size={16} />
              </button>
            </div>
          </div>
        ) : isComplete ? (
          <div className="bg-white rounded-lg border border-emerald-200 p-4 mt-4 text-center">
            <CheckCircle size={24} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-emerald-800 font-medium">Strategy completed!</p>
            <p className="text-sm text-emerald-600 mt-1">All {strategy.steps.length} steps finished</p>
          </div>
        ) : null}
      </div>
    </div>
  );
});

StrategySection.displayName = 'StrategySection';

// Strategy dropdown component
interface StrategyDropdownProps {
  strategies: Strategy[];
  currentStrategy: Strategy | null;
  onSelect: (strategy: Strategy) => void;
  onSwitch?: () => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
}

const StrategyDropdown: React.FC<StrategyDropdownProps> = ({
  strategies,
  currentStrategy,
  onSelect,
  onSwitch,
  showDropdown,
  setShowDropdown,
  dropdownRef,
}) => {
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        {currentStrategy ? 'Change' : 'Select'}
        <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
          {currentStrategy && onSwitch && (
            <>
              <button
                onClick={() => {
                  onSwitch();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Remove Strategy
              </button>
              <div className="border-t border-slate-100 my-1" />
            </>
          )}
          {strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s);
                setShowDropdown(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                currentStrategy?.id === s.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <p className="font-bold">{s.name}</p>
              <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">
                {s.steps.length} steps • {s.description}
              </p>
            </button>
          ))}
          {strategies.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">No strategies available</p>
          )}
        </div>
      )}
    </div>
  );
};

// Urgency icon component
function UrgencyIcon({ urgency }: { urgency: TaskUrgency }) {
  switch (urgency) {
    case 'overdue':
      return <AlertTriangle size={16} className="text-rose-500" />;
    case 'due_today':
      return <Clock size={16} className="text-amber-500" />;
    case 'upcoming':
      return <Calendar size={16} className="text-blue-500" />;
    default:
      return <Zap size={16} className="text-indigo-500" />;
  }
}

// Format action for display
function formatAction(action: string): string {
  return action.replace(/_/g, ' ');
}

export default StrategySection;
