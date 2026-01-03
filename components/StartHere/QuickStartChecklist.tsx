import React from 'react';
import { CheckCircle2, ArrowRight, Mail, Users, Zap, CheckSquare } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useOnboardingProgress } from '../../hooks/queries/useOnboardingProgressQuery';

interface ChecklistItemProps {
  title: string;
  description: string;
  isComplete: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({
  title,
  description,
  isComplete,
  onClick,
  icon,
}) => {
  if (isComplete) {
    return (
      <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200/50">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <CheckCircle2 size={20} className="text-emerald-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-emerald-700">{title}</p>
          <p className="text-sm text-emerald-600/70">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-pilot-blue/30 hover:shadow-md transition-all duration-150 cursor-pointer text-left group"
    >
      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-pilot-blue/10 transition-colors duration-150">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight size={18} className="text-gray-400 group-hover:text-pilot-blue transition-colors duration-150" />
    </button>
  );
};

const QuickStartChecklist: React.FC = () => {
  const { navigate } = useNavigation();
  const progress = useOnboardingProgress();

  const checklistItems = [
    {
      id: 'email',
      title: 'Connect your email',
      description: 'Set up Gmail or Resend to send emails',
      isComplete: progress.emailConnected,
      onClick: () => navigate('profile'),
      icon: <Mail size={18} className="text-gray-400 group-hover:text-pilot-blue transition-colors duration-150" />,
    },
    {
      id: 'leads',
      title: 'Import your first leads',
      description: 'Add leads via CSV or Lead Finder',
      isComplete: progress.hasLeads,
      onClick: () => navigate('finder'),
      icon: <Users size={18} className="text-gray-400 group-hover:text-pilot-blue transition-colors duration-150" />,
    },
    {
      id: 'strategy',
      title: 'Create your first strategy',
      description: 'Build a multi-step outreach sequence',
      isComplete: progress.hasStrategy,
      onClick: () => navigate('strategies'),
      icon: <Zap size={18} className="text-gray-400 group-hover:text-pilot-blue transition-colors duration-150" />,
    },
    {
      id: 'task',
      title: 'Complete your first task',
      description: 'Execute an outreach action from the queue',
      isComplete: progress.hasCompletedTask,
      onClick: () => navigate('queue'),
      icon: <CheckSquare size={18} className="text-gray-400 group-hover:text-pilot-blue transition-colors duration-150" />,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Quick Start</h2>
          <p className="text-sm text-gray-500 mt-1">Complete these steps to get up and running</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">
            {progress.completedCount} of {progress.totalCount}
          </span>
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-pilot-blue transition-all duration-500 ease-out"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {checklistItems.map((item) => (
          <ChecklistItem
            key={item.id}
            title={item.title}
            description={item.description}
            isComplete={item.isComplete}
            onClick={item.onClick}
            icon={item.icon}
          />
        ))}
      </div>

      {progress.isComplete && (
        <div className="mt-6 p-4 bg-pilot-blue/5 rounded-xl border border-pilot-blue/20 text-center">
          <p className="text-pilot-blue font-medium">
            You're all set! Start working through your daily tasks.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuickStartChecklist;
