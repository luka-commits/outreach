import React, { Suspense, lazy } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { Lead, Activity, Strategy, OutreachGoals } from '../types';
import LoadingSpinner from './LoadingSpinner';

// Transition wrapper for smooth view changes
const ViewTransition: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = ''
}) => (
  <div className={`animate-in fade-in duration-200 ${className}`}>
    {children}
  </div>
);

// Lazy load all view components for code splitting
const Dashboard = lazy(() => import('./Dashboard'));
const LeadList = lazy(() => import('./LeadList'));
const LeadDetail = lazy(() => import('./LeadDetail'));
const TaskQueue = lazy(() => import('./TaskQueue'));
const StrategyManager = lazy(() => import('./StrategyManager'));
const Reporting = lazy(() => import('./Reporting'));
const LeadFinder = lazy(() => import('./LeadFinder'));
const PricingPage = lazy(() => import('./PricingPage'));
const SettingsView = lazy(() => import('./SettingsView'));
const CSVUpload = lazy(() => import('./CSVUpload'));
const DuplicateDetection = lazy(() => import('./DuplicateDetection'));
const Networking = lazy(() => import('./Networking'));
const StartHere = lazy(() => import('./StartHere'));

interface ViewRouterProps {
  // Data
  leads: Lead[];
  activities: Activity[];
  strategies: Strategy[];
  goals: OutreachGoals;
  currentLeadCount: number;

  // Computed data
  todaysTasks: Lead[];
  allScheduledLeads: Lead[];

  // Callbacks
  onUpdateLead: (lead: Lead) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onAddLeads: (leads: Lead[]) => Promise<void>;
  onAddActivity: (
    leadId: string,
    action: string,
    note?: string,
    isFirstOutreach?: boolean,
    platform?: Activity['platform'],
    direction?: Activity['direction']
  ) => Promise<void>;
  onUpdateGoals: (goals: OutreachGoals) => void;
  onUpdateStrategies: (strategies: Strategy[]) => void;
  onOpenUpload: () => void;
}

const ViewRouter: React.FC<ViewRouterProps> = ({
  leads,
  activities,
  strategies,
  goals,
  currentLeadCount,
  todaysTasks,
  allScheduledLeads,
  onUpdateLead,
  onDeleteLead,
  onAddLeads,
  onAddActivity,
  onUpdateGoals,
  onUpdateStrategies,
  onOpenUpload: _onOpenUpload,
}) => {
  const { currentView, selectedLeadId, navigate, navigateToLead, goBack } = useNavigation();
  const [showUpload, setShowUpload] = React.useState(false);

  return (
    <Suspense fallback={<LoadingSpinner fullScreen={false} message="Loading view..." />}>
      {currentView === 'starthere' && (
        <ViewTransition>
          <StartHere />
        </ViewTransition>
      )}

      {currentView === 'dashboard' && (
        <ViewTransition>
          <Dashboard
            leads={leads}
            activities={activities}
            onStartQueue={() => navigate('queue')}
            onViewLeads={() => navigate('leads')}
            queueCount={todaysTasks.length}
            todaysTasks={todaysTasks}
            goals={goals}
            onUpdateGoals={onUpdateGoals}
            onOpenPricing={() => navigate('pricing')}
            onOpenSettings={() => navigate('profile')}
          />
        </ViewTransition>
      )}

      {currentView === 'leads' && (
        <ViewTransition>
          <LeadList
            strategies={strategies}
            onSelectLead={navigateToLead}
            onOpenUpload={() => setShowUpload(true)}
            onUpdateLead={onUpdateLead}
          />
        </ViewTransition>
      )}

      {currentView === 'finder' && (
        <ViewTransition>
          <LeadFinder onNavigateToSettings={() => navigate('profile')} />
        </ViewTransition>
      )}

      {currentView === 'detail' && selectedLeadId && (
        <ViewTransition>
          <LeadDetail
            leadId={selectedLeadId}
            strategies={strategies}
            onBack={goBack}
            onUpdate={onUpdateLead}
            onDelete={onDeleteLead}
            onAddActivity={onAddActivity}
          />
        </ViewTransition>
      )}

      {currentView === 'queue' && (
        <ViewTransition>
          <TaskQueue
            todayTasks={todaysTasks}
            allScheduledTasks={allScheduledLeads}
            strategies={strategies}
            onBack={goBack}
            onUpdateLead={onUpdateLead}
            onAddActivity={onAddActivity}
            onSelectLead={navigateToLead}
          />
        </ViewTransition>
      )}

      {currentView === 'strategies' && (
        <ViewTransition>
          <StrategyManager strategies={strategies} onUpdate={onUpdateStrategies} />
        </ViewTransition>
      )}

      {currentView === 'reporting' && (
        <ViewTransition>
          <Reporting />
        </ViewTransition>
      )}

      {/* Removed old settings view */}
      {/* {currentView === 'settings' && (
        <Settings
          goals={goals}
          onUpdateGoals={onUpdateGoals}
          strategies={strategies}
          onUpdateStrategies={onUpdateStrategies}
          onBack={goBack}
        />
      )} */}

      {currentView === 'profile' && (
        <ViewTransition>
          <SettingsView
            onClose={() => goBack()}
            onOpenPricing={() => navigate('pricing')}
          />
        </ViewTransition>
      )}

      {currentView === 'pricing' && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
          <PricingPage onBack={() => goBack()} />
        </div>
      )}

      {currentView === 'duplicates' && (
        <ViewTransition>
          <DuplicateDetection />
        </ViewTransition>
      )}

      {currentView === 'networking' && (
        <ViewTransition>
          <Networking />
        </ViewTransition>
      )}

      {/* Modal Overlay for Upload */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <CSVUpload
            onUpload={onAddLeads}
            onClose={() => setShowUpload(false)}
            currentLeadCount={currentLeadCount}
          />
        </div>
      )}
    </Suspense>
  );
};

export default ViewRouter;
