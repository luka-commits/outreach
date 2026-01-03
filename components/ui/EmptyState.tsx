import React from 'react';
import {
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Sparkles,
  Target,
  CalendarCheck,
  type LucideIcon
} from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Users,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center mb-6">
      <Icon size={24} className="text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold tracking-tight text-gray-900 mb-2">{title}</h3>
    {description && (
      <p className="text-gray-500 text-sm max-w-sm mb-6">{description}</p>
    )}
    {(action || secondaryAction) && (
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button
            variant={action.variant || 'primary'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);

// Pre-configured empty states for common scenarios
export const EmptyLeadList: React.FC<{
  onImportCSV: () => void;
  onFindLeads: () => void;
}> = ({ onImportCSV, onFindLeads }) => (
  <EmptyState
    icon={Users}
    title="No leads yet"
    description="Import leads from a CSV file or use Lead Finder to discover prospects."
    action={{
      label: 'Import CSV',
      onClick: onImportCSV,
    }}
    secondaryAction={{
      label: 'Find Leads',
      onClick: onFindLeads,
    }}
  />
);

export const EmptyTaskQueue: React.FC<{
  filter: 'overdue' | 'today' | 'upcoming';
}> = ({ filter }) => {
  const content = {
    overdue: {
      icon: CheckCircle2,
      title: "No overdue tasks",
      description: "You're all caught up! Great job staying on top of your outreach.",
    },
    today: {
      icon: CalendarCheck,
      title: "All done for today!",
      description: "You've completed all your tasks for today. Check back tomorrow.",
    },
    upcoming: {
      icon: Target,
      title: "No upcoming tasks",
      description: "Assign strategies to leads to schedule follow-up tasks.",
    },
  };

  const { icon, title, description } = content[filter];

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
    />
  );
};

export const EmptyStrategies: React.FC<{
  onCreateStrategy: () => void;
}> = ({ onCreateStrategy }) => (
  <EmptyState
    icon={Sparkles}
    title="No sequences yet"
    description="Create your first outreach sequence to automate follow-ups."
    action={{
      label: 'Create Sequence',
      onClick: onCreateStrategy,
    }}
  />
);

export const EmptyActivities: React.FC = () => (
  <EmptyState
    icon={FileSpreadsheet}
    title="No activity logged"
    description="Complete your first outreach to see activity history here."
  />
);

export const EmptySearchResults: React.FC<{
  onClearFilters?: () => void;
}> = ({ onClearFilters }) => (
  <EmptyState
    icon={Users}
    title="No results found"
    description="Try adjusting your search or filters."
    action={onClearFilters ? {
      label: 'Clear Filters',
      onClick: onClearFilters,
      variant: 'secondary',
    } : undefined}
  />
);

EmptyState.displayName = 'EmptyState';
