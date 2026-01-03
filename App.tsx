import React, { useState, useCallback } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Lead, Activity } from './types';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { SavedFiltersProvider } from './contexts/SavedFiltersContext';
import { useActivities } from './hooks/queries/useActivitiesQuery';
import { useStrategies } from './hooks/queries/useStrategiesQuery';
import { useGoals } from './hooks/queries/useGoalsQuery';
import { MainLayout } from './components/layout';
import ViewRouter from './components/ViewRouter';
import CSVUpload from './components/CSVUpload';
import LeadAddForm from './components/LeadAddForm';
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import { CommandPalette, useCommandPalette, type CommandAction } from './components/CommandPalette';
import { getErrorMessage } from './utils/errorMessages';

import { useTasksQuery, useAllScheduledTasksQuery } from './hooks/queries/useTasksQuery';
import { usePaginatedLeadMutations } from './hooks/queries/useLeadsPaginated';
import { useLeadCountQuery } from './hooks/queries/useLeadCountQuery';

// ... other imports ...

const AppContent: React.FC = () => {
  const { user, signOut } = useAuth();
  const { navigate, selectedLeadId } = useNavigation();
  const userId = user?.id;

  // Data hooks
  // NO LONGER FETCHING ALL LEADS HERE: const { leads, ... } = useLeads(userId);

  // Use specialized hooks
  const { data: todaysTasksData, isLoading: tasksLoading } = useTasksQuery(userId);
  const todaysTasks = todaysTasksData || [];

  // All scheduled tasks (including upcoming) for TaskQueue calendar view
  const { data: allScheduledTasksData } = useAllScheduledTasksQuery(userId);
  const allScheduledTasks = allScheduledTasksData || [];

  // Lead Count for Limits
  const { data: currentLeadCount = 0 } = useLeadCountQuery();

  // We still need add/update/delete mutations to pass down
  const { addLeads, updateLead, deleteLead } = usePaginatedLeadMutations(userId);

  const { activities, addActivity: addActivityToDb } = useActivities(userId);
  const { strategies, loading: strategiesLoading, updateStrategies } = useStrategies(userId);
  const { goals, updateGoals } = useGoals(userId);
  const { showToast } = useToast();

  // Modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);

  // Command palette
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();

  // Handle command palette actions
  const handleCommandAction = useCallback(
    (action: CommandAction) => {
      switch (action) {
        case 'go-dashboard':
          navigate('dashboard');
          break;
        case 'go-pipeline':
          navigate('leads');
          break;
        case 'go-queue':
          navigate('queue');
          break;
        case 'go-sequences':
          navigate('strategies');
          break;
        case 'go-analytics':
          navigate('reporting');
          break;
        case 'go-settings':
          navigate('profile');
          break;
        case 'go-finder':
          navigate('finder');
          break;
        case 'go-pricing':
          navigate('pricing');
          break;
        case 'new-lead':
          setIsAddLeadOpen(true);
          break;
        case 'import-csv':
          setIsUploadOpen(true);
          break;
        case 'sign-out':
          signOut();
          break;
      }
    },
    [navigate, signOut]
  );

  // Handlers
  const handleAddLeads = useCallback(
    async (newLeads: Lead[]) => {
      try {
        await addLeads.mutateAsync(newLeads);
        setIsUploadOpen(false);
        setIsAddLeadOpen(false);
        showToast(`${newLeads.length} lead${newLeads.length > 1 ? 's' : ''} added`, 'success');
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
      }
    },
    [addLeads, showToast]
  );

  const handleUpdateLead = useCallback(
    async (updatedLead: Lead) => {
      try {
        await updateLead.mutateAsync(updatedLead);
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
      }
    },
    [updateLead, showToast]
  );

  const handleDeleteLead = useCallback(
    async (id: string) => {
      try {
        await deleteLead.mutateAsync(id);
        if (selectedLeadId === id) {
          navigate('leads');
        }
        showToast('Lead deleted', 'success');
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
      }
    },
    [deleteLead, selectedLeadId, navigate, showToast]
  );

  const handleAddActivity = useCallback(
    async (
      leadId: string,
      action: string,
      note?: string,
      isFirstOutreach: boolean = false,
      platform?: Activity['platform'],
      direction: Activity['direction'] = 'outbound'
    ) => {
      const newActivity: Activity = {
        id: crypto.randomUUID(),
        leadId,
        action,
        platform,
        timestamp: new Date().toISOString(),
        note,
        isFirstOutreach,
        direction,
      };
      try {
        await addActivityToDb(newActivity);
      } catch (error) {
        showToast(getErrorMessage(error), 'error');
      }
    },
    [addActivityToDb, showToast]
  );

  // Computed data
  // "Todays Tasks" is now fetched directly via useTasksQuery
  // "All Scheduled Tasks" includes upcoming tasks for calendar view

  // Loading state
  if (tasksLoading || strategiesLoading) {
    return <LoadingSpinner fullScreen message="Loading your pipeline..." />;
  }

  return (
    <MainLayout
      taskCount={todaysTasks.length}
      onOpenAddLead={() => setIsAddLeadOpen(true)}
      onOpenUpload={() => setIsUploadOpen(true)}
    >
      <ViewRouter
        leads={[]} // Pass empty array as we don't load them globally anymore
        activities={activities}
        strategies={strategies}
        goals={goals}
        currentLeadCount={currentLeadCount}
        todaysTasks={todaysTasks}
        allScheduledLeads={allScheduledTasks}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        onAddLeads={handleAddLeads}
        onAddActivity={handleAddActivity}
        onUpdateGoals={updateGoals}
        onUpdateStrategies={updateStrategies}
        onOpenUpload={() => setIsUploadOpen(true)}
      />

      {/* Modals */}
      {isUploadOpen && (
        <CSVUpload
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleAddLeads}
          currentLeadCount={currentLeadCount}
        />
      )}
      {isAddLeadOpen && (
        <LeadAddForm
          onClose={() => setIsAddLeadOpen(false)}
          onAdd={(lead) => handleAddLeads([lead])}
          currentLeadCount={currentLeadCount}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onAction={handleCommandAction}
      />
    </MainLayout>
  );
};



// Auth guard component that shows login or app content
const AuthGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <NavigationProvider>
      <SavedFiltersProvider>
        <AppContent />
      </SavedFiltersProvider>
    </NavigationProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <AuthGuard />
          </ToastProvider>
        </AuthProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
