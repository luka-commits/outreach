import React, { useState, useMemo, useCallback } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Lead, Activity } from './types';
import { queryClient } from './lib/queryClient';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { useLeads } from './hooks/queries/useLeadsQuery';
import { useActivities } from './hooks/queries/useActivitiesQuery';
import { useStrategies } from './hooks/queries/useStrategiesQuery';
import { useGoals } from './hooks/queries/useGoalsQuery';
import { MainLayout } from './components/layout';
import ViewRouter from './components/ViewRouter';
import CSVUpload from './components/CSVUpload';
import LeadAddForm from './components/LeadAddForm';
// import LoginPage from './components/LoginPage'; // Removed
import LandingPage from './components/LandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';

import { useTasksQuery, useAllScheduledTasksQuery } from './hooks/queries/useTasksQuery';
// import { useLeads } from './hooks/queries/useLeadsQuery'; // Removed unused import
import { usePaginatedLeadMutations } from './hooks/queries/useLeadsPaginated';
import { useLeadCountQuery } from './hooks/queries/useLeadCountQuery';

// ... other imports ...

const AppContent: React.FC = () => {
  const { user } = useAuth();
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

  // Handlers
  const handleAddLeads = useCallback(
    async (newLeads: Lead[]) => {
      try {
        await addLeads.mutateAsync(newLeads);
        setIsUploadOpen(false);
        setIsAddLeadOpen(false);
        showToast(`${newLeads.length} lead${newLeads.length > 1 ? 's' : ''} added`, 'success');
      } catch {
        showToast('Failed to add leads', 'error');
      }
    },
    [addLeads, showToast]
  );

  const handleUpdateLead = useCallback(
    async (updatedLead: Lead) => {
      try {
        await updateLead.mutateAsync(updatedLead);
      } catch {
        showToast('Failed to update lead', 'error');
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
      } catch {
        showToast('Failed to delete lead', 'error');
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
      platform?: Activity['platform']
    ) => {
      const newActivity: Activity = {
        id: crypto.randomUUID(),
        leadId,
        action,
        platform,
        timestamp: new Date().toISOString(),
        note,
        isFirstOutreach,
      };
      try {
        await addActivityToDb(newActivity);
      } catch {
        showToast('Failed to log activity', 'error');
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
      <AppContent />
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
