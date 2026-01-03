import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check, Copy, ExternalLink, Instagram, Mail,
  Facebook, Sparkles, Loader2, Linkedin, List, ChevronRight,
  PlayCircle, Calendar as CalendarIcon, ChevronLeft, CheckSquare, Trash2,
  MessageSquare, PhoneCall, Filter, Clock, User, History, X, Menu
} from 'lucide-react';
import { Lead, Strategy, Activity, CallOutcome, StrategyStep } from '../types';
import { ACTION_ICONS } from '../constants';
import { generatePersonalizedMessage } from '../services/geminiService';
import { getPlatformColor, getStrategyColor } from '../utils/styles';
import { substituteTemplateVariables } from '../utils/templateUtils';
import CallProcessingPanel from './CallProcessingPanel';
import EmailSendPanel from './EmailSendPanel';
import { useUnifiedTimeline, TimelineItem } from '../hooks/queries/useUnifiedTimeline';

// Interface for grouped tasks (multiple tasks per day for one lead)
interface PendingStep {
  index: number;
  step: StrategyStep;
  completed: boolean;
}

interface TaskGroup {
  lead: Lead;
  strategy: Strategy | null;
  pendingSteps: PendingStep[];
  totalStepsToday: number;
  completedStepsToday: number;
}

// Helper to get all steps for the current day group
const getSameDaySteps = (lead: Lead, strategy: Strategy): PendingStep[] => {
  const currentStep = strategy.steps[lead.currentStepIndex];
  if (!currentStep) return [];

  const currentDayOffset = currentStep.dayOffset;
  const completedIndexes = new Set(lead.completedStepIndexes || []);

  return strategy.steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.dayOffset === currentDayOffset)
    .map(({ step, index }) => ({
      index,
      step,
      completed: completedIndexes.has(index),
    }));
};

// Helper to create a TaskGroup from a lead
const createTaskGroup = (lead: Lead, strategies: Strategy[]): TaskGroup => {
  const strategy = strategies.find(s => s.id === lead.strategyId) || null;

  if (!strategy) {
    return {
      lead,
      strategy: null,
      pendingSteps: [],
      totalStepsToday: 1,
      completedStepsToday: 0,
    };
  }

  const pendingSteps = getSameDaySteps(lead, strategy);
  const completedCount = pendingSteps.filter(s => s.completed).length;

  return {
    lead,
    strategy,
    pendingSteps,
    totalStepsToday: pendingSteps.length,
    completedStepsToday: completedCount,
  };
};

interface TaskQueueProps {
  todayTasks: Lead[];
  allScheduledTasks: Lead[];
  strategies: Strategy[];
  onBack: () => void;
  onUpdateLead: (lead: Lead) => void;
  onAddActivity: (leadId: string, action: string, note?: string, isFirstOutreach?: boolean, platform?: Activity['platform'], direction?: Activity['direction']) => void;
  onSelectLead: (id: string) => void;
}

type ViewMode = 'list' | 'calendar' | 'processing';
type FilterType = 'overdue' | 'today' | 'upcoming' | 'specific';
type CalendarMode = 'week' | 'month';
type TaskTypeFilter = 'all' | 'dm' | 'call' | 'email';

import ConfirmModal from './ConfirmModal';
import RescheduleModal from './RescheduleModal';
import { useToast } from './Toast';

// Helper to format relative time
const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TaskQueue: React.FC<TaskQueueProps> = ({ todayTasks: _todayTasks, allScheduledTasks, strategies, onBack: _onBack, onUpdateLead, onAddActivity, onSelectLead }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [taskTypeFilter, setTaskTypeFilter] = useState<TaskTypeFilter>('all');
  const [isSessionMode, setIsSessionMode] = useState(false);
  const { showToast } = useToast();

  // Processing State
  const [processLeadId, setProcessLeadId] = useState<string | null>(null);
  const [processStepIndex, setProcessStepIndex] = useState<number | null>(null); // Track which step in multi-task day
  const [_isDone, _setIsDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [message, setMessage] = useState('');

  // Delete Confirmation State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [taskToReschedule, setTaskToReschedule] = useState<Lead | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()); // Used for both Month and Week view anchor
  const [specificDate, setSpecificDate] = useState<string | null>(null); // For filtering by specific calendar day

  // Session sidebar state
  const [showSessionSidebar, setShowSessionSidebar] = useState(true);

  // Activity panel state - collapsed by default, remembers preference
  const [showActivities, setShowActivities] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskQueue.showActivities') === 'true';
    }
    return false;
  });

  // Fetch activities for current lead in processing mode
  const { data: leadTimeline = [], isLoading: timelineLoading } = useUnifiedTimeline(processLeadId ?? undefined);

  // Helper to get task action type
  const getTaskAction = useCallback((task: Lead): string | undefined => {
    const taskStrategy = strategies.find(s => s.id === task.strategyId);
    return taskStrategy?.steps[task.currentStepIndex]?.action;
  }, [strategies]);

  // Helper to check if task matches type filter
  const matchesTaskTypeFilter = useCallback((task: Lead, filter: TaskTypeFilter): boolean => {
    if (filter === 'all') return true;
    const action = getTaskAction(task);
    if (!action) return false; // Manual tasks only show in 'all'

    if (filter === 'dm') return ['send_dm', 'fb_message', 'linkedin_dm'].includes(action);
    if (filter === 'call') return action === 'call';
    if (filter === 'email') return action === 'send_email';
    return true;
  }, [getTaskAction]);

  // Filter Logic & Counts
  const { filteredTasks, sessionTasks, counts, taskTypeCounts } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;

    // Task type counts (for currently active date filter)
    let allCount = 0;
    let dmCount = 0;
    let callCount = 0;
    let emailCount = 0;

    // Filter out tasks without dates first, then sort
    const sortedTasks = [...allScheduledTasks]
      .filter(t => t.nextTaskDate)
      .sort((a, b) => new Date(a.nextTaskDate!).getTime() - new Date(b.nextTaskDate!).getTime());

    sortedTasks.forEach(task => {
      if (!task.nextTaskDate) return;
      const taskDate = new Date(task.nextTaskDate);
      taskDate.setHours(0, 0, 0, 0);

      if (taskDate < today && task.status !== 'replied' && task.status !== 'qualified' && task.status !== 'disqualified') {
        overdueCount++;
      } else if (taskDate.getTime() === today.getTime()) {
        todayCount++;
      } else if (taskDate > today) {
        upcomingCount++;
      }
    });

    // For session mode, we want Overdue + Today
    const sessionTasksList = sortedTasks.filter(task => {
      if (!task.nextTaskDate) return false;
      const taskDate = new Date(task.nextTaskDate);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate <= today && task.status !== 'replied' && task.status !== 'qualified' && task.status !== 'disqualified';
    });

    // First filter by date
    const dateFiltered = sortedTasks.filter(task => {
      if (!task.nextTaskDate) return false;
      const taskDate = new Date(task.nextTaskDate);
      taskDate.setHours(0, 0, 0, 0);

      if (activeFilter === 'specific' && specificDate) {
        const targetDate = new Date(specificDate);
        targetDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === targetDate.getTime();
      }
      if (activeFilter === 'overdue') {
        return taskDate < today && task.status !== 'replied' && task.status !== 'qualified' && task.status !== 'disqualified';
      }
      if (activeFilter === 'today') {
        return taskDate.getTime() === today.getTime();
      }
      if (activeFilter === 'upcoming') {
        return taskDate > today;
      }
      return false;
    });

    // Count task types within the date filter
    dateFiltered.forEach(task => {
      allCount++;
      if (matchesTaskTypeFilter(task, 'dm')) dmCount++;
      if (matchesTaskTypeFilter(task, 'call')) callCount++;
      if (matchesTaskTypeFilter(task, 'email')) emailCount++;
    });

    // Then filter by task type
    const filtered = dateFiltered.filter(task => matchesTaskTypeFilter(task, taskTypeFilter));

    return {
      filteredTasks: filtered,
      sessionTasks: sessionTasksList,
      counts: { overdue: overdueCount, today: todayCount, upcoming: upcomingCount },
      taskTypeCounts: { all: allCount, dm: dmCount, call: callCount, email: emailCount }
    };
  }, [allScheduledTasks, activeFilter, taskTypeFilter, matchesTaskTypeFilter, specificDate]);

  // Determine current lead for processing
  const currentLead = processLeadId ? allScheduledTasks.find(l => l.id === processLeadId) : null;
  const strategy = currentLead?.strategyId ? strategies.find(s => s.id === currentLead.strategyId) : null;

  // Create task group for multi-task days
  const currentTaskGroup = useMemo(() => {
    if (!currentLead) return null;
    return createTaskGroup(currentLead, strategies);
  }, [currentLead, strategies]);

  // Determine which step to show (use processStepIndex if set, otherwise first incomplete step)
  const activeStepIndex = useMemo(() => {
    if (!currentLead || !strategy || !currentTaskGroup) return currentLead?.currentStepIndex ?? 0;

    // If we have a specific step selected
    if (processStepIndex !== null) {
      return processStepIndex;
    }

    // Find first incomplete step in the day group
    const firstIncomplete = currentTaskGroup.pendingSteps.find(s => !s.completed);
    return firstIncomplete?.index ?? currentLead.currentStepIndex;
  }, [currentLead, strategy, currentTaskGroup, processStepIndex]);

  const step = strategy ? strategy.steps[activeStepIndex] : null;

  useEffect(() => {
    if (currentLead && step) {
      const template = substituteTemplateVariables(step.template, currentLead);
      setMessage(template);
    }
    setCopied(false);
  }, [processLeadId, currentLead, step, activeStepIndex]);

  const handlePersonalize = async () => {
    if (!currentLead || !step) return;
    setPersonalizing(true);
    try {
      const result = await generatePersonalizedMessage(currentLead.companyName, step.template, currentLead.contactName);
      setMessage(result);
    } finally {
      setPersonalizing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformFromAction = (action: string): Activity['platform'] | undefined => {
    if (action === 'send_dm') return 'instagram';
    if (action === 'fb_message') return 'facebook';
    if (action === 'linkedin_dm') return 'linkedin';
    if (action === 'send_email') return 'email';
    if (action === 'call') return 'call';
    return undefined;
  };

  const handleCompleteTask = () => {
    if (!currentLead) return;

    // Handle Manual/No-Strategy Case
    if (!strategy || !step) {
      // Just clear nextTaskDate to remove from queue
      const updatedLead: Lead = {
        ...currentLead,
        nextTaskDate: undefined,
        status: 'in_progress' // Keep in progress
      };
      onUpdateLead(updatedLead);
      onAddActivity(currentLead.id, `Manual Task Completed`, message || 'Task done', false, 'call');
      advanceToNextLeadOrClose();
      return;
    }

    // Multi-task day logic
    const currentDayOffset = step.dayOffset;
    const completedIndexes = new Set(currentLead.completedStepIndexes || []);
    completedIndexes.add(activeStepIndex);

    // Find all steps with the same dayOffset
    const sameDaySteps = strategy.steps
      .map((s, i) => ({ step: s, index: i }))
      .filter(({ step: s }) => s.dayOffset === currentDayOffset);

    // Check if all same-day tasks are now complete
    const allSameDayComplete = sameDaySteps.every(({ index }) => completedIndexes.has(index));

    const platform = getPlatformFromAction(step.action);
    const isFirstOutreach = activeStepIndex === 0;

    if (allSameDayComplete) {
      // All tasks for this day are done - advance to next day group
      const nextDaySteps = strategy.steps
        .map((s, i) => ({ step: s, index: i }))
        .filter(({ step: s, index: i }) => s.dayOffset > currentDayOffset && !completedIndexes.has(i))
        .sort((a, b) => a.step.dayOffset - b.step.dayOffset);

      if (nextDaySteps.length > 0 && nextDaySteps[0]) {
        const nextDayStep = nextDaySteps[0];
        const nextDayOffset = nextDayStep.step.dayOffset;
        const nextStepIndex = strategy.steps.findIndex(s => s.dayOffset === nextDayOffset);

        // Calculate next task date based on day difference
        const dayDiff = nextDayOffset - currentDayOffset;
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + dayDiff);

        const updatedLead: Lead = {
          ...currentLead,
          currentStepIndex: nextStepIndex >= 0 ? nextStepIndex : currentLead.currentStepIndex,
          completedStepIndexes: [], // Clear for new day group
          nextTaskDate: newDate.toISOString(),
          status: 'in_progress'
        };

        onUpdateLead(updatedLead);
        onAddActivity(currentLead.id, `Task completed: ${step.action}`, message, isFirstOutreach, platform);
        showToast('Day complete - advancing to next day', 'success');
      } else {
        // Strategy complete - no more days
        const updatedLead: Lead = {
          ...currentLead,
          currentStepIndex: strategy.steps.length,
          completedStepIndexes: [],
          nextTaskDate: undefined,
          status: 'replied'
        };

        onUpdateLead(updatedLead);
        onAddActivity(currentLead.id, `Task completed: ${step.action}`, message, isFirstOutreach, platform);
        showToast('Strategy complete!', 'success');
      }

      // Reset step index and advance to next lead
      setProcessStepIndex(null);
      advanceToNextLeadOrClose();
    } else {
      // More tasks for this day - just mark this step complete and stay on lead
      const updatedLead: Lead = {
        ...currentLead,
        completedStepIndexes: Array.from(completedIndexes),
      };

      onUpdateLead(updatedLead);
      onAddActivity(currentLead.id, `Task completed: ${step.action}`, message, isFirstOutreach, platform);

      // Find and switch to next incomplete step
      const nextIncomplete = sameDaySteps.find(({ index }) => !completedIndexes.has(index));
      if (nextIncomplete) {
        setProcessStepIndex(nextIncomplete.index);
        showToast(`Task done (${completedIndexes.size}/${sameDaySteps.length} for today)`, 'success');
      }
    }
  };

  // Helper to advance to next lead or close processing
  const advanceToNextLeadOrClose = () => {
    const tasksToUse = isSessionMode ? sessionTasks : filteredTasks;
    const currentIndex = tasksToUse.findIndex(t => t.id === currentLead?.id);
    const nextTask = tasksToUse[currentIndex + 1];

    if (nextTask) {
      setProcessLeadId(nextTask.id);
      setProcessStepIndex(null);
    } else {
      if (isSessionMode) {
        showToast('All session tasks complete!', 'success');
        setIsSessionMode(false);
      }
      setProcessLeadId(null);
      setProcessStepIndex(null);
      setViewMode('list');
    }
  };


  const startProcessingTask = (leadId: string, stepIndex?: number) => {
    setProcessLeadId(leadId);
    setProcessStepIndex(stepIndex ?? null);
    setViewMode('processing');
    setIsSessionMode(false); // Single task mode
  };

  const startSession = () => {
    if (sessionTasks.length === 0) {
      alert("No outstanding tasks to process!");
      return;
    }
    const firstTask = sessionTasks[0];
    if (!firstTask) return;
    setIsSessionMode(true);
    setProcessLeadId(firstTask.id);
    setProcessStepIndex(null);
    setViewMode('processing');
  };

  // Navigation helpers for prev/next task
  const tasksToNavigate = isSessionMode ? sessionTasks : filteredTasks;
  const currentTaskIndex = currentLead ? tasksToNavigate.findIndex(t => t.id === currentLead.id) : -1;
  const canGoPrev = currentTaskIndex > 0;
  const canGoNext = currentTaskIndex >= 0 && currentTaskIndex < tasksToNavigate.length - 1;

  const handlePrevTask = () => {
    if (canGoPrev) {
      const prevTask = tasksToNavigate[currentTaskIndex - 1];
      if (prevTask) {
        setProcessLeadId(prevTask.id);
        setProcessStepIndex(null);
      }
    }
  };

  const handleNextTask = () => {
    if (canGoNext) {
      const nextTask = tasksToNavigate[currentTaskIndex + 1];
      if (nextTask) {
        setProcessLeadId(nextTask.id);
        setProcessStepIndex(null);
      }
    }
  };

  const handleJumpToTask = (taskId: string, stepIndex?: number) => {
    setProcessLeadId(taskId);
    setProcessStepIndex(stepIndex ?? null);
  };

  // Toggle activities panel and persist preference
  const toggleActivities = () => {
    const newValue = !showActivities;
    setShowActivities(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskQueue.showActivities', String(newValue));
    }
  };

  // Handle clicking a calendar day - switch to list view with specific date filter
  const handleCalendarDayClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setSpecificDate(dateStr ?? null);
    setActiveFilter('specific');
    setViewMode('list');
  };

  // Clear the specific date filter
  const clearSpecificDateFilter = () => {
    setSpecificDate(null);
    setActiveFilter('today');
  };

  // Calendar Helpers
  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getWeekDays = (anchorDate: Date) => {
    const days = [];
    const startOfWeek = new Date(anchorDate);
    startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay()); // Sunday as start

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const changeCalendarDate = (offset: number) => {
    const newDate = new Date(currentDate);
    if (calendarMode === 'month') {
      newDate.setMonth(newDate.getMonth() + offset);
      newDate.setDate(1); // Set to 1st to avoid skipping months with fewer days
    } else {
      newDate.setDate(newDate.getDate() + (offset * 7));
    }
    setCurrentDate(newDate);
  };

  const getTasksForDay = (date: Date) => {
    const isoParts = date.toISOString().split('T');
    const dateStr = isoParts[0] ?? '';
    return allScheduledTasks.filter(t => t.nextTaskDate?.startsWith(dateStr));
  };

  const confirmDeleteTask = (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(leadId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteTask = () => {
    if (!taskToDelete) return;

    const lead = allScheduledTasks.find(l => l.id === taskToDelete);
    if (!lead) return;

    // Clear nextTaskDate to remove from queue
    const updatedLead: Lead = {
      ...lead,
      nextTaskDate: undefined
    };

    onUpdateLead(updatedLead);
    showToast('Task removed from queue', 'success');
  };

  const openRescheduleModal = (task: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToReschedule(task);
    setRescheduleModalOpen(true);
  };

  const handleReschedule = (newDate: Date) => {
    if (!taskToReschedule) return;

    // Update lead with new date, preserving strategy progress
    const updatedLead: Lead = {
      ...taskToReschedule,
      nextTaskDate: newDate.toISOString(),
    };

    onUpdateLead(updatedLead);
    onAddActivity(
      taskToReschedule.id,
      `Task rescheduled to ${newDate.toLocaleDateString()}`,
      'Rescheduled from task queue',
      false,
      undefined,
      'outbound'
    );
    showToast(`Task rescheduled to ${newDate.toLocaleDateString()}`, 'success');
    setTaskToReschedule(null);
    setRescheduleModalOpen(false);
  };


  // ConfirmModal must be rendered before any early returns
  const deleteModal = (
    <ConfirmModal
      isOpen={deleteConfirmOpen}
      onClose={() => setDeleteConfirmOpen(false)}
      onConfirm={handleDeleteTask}
      title="Remove Task?"
      message="This will remove this task from your queue. The lead will remain in your pipeline but won't satisfy the strategy step until scheduled again."
      confirmLabel="Remove Task"
      variant="warning"
    />
  );

  const rescheduleModal = (
    <RescheduleModal
      isOpen={rescheduleModalOpen}
      leadName={taskToReschedule?.companyName || ''}
      currentDate={taskToReschedule?.nextTaskDate}
      onClose={() => {
        setRescheduleModalOpen(false);
        setTaskToReschedule(null);
      }}
      onReschedule={handleReschedule}
    />
  );

  // Handler for call outcome from CallProcessingPanel
  const handleCallOutcome = (outcome: CallOutcome, notes: string, durationSeconds: number) => {
    if (!currentLead) return;

    const platform: Activity['platform'] = 'call';
    const isFirstOutreach = currentLead.currentStepIndex === 0;

    // Determine next action based on outcome
    if (outcome === 'connected') {
      // Connected - advance to next step
      if (strategy && step) {
        const nextStepIndex = currentLead.currentStepIndex + 1;
        const isLastStep = nextStepIndex >= strategy.steps.length;

        let nextTaskDate: string | undefined = undefined;
        if (!isLastStep) {
          const nextStep = strategy.steps[nextStepIndex];
          if (nextStep) {
            const today = new Date();
            today.setDate(today.getDate() + (nextStep.dayOffset - step.dayOffset));
            nextTaskDate = today.toISOString();
          }
        }

        const updatedLead: Lead = {
          ...currentLead,
          currentStepIndex: nextStepIndex,
          nextTaskDate: nextTaskDate,
          status: isLastStep ? 'replied' : 'in_progress'
        };

        onUpdateLead(updatedLead);
        onAddActivity(currentLead.id, `Call connected (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`, notes, isFirstOutreach, platform);
      } else {
        // Manual task - just clear it
        const updatedLead: Lead = { ...currentLead, nextTaskDate: undefined, status: 'in_progress' };
        onUpdateLead(updatedLead);
        onAddActivity(currentLead.id, `Call completed`, notes, false, platform);
      }
    } else if (outcome === 'voicemail' || outcome === 'no_answer' || outcome === 'busy') {
      // Reschedule for tomorrow (same step)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const updatedLead: Lead = {
        ...currentLead,
        nextTaskDate: tomorrow.toISOString(),
        status: 'in_progress'
      };

      onUpdateLead(updatedLead);
      onAddActivity(currentLead.id, `Call: ${outcome.replace('_', ' ')}`, notes, false, platform);
    } else if (outcome === 'wrong_number') {
      // Clear phone and remove from queue
      const updatedLead: Lead = {
        ...currentLead,
        phone: undefined,
        nextTaskDate: undefined,
        status: 'in_progress'
      };

      onUpdateLead(updatedLead);
      onAddActivity(currentLead.id, `Wrong number - phone cleared`, notes, false, platform);
    }

    // Auto-advance logic (same as handleCompleteTask)
    const tasksToUse = isSessionMode ? sessionTasks : filteredTasks;
    const currentIndex = tasksToUse.findIndex(t => t.id === currentLead.id);
    const nextTask = tasksToUse[currentIndex + 1];

    if (nextTask) {
      setProcessLeadId(nextTask.id);
      showToast('Call logged - moving to next task', 'success');
    } else {
      if (isSessionMode) {
        showToast('All session tasks complete!', 'success');
        setIsSessionMode(false);
      } else {
        showToast('Call logged', 'success');
      }
      setProcessLeadId(null);
      setViewMode('list');
    }
  };

  // Handler for skipping call task
  const handleCallSkip = () => {
    const tasksToUse = isSessionMode ? sessionTasks : filteredTasks;
    const currentIndex = tasksToUse.findIndex(t => t.id === currentLead?.id);
    const nextTask = tasksToUse[currentIndex + 1];

    if (nextTask) {
      setProcessLeadId(nextTask.id);
      showToast('Skipped - moving to next task', 'info');
    } else {
      if (isSessionMode) {
        showToast('End of session', 'info');
        setIsSessionMode(false);
      }
      setProcessLeadId(null);
      setViewMode('list');
    }
  };

  if (viewMode === 'processing' && currentLead) {
    // Fallback for manual tasks or missing strategy
    const hasStrategy = !!strategy && !!step;
    const displayAction = hasStrategy ? step!.action : 'manual';
    const displayActionLabel = hasStrategy ? step!.action.replace('_', ' ') : 'Manual Task';
    const displayStrategyName = strategy?.name || 'Manual';
    const totalSteps = strategy?.steps.length || 1;
    const progressPercent = strategy ? ((currentLead.currentStepIndex + 1) / totalSteps) * 100 : 100;

    // Check if this is a call task
    const isCallTask = hasStrategy && step!.action === 'call';
    // Check if this is an email task
    const isEmailTask = hasStrategy && step!.action === 'send_email';

    // Reusable processing header component
    const ProcessingHeader = () => (
      <div className="space-y-3">
        {/* Main header row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setViewMode('list'); setIsSessionMode(false); }}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <List size={18} /> {isSessionMode ? 'End Session' : 'Back'}
          </button>

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevTask}
              disabled={!canGoPrev}
              className={`p-2 rounded-xl border transition-all ${
                canGoPrev
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200'
                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title="Previous task"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 shadow-sm min-w-[100px] text-center">
              {isSessionMode ? (
                <span className="text-indigo-600">
                  {currentTaskIndex + 1} / {tasksToNavigate.length}
                </span>
              ) : (
                <span>Task {currentTaskIndex + 1} of {tasksToNavigate.length}</span>
              )}
            </div>

            <button
              onClick={handleNextTask}
              disabled={!canGoNext}
              className={`p-2 rounded-xl border transition-all ${
                canGoNext
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200'
                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title="Next task"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View Lead button */}
          <button
            onClick={() => onSelectLead(currentLead.id)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <User size={14} /> Lead
          </button>
        </div>

        {/* Session progress bar (only in session mode) */}
        {isSessionMode && (
          <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentTaskIndex + 1) / tasksToNavigate.length) * 100}%` }}
            />
          </div>
        )}
      </div>
    );

    // Multi-task progress indicator for current day
    const hasMultipleTasks = currentTaskGroup && currentTaskGroup.totalStepsToday > 1;

    // Reusable strategy badge with progress
    const strategyColorStyles = getStrategyColor(strategy?.color);
    const StrategyBadge = () => (
      <div className="mb-4 text-center space-y-3">
        <span className={`${strategyColorStyles.bg} ${strategyColorStyles.text} px-3 py-1 rounded-lg text-[10px] font-black uppercase`}>
          {displayStrategyName}
        </span>

        {/* Multi-task day progress */}
        {hasMultipleTasks && currentTaskGroup && (
          <div className="flex items-center justify-center gap-2">
            {currentTaskGroup.pendingSteps.map(({ step: s, index, completed }) => (
              <button
                key={index}
                onClick={() => setProcessStepIndex(index)}
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all border-2
                  ${completed
                    ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                    : index === activeStepIndex
                      ? 'bg-indigo-100 text-indigo-600 border-indigo-400 ring-2 ring-indigo-200'
                      : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                  }
                `}
                title={completed ? 'Completed' : s.action.replace('_', ' ')}
              >
                {completed ? <Check size={16} /> : ACTION_ICONS[s.action]}
              </button>
            ))}
          </div>
        )}

        {hasMultipleTasks && currentTaskGroup && (
          <div className="text-xs text-slate-500">
            {currentTaskGroup.completedStepsToday} of {currentTaskGroup.totalStepsToday} tasks done today
          </div>
        )}

        {hasStrategy && !hasMultipleTasks && (
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-slate-400">
              Step {currentLead.currentStepIndex + 1} of {totalSteps}
            </span>
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );

    // Reusable recent activities section
    const RecentActivitiesSection = () => {
      if (leadTimeline.length === 0 && !timelineLoading) return null;

      return (
        <div className="mb-4">
          <button
            onClick={toggleActivities}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors w-full"
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${showActivities ? 'rotate-90' : ''}`}
            />
            <History size={14} />
            <span className="font-medium">Recent Activity</span>
            <span className="text-slate-400">({leadTimeline.length})</span>
          </button>

          {showActivities && (
            <div className="mt-2 space-y-1.5 pl-6 border-l-2 border-slate-100">
              {timelineLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  Loading...
                </div>
              ) : (
                leadTimeline.slice(0, 5).map((item: TimelineItem) => (
                  <div key={item.id} className="text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-medium">
                      {item.type === 'call' ? `Call: ${item.outcome || 'completed'}` : item.action}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    };

    // Session sidebar component
    const SessionSidebar = () => {
      if (!isSessionMode) return null;

      return (
        <div className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 shadow-lg z-40 transition-all duration-300 ${
          showSessionSidebar ? 'w-64' : 'w-0'
        } overflow-hidden`}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Session Tasks</h3>
              <button
                onClick={() => setShowSessionSidebar(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {tasksToNavigate.map((task, index) => {
                const taskStrategy = strategies.find(s => s.id === task.strategyId);
                const isActive = task.id === currentLead.id;

                return (
                  <button
                    key={task.id}
                    onClick={() => handleJumpToTask(task.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                          {task.companyName}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {taskStrategy?.name || 'Manual'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    // Sidebar toggle button (when sidebar is hidden)
    const SidebarToggle = () => {
      if (!isSessionMode || showSessionSidebar) return null;

      return (
        <button
          onClick={() => setShowSessionSidebar(true)}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-40 bg-white border border-slate-200 shadow-lg p-2 rounded-xl hover:bg-slate-50 transition-all"
          title="Show task list"
        >
          <Menu size={18} className="text-slate-600" />
        </button>
      );
    };

    // If it's an email task, render EmailSendPanel
    if (isEmailTask) {
      // Get subject from template first line or use default
      const templateLines = (step?.template || '').split('\n');
      const emailSubject = templateLines[0]?.startsWith('Subject:')
        ? templateLines[0].replace('Subject:', '').trim()
        : `Following up - ${currentLead.companyName}`;
      const emailBody = templateLines[0]?.startsWith('Subject:')
        ? templateLines.slice(1).join('\n').trim()
        : step?.template || '';

      const displayEmailMessage = message || emailBody || currentLead.nextTaskNote || '';

      return (
        <>
          {deleteModal}
          {rescheduleModal}
          <SessionSidebar />
          <SidebarToggle />
          <div className={`max-w-xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300 ${isSessionMode && showSessionSidebar ? 'ml-64' : ''}`}>
            <ProcessingHeader />

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl animate-in slide-in-from-bottom-8 duration-500">
              <StrategyBadge />

              {/* Lead info */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-slate-900">{currentLead.companyName}</h3>
                {currentLead.contactName && (
                  <p className="text-slate-500 font-medium">{currentLead.contactName}</p>
                )}
              </div>

              {/* Recent activities */}
              <RecentActivitiesSection />

              {/* Message preview with personalization */}
              {displayEmailMessage && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Message</span>
                    <button
                      onClick={handlePersonalize}
                      disabled={personalizing}
                      className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:text-indigo-700"
                    >
                      {personalizing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      {personalizing ? 'Personalizing...' : 'Personalize'}
                    </button>
                  </div>
                  <textarea
                    value={displayEmailMessage}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 p-4 text-sm bg-slate-50 rounded-2xl border border-slate-200 resize-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              )}

              <EmailSendPanel
                lead={currentLead}
                message={displayEmailMessage}
                subject={emailSubject
                  .replace('{companyName}', currentLead.companyName || '')
                  .replace('{contactName}', currentLead.contactName || '')}
                onSend={() => {
                  const platform = 'email';
                  const isFirstOutreach = currentLead.currentStepIndex === 0;
                  onAddActivity(
                    currentLead.id,
                    `Task completed: send_email`,
                    displayEmailMessage.substring(0, 200),
                    isFirstOutreach,
                    platform
                  );
                }}
                onComplete={handleCompleteTask}
              />
            </div>
          </div>
        </>
      );
    }

    // If it's a call task, render CallProcessingPanel
    if (isCallTask) {
      return (
        <>
          {deleteModal}
          {rescheduleModal}
          <SessionSidebar />
          <SidebarToggle />
          <div className={`max-w-xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300 ${isSessionMode && showSessionSidebar ? 'ml-64' : ''}`}>
            <ProcessingHeader />

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl animate-in slide-in-from-bottom-8 duration-500">
              <StrategyBadge />

              {/* Recent activities */}
              <RecentActivitiesSection />

              <CallProcessingPanel
                lead={currentLead}
                script={step?.script}
                template={step?.template}
                onOutcome={handleCallOutcome}
                onSkip={handleCallSkip}
              />
            </div>
          </div>
        </>
      );
    }

    // Fallback template message for non-call tasks (DMs, manual tasks, etc.)
    const displayMessage = message || currentLead.nextTaskNote || '';

    return (
      <>
        {deleteModal}
        {rescheduleModal}
        <SessionSidebar />
        <SidebarToggle />
        <div className={`max-w-xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300 ${isSessionMode && showSessionSidebar ? 'ml-64' : ''}`}>
          <ProcessingHeader />

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl space-y-8 animate-in slide-in-from-bottom-8 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900 leading-tight">{currentLead.companyName}</h2>
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                <span className={`${strategyColorStyles.bg} ${strategyColorStyles.text} px-3 py-1 rounded-lg text-[10px] font-black uppercase`}>{displayStrategyName}</span>
                <span className="flex items-center gap-1 uppercase tracking-wider font-bold text-[10px]">
                  {ACTION_ICONS[displayAction] || <CheckSquare size={14} />}
                  {displayActionLabel}
                </span>
              </div>
              {/* Strategy progress */}
              {hasStrategy && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-xs text-slate-400">
                    Step {currentLead.currentStepIndex + 1} of {totalSteps}
                  </span>
                  <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recent activities */}
            <RecentActivitiesSection />

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Draft</span>
                {hasStrategy && (
                  <button onClick={handlePersonalize} disabled={personalizing} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 disabled:opacity-50">
                    {personalizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI Personalize
                  </button>
                )}
              </div>
              <div className="relative">
                <textarea
                  value={displayMessage}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={currentLead.nextTaskNote ? "Note: " + currentLead.nextTaskNote : "Enter message or notes..."}
                  className="w-full min-h-[160px] p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 font-medium resize-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none leading-relaxed transition-all"
                />
                <button onClick={handleCopy} className="absolute bottom-4 right-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 active:scale-95 transition-all">
                  {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Render actions only if defined in step, otherwise show generic 'Mark Complete' */}
              {hasStrategy ? (
                <>
                  {step!.action === 'send_dm' && <ActionButton icon={<Instagram />} label="Open Instagram" href={currentLead.instagramUrl} color="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white" />}
                  {step!.action === 'linkedin_dm' && <ActionButton icon={<Linkedin />} label="Open LinkedIn" href={currentLead.linkedinUrl} color="bg-[#0A66C2] text-white" />}
                  {step!.action === 'send_email' && <ActionButton icon={<Mail />} label="Open Email" href={currentLead.email ? `mailto:${currentLead.email}?subject=Inquiry&body=${encodeURIComponent(displayMessage)}` : undefined} color="bg-[#EA4335] text-white" />}
                  {step!.action === 'fb_message' && <ActionButton icon={<Facebook />} label="Open Facebook" href={currentLead.facebookUrl} color="bg-[#1877F2] text-white" />}
                </>
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-500 text-sm font-medium">
                  {currentLead.nextTaskNote || "No specific action defined. Check notes."}
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-4">
              <button onClick={() => {
                if (isSessionMode) {
                  const nextTask = tasksToNavigate[currentTaskIndex + 1];
                  if (nextTask) setProcessLeadId(nextTask.id);
                  else { setIsSessionMode(false); setViewMode('list'); }
                } else { setViewMode('list'); }
              }} className="flex-1 py-5 rounded-[1.5rem] bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2 border border-slate-200">
                {isSessionMode ? 'Skip' : 'Skip for now'}
              </button>
              <button onClick={handleCompleteTask} className="flex-[2] py-5 rounded-[1.5rem] bg-emerald-500 text-white font-black hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-2">
                <Check size={20} strokeWidth={3} /> {isSessionMode ? 'Next Task' : 'Mark Done'}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // --- LIST FILTER VIEW ---
  if (viewMode === 'list') {
    return (
      <>
      {deleteModal}
      {rescheduleModal}
      <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Mission Control</h2>
            <p className="text-slate-500 font-medium text-lg">Let's crush your to-do list.</p>
          </div>

          <div className="flex items-center gap-4">
            {sessionTasks.length > 0 && (
              <button
                onClick={startSession}
                className="bg-slate-900 hover:bg-slate-800 text-white font-black px-6 py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center gap-2 text-xs uppercase tracking-widest animate-pulse"
              >
                <PlayCircle size={18} /> Start Session ({sessionTasks.length})
              </button>
            )}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-sm">
              {(['overdue', 'today', 'upcoming'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === filter
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                  {filter} <span className="opacity-60 ml-1">({counts[filter]})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('calendar')}
              className="p-3 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-xl transition-all shadow-sm"
              title="Calendar View"
            >
              <CalendarIcon size={20} />
            </button>
          </div>
        </header>

        {/* Specific date filter chip (when viewing from calendar) */}
        {activeFilter === 'specific' && specificDate && (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium">
              <CalendarIcon size={14} />
              Showing tasks for {new Date(specificDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              <button
                onClick={clearSpecificDateFilter}
                className="ml-1 p-0.5 hover:bg-indigo-100 rounded-full transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Task Type Filter */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
          <Filter size={16} className="text-slate-400 ml-2" />
          {([
            { key: 'all', label: 'All Tasks', icon: <CheckSquare size={14} /> },
            { key: 'dm', label: 'DMs', icon: <MessageSquare size={14} /> },
            { key: 'call', label: 'Calls', icon: <PhoneCall size={14} /> },
            { key: 'email', label: 'Emails', icon: <Mail size={14} /> },
          ] as const).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTaskTypeFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                taskTypeFilter === key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {icon}
              {label}
              <span className={`ml-1 ${taskTypeFilter === key ? 'text-indigo-500' : 'text-slate-400'}`}>
                ({taskTypeCounts[key]})
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100">
          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const taskGroup = createTaskGroup(task, strategies);
                const taskStrategy = taskGroup.strategy;
                const hasMultipleTasks = taskGroup.totalStepsToday > 1;
                const pendingCount = taskGroup.totalStepsToday - taskGroup.completedStepsToday;
                const taskStrategyColor = getStrategyColor(taskStrategy?.color);

                // Calculate simple status text
                const isOverdue = new Date(task.nextTaskDate!).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
                const isToday = new Date(task.nextTaskDate!).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

                return (
                  <div
                    key={task.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    {/* Main task row */}
                    <div
                      onClick={() => startProcessingTask(task.id)}
                      className="p-6 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-6">
                        {hasMultipleTasks ? (
                          // Multi-task icon: stacked icons
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <div className="flex -space-x-2">
                              {taskGroup.pendingSteps.slice(0, 3).map(({ step, completed }, idx) => (
                                <div
                                  key={idx}
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 border-white ${
                                    completed
                                      ? 'bg-emerald-100 text-emerald-600'
                                      : getPlatformColor(step.action)
                                  }`}
                                  style={{ zIndex: 3 - idx }}
                                >
                                  {completed ? <Check size={14} /> : ACTION_ICONS[step.action]}
                                </div>
                              ))}
                            </div>
                            {taskGroup.totalStepsToday > 3 && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-700 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                                +{taskGroup.totalStepsToday - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Single task icon
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
                            taskGroup.pendingSteps[0]?.completed
                              ? 'bg-emerald-100 text-emerald-600 border-emerald-200'
                              : getPlatformColor(taskGroup.pendingSteps[0]?.step.action)
                          }`}>
                            {taskGroup.pendingSteps[0]?.completed
                              ? <Check size={20} />
                              : taskGroup.pendingSteps[0]
                                ? ACTION_ICONS[taskGroup.pendingSteps[0].step.action]
                                : <CheckSquare size={20} />}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">{task.companyName}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            {hasMultipleTasks ? (
                              <span className={`text-[10px] font-black uppercase tracking-widest ${taskStrategyColor.text} ${taskStrategyColor.bg} px-2 py-0.5 rounded`}>
                                {pendingCount} task{pendingCount !== 1 ? 's' : ''} today
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                Step {task.currentStepIndex + 1}
                              </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${taskStrategyColor.text}`}>{taskStrategy?.name}</span>
                          </div>
                          {/* Progress bar for multi-task */}
                          {hasMultipleTasks && (
                            <div className="mt-2 w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all"
                                style={{ width: `${(taskGroup.completedStepsToday / taskGroup.totalStepsToday) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div className="hidden md:block">
                          <p className={`text-xs font-black uppercase tracking-widest ${isOverdue ? 'text-rose-500' : isToday ? 'text-indigo-500' : 'text-slate-400'
                            }`}>
                            {isOverdue ? 'Overdue' : isToday ? 'Today' : 'Upcoming'}
                          </p>
                          <p className="text-xs font-medium text-slate-400 mt-1">
                            {new Date(task.nextTaskDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        <div className="flex bg-slate-100 rounded-xl p-1">
                          <button
                            onClick={(e) => openRescheduleModal(task, e)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-white hover:shadow-sm transition-all"
                            title="Reschedule task"
                          >
                            <Clock size={16} />
                          </button>
                          <button
                            onClick={(e) => confirmDeleteTask(task.id, e)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white hover:shadow-sm transition-all"
                            title="Remove from queue"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:bg-white hover:shadow-sm transition-all">
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-32 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Sparkles size={40} className="text-indigo-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {activeFilter === 'overdue' ? 'No Overdue Tasks' :
                  activeFilter === 'today' ? 'All Caught Up' : 'No Upcoming Tasks'}
              </h3>
              <p className="text-slate-500 font-medium">You're on top of your game.</p>
            </div>
          )}
        </div>
      </div>
      </>
    );
  }

  // --- CALENDAR VIEW ---
  if (viewMode === 'calendar') {
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    // Generate days based on mode
    let calendarDays: { date: Date | null, dayNum: number | null }[] = [];

    if (calendarMode === 'month') {
      const daysCount = daysInMonth(currentDate);
      const firstDay = firstDayOfMonth(currentDate);
      calendarDays = Array.from({ length: 42 }, (_, i) => {
        const dayNum = i - firstDay + 1;
        return dayNum > 0 && dayNum <= daysCount ?
          { date: new Date(year, currentDate.getMonth(), dayNum), dayNum } :
          { date: null, dayNum: null };
      });
    } else {
      // Week view
      const weekDays = getWeekDays(currentDate);
      calendarDays = weekDays.map(d => ({ date: d, dayNum: d.getDate() }));
    }

    return (
      <>
      {deleteModal}
      {rescheduleModal}
      <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Task Calendar</h2>
            <div className="flex items-center gap-4">
              <p className="text-slate-500 font-medium">Tracking {allScheduledTasks.length} total scheduled actions.</p>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode('list')} className="px-4 py-2 text-slate-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <List size={14} /> List View
                </button>
                <button onClick={() => setViewMode('calendar')} className="px-4 py-2 bg-white text-indigo-600 rounded-lg shadow-sm font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon size={14} /> Calendar
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
              <button
                onClick={() => setCalendarMode('week')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarMode === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarMode('month')}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${calendarMode === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                Month
              </button>
            </div>
            <div className="flex items-center gap-4 bg-white border border-slate-200 p-2 rounded-2xl shadow-sm">
              <button onClick={() => changeCalendarDate(-1)} className="p-3 hover:bg-slate-50 rounded-xl transition-all"><ChevronLeft size={20} /></button>
              <h3 className="font-black text-slate-900 px-4 uppercase tracking-widest text-xs min-w-[150px] text-center">
                {calendarMode === 'month' ? `${monthName} ${year}` :
                  calendarMode === 'week' ? `Week of ${getWeekDays(currentDate)[0]?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? ''}` : ''}
              </h3>
              <button onClick={() => changeCalendarDate(1)} className="p-3 hover:bg-slate-50 rounded-xl transition-all"><ChevronRight size={20} /></button>
            </div>
          </div>
        </header>

        <div className="bg-white border border-slate-200 rounded-[3rem] shadow-xl overflow-hidden p-1">
          <div className={`grid ${calendarMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'} border-b border-slate-100 bg-slate-50/50`}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-0">{day}</div>
            ))}
          </div>
          <div className={`grid ${calendarMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'} border-slate-100`}>
            {calendarDays.map((dayItem, idx) => {
              const { dayNum, date } = dayItem;
              const dayTasks = date ? getTasksForDay(date) : [];
              const isToday = date && date.getDate() === new Date().getDate() && date.getMonth() === new Date().getMonth() && date.getFullYear() === new Date().getFullYear();

              if (!date && calendarMode === 'week') return null;

              // Group tasks by Strategy with color info
              const tasksByStrategy = dayTasks.reduce((acc, task) => {
                const strat = strategies.find(s => s.id === task.strategyId);
                const strategyName = strat?.name || 'Manual Tasks';
                const stratColor = getStrategyColor(strat?.color);
                if (!acc[strategyName]) acc[strategyName] = { count: 0, color: stratColor };
                acc[strategyName].count++;
                return acc;
              }, {} as Record<string, { count: number; color: ReturnType<typeof getStrategyColor> }>);

              return (
                <div
                  key={idx}
                  onClick={() => date && dayTasks.length > 0 && handleCalendarDayClick(date)}
                  className={`min-h-[140px] p-4 border-r border-b border-slate-50 last:border-r-0 group transition-all ${
                    date ? (dayTasks.length > 0 ? 'cursor-pointer hover:bg-indigo-50/50' : 'hover:bg-slate-50/50') : 'bg-slate-50/20'
                  }`}
                >
                  {date && (
                    <div className="flex flex-col h-full">
                      <span className={`text-xs font-black mb-3 inline-flex items-center justify-center w-8 h-8 rounded-xl ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 group-hover:text-slate-900 transition-colors'}`}>
                        {dayNum}
                      </span>
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-hide max-h-[300px]">
                        {Object.entries(tasksByStrategy).map(([name, { count, color }]) => (
                          <div key={name} className={`px-3 py-2 ${color.bg} ${color.text} rounded-lg text-[9px] font-black uppercase tracking-wider ${color.border} border shadow-sm`}>
                            {name} <span className="opacity-60 ml-1">({count})</span>
                          </div>
                        ))}
                        {dayTasks.length === 0 && (
                          <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1 h-1 bg-slate-200 rounded-full mx-1"></div>
                            <div className="w-1 h-1 bg-slate-200 rounded-full mx-1"></div>
                            <div className="w-1 h-1 bg-slate-200 rounded-full mx-1"></div>
                          </div>
                        )}
                        {dayTasks.length > 0 && (
                          <div className="text-[9px] text-indigo-500 font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-center">
                            Click to view →
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </>
    );
  }

  // Fallback - should never reach here
  return null;
};

const ActionButton: React.FC<{ icon: React.ReactNode, label: string, href?: string, color: string }> = ({ icon, label, href, color }) => {
  if (!href) return <div className="flex items-center justify-center gap-3 w-full py-5 rounded-[1.5rem] bg-slate-50 text-slate-300 font-bold cursor-not-allowed border border-slate-100">{icon}<span>No Link Found</span></div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`flex items-center justify-center gap-3 w-full py-5 rounded-[1.5rem] ${color} font-bold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]`}>
      {icon}<span>{label}</span><ExternalLink size={16} className="opacity-50" />
    </a>
  );
};

export default React.memo(TaskQueue);
