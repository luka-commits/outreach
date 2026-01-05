
import React, { useState, useRef, useCallback } from 'react';
import { Plus, Trash2, Edit3, Save, Zap, ChevronUp, ChevronDown, ChevronRight, Users, MessageCircle, TrendingUp, Lock, Puzzle, Reply, Clock } from 'lucide-react';
import { Strategy, StrategyStep, TaskAction, StrategyPerformance, StrategyColor } from '../types';
import { ACTION_ICONS } from '../constants';
import { channelColors, strategyColors } from '../lib/designTokens';
import { getStrategyColor } from '../utils/styles';
import { Button, IconButton } from './ui/Button';
import { EmptyStrategies } from './ui/EmptyState';
import { ProBadge } from './ui/ProBadge';
import { VariableInsertPanel } from './ui/VariableInsertPanel';
import { useStrategyPerformance } from '../hooks/queries/useStrategyPerformanceQuery';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from './Toast';
import { useAuth } from '../hooks/useAuth';
import { useCustomFieldDefinitionsQuery } from '../hooks/queries/useCustomFieldsQuery';

interface StrategyManagerProps {
  strategies: Strategy[];
  onAddStrategy: (strategy: Strategy) => Promise<void>;
  onUpdateStrategy: (strategy: Strategy) => Promise<void>;
  onDeleteStrategy: (id: string) => Promise<void>;
  onReorderStrategies: (updates: Array<{ id: string; position: number }>) => Promise<void>;
  loading?: boolean;
}

// Action type to display label mapping
const ACTION_LABELS: Record<TaskAction, string> = {
  send_dm: 'DM',
  send_email: 'Email',
  call: 'Call',
  fb_message: 'FB',
  linkedin_dm: 'LinkedIn',
  manual: 'Manual',
  walk_in: 'Walk-in'
};

// Map action to channel color key
const ACTION_TO_CHANNEL: Record<TaskAction, keyof typeof channelColors> = {
  send_dm: 'instagram',
  send_email: 'email',
  call: 'call',
  fb_message: 'facebook',
  linkedin_dm: 'linkedin',
  manual: 'email', // fallback
  walk_in: 'walk_in'
};

// Get response rate color classes
const getResponseRateColor = (rate: number): string => {
  if (rate >= 20) return 'bg-emerald-50 text-emerald-600';
  if (rate >= 10) return 'bg-amber-50 text-amber-600';
  return 'bg-slate-100 text-slate-500';
};

// Helper to group steps by dayOffset
const groupStepsByDay = (steps: StrategyStep[]): Map<number, Array<{ step: StrategyStep; originalIndex: number }>> => {
  const groups = new Map<number, Array<{ step: StrategyStep; originalIndex: number }>>();
  steps.forEach((step, index) => {
    const daySteps = groups.get(step.dayOffset) || [];
    daySteps.push({ step, originalIndex: index });
    groups.set(step.dayOffset, daySteps);
  });
  return groups;
};

// Mini timeline preview component for card view - now shows day groups
const StepTimeline: React.FC<{ steps: StrategyStep[] }> = ({ steps }) => {
  const dayGroups = groupStepsByDay(steps);
  const sortedDays = Array.from(dayGroups.entries()).sort(([a], [b]) => a - b);
  const maxDaysVisible = 5;
  const visibleDays = sortedDays.slice(0, maxDaysVisible);
  const remainingDays = sortedDays.length - maxDaysVisible;

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {visibleDays.map(([dayOffset, daySteps], groupIdx) => (
        <React.Fragment key={dayOffset}>
          {groupIdx > 0 && <div className="w-4 h-px bg-slate-200 flex-shrink-0" />}
          <div className="flex flex-col items-center flex-shrink-0">
            {daySteps.length === 1 && daySteps[0] ? (
              // Single task on this day - show as before
              (() => {
                const firstStep = daySteps[0];
                const colors = channelColors[ACTION_TO_CHANNEL[firstStep.step.action]];
                return (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${colors.bg} ${colors.text} ${colors.border} border`}>
                    {ACTION_ICONS[firstStep.step.action] ? React.cloneElement(ACTION_ICONS[firstStep.step.action] as React.ReactElement<{ size?: number }>, { size: 14 }) : firstStep.originalIndex + 1}
                  </div>
                );
              })()
            ) : daySteps.length > 1 ? (
              // Multiple tasks on this day - show stacked
              <div className="flex -space-x-1">
                {daySteps.slice(0, 3).map(({ step }, idx) => {
                  const colors = channelColors[ACTION_TO_CHANNEL[step.action]];
                  return (
                    <div
                      key={idx}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${colors.bg} ${colors.text} ${colors.border} border-2 border-white`}
                      style={{ zIndex: 3 - idx }}
                    >
                      {ACTION_ICONS[step.action] ? React.cloneElement(ACTION_ICONS[step.action] as React.ReactElement<{ size?: number }>, { size: 12 }) : idx + 1}
                    </div>
                  );
                })}
                {daySteps.length > 3 && (
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-500 border-2 border-white">
                    +{daySteps.length - 3}
                  </div>
                )}
              </div>
            ) : null}
            <span className="text-[10px] text-slate-400 mt-1">
              Day {dayOffset}
              {daySteps.length > 1 && <span className="text-slate-300"> ({daySteps.length})</span>}
            </span>
          </div>
        </React.Fragment>
      ))}
      {remainingDays > 0 && (
        <>
          <div className="w-4 h-px bg-slate-200 flex-shrink-0" />
          <div className="px-2 py-1 bg-slate-100 rounded-full text-[10px] text-slate-500 font-medium flex-shrink-0">
            +{remainingDays} more days
          </div>
        </>
      )}
    </div>
  );
};

// Interactive timeline for edit mode - grouped by day
const EditableTimeline: React.FC<{
  steps: StrategyStep[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}> = ({ steps, selectedIndex, onSelect }) => {
  const dayGroups = groupStepsByDay(steps);
  const sortedDays = Array.from(dayGroups.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="flex items-start gap-3 overflow-x-auto py-4 px-2">
      {sortedDays.map(([dayOffset, daySteps], groupIdx) => (
        <React.Fragment key={dayOffset}>
          {groupIdx > 0 && (
            <div className="flex items-center flex-shrink-0 self-center">
              <div className="w-6 h-0.5 bg-slate-200" />
            </div>
          )}
          <div className="bg-slate-100/50 rounded-xl p-2 border border-slate-200/50 flex-shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 text-center tracking-wide">
              Day {dayOffset}
            </div>
            <div className="flex gap-1">
              {daySteps.map(({ step, originalIndex }) => {
                const channelKey = ACTION_TO_CHANNEL[step.action];
                const colors = channelColors[channelKey];
                const isSelected = originalIndex === selectedIndex;

                return (
                  <button
                    key={originalIndex}
                    type="button"
                    onClick={() => onSelect(originalIndex)}
                    className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-white ring-2 ring-blue-500 shadow-sm'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${colors.bg} ${colors.text} ${colors.border} border`}>
                      {ACTION_ICONS[step.action] ? React.cloneElement(ACTION_ICONS[step.action] as React.ReactElement<{ size?: number }>, { size: 16 }) : originalIndex + 1}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1">{ACTION_LABELS[step.action]}</span>
                  </button>
                );
              })}
            </div>
            {daySteps.length > 1 && (
              <div className="text-[9px] text-slate-400 text-center mt-1">
                {daySteps.length} tasks
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

// Metrics badges component
const StrategyMetrics: React.FC<{ performance?: StrategyPerformance }> = ({ performance }) => {
  if (!performance) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-full text-xs font-medium">
          No data yet
        </span>
      </div>
    );
  }

  const { leadsAssigned, leadsReplied, responseRate } = performance;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
        <Users size={12} />
        {leadsAssigned} {leadsAssigned === 1 ? 'lead' : 'leads'}
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
        <MessageCircle size={12} />
        {leadsReplied} replied
      </span>
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getResponseRateColor(responseRate)}`}>
        <TrendingUp size={12} />
        {responseRate.toFixed(0)}% response
      </span>
    </div>
  );
};

// Loading skeleton
const StrategySkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-lg p-6 animate-pulse">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="w-8 h-8 bg-slate-100 rounded-lg" />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <div className="h-6 bg-slate-100 rounded-full w-20" />
              <div className="h-6 bg-slate-100 rounded-full w-24" />
              <div className="h-6 bg-slate-100 rounded-full w-28" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const StrategyManager: React.FC<StrategyManagerProps> = ({ strategies, onAddStrategy, onUpdateStrategy, onDeleteStrategy, onReorderStrategies, loading }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Strategy | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [showVariablePanel, setShowVariablePanel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { user } = useAuth();
  const { data: customFieldDefinitions } = useCustomFieldDefinitionsQuery(user?.id);
  const { data: performanceData } = useStrategyPerformance();
  const { checkStrategyLimit, isPro, limits } = useSubscription();
  const { showToast } = useToast();

  // Check if user can create more strategies
  const canAddStrategy = checkStrategyLimit(strategies.length);

  // Create a map for quick performance lookup
  const performanceMap = React.useMemo(() => {
    const map = new Map<string, StrategyPerformance>();
    performanceData?.forEach(p => map.set(p.strategyId, p));
    return map;
  }, [performanceData]);

  const startEdit = (s: Strategy) => {
    setEditingId(s.id);
    setEditForm(JSON.parse(JSON.stringify(s)));
    setSelectedStepIndex(0);
  };

  const addNew = async () => {
    // Check strategy limit for free users
    if (!canAddStrategy) {
      showToast(
        `Free plan is limited to ${limits.maxStrategies} strategy. Upgrade to Pro for unlimited strategies.`,
        'error'
      );
      return;
    }

    const newS: Strategy = {
      id: crypto.randomUUID(),
      name: 'New Strategy',
      description: 'Enter a short description...',
      steps: [{ dayOffset: 0, action: 'send_dm', template: 'Hello {companyName}, ...' }],
      color: 'indigo'
    };

    try {
      setIsSaving(true);
      await onAddStrategy(newS);
      showToast('Strategy created', 'success');
      startEdit(newS);
    } catch (error) {
      showToast('Failed to create strategy', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const save = async () => {
    if (!editForm) return;

    try {
      setIsSaving(true);
      await onUpdateStrategy(editForm);
      showToast('Strategy saved', 'success');
      setEditingId(null);
      setEditForm(null);
      setSelectedStepIndex(0);
    } catch (error) {
      showToast('Failed to save strategy', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const cancel = () => {
    setEditingId(null);
    setEditForm(null);
    setSelectedStepIndex(0);
  };

  const remove = async (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      try {
        setIsSaving(true);
        await onDeleteStrategy(id);
        showToast('Strategy deleted', 'success');
      } catch (error) {
        showToast('Failed to delete strategy', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const moveStrategy = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= strategies.length) return;

    // Swap positions
    const updates = [
      { id: strategies[index]!.id, position: strategies[newIndex]!.position ?? newIndex },
      { id: strategies[newIndex]!.id, position: strategies[index]!.position ?? index },
    ];

    try {
      await onReorderStrategies(updates);
    } catch (error) {
      showToast('Failed to reorder strategies', 'error');
    }
  };

  const updateStep = useCallback((idx: number, field: keyof StrategyStep, value: StrategyStep[keyof StrategyStep]) => {
    setEditForm(prev => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      const existingStep = steps[idx];
      if (!existingStep) return prev;
      steps[idx] = { ...existingStep, [field]: value };
      return { ...prev, steps };
    });
  }, []);

  const addStep = () => {
    if (!editForm) return;
    const lastStep = editForm.steps[editForm.steps.length - 1];
    const newStep: StrategyStep = {
      dayOffset: (lastStep?.dayOffset || 0) + 3,
      action: 'send_dm',
      template: ''
    };
    setEditForm({
      ...editForm,
      steps: [...editForm.steps, newStep]
    });
    setSelectedStepIndex(editForm.steps.length);
  };

  const addStepToSameDay = () => {
    if (!editForm || selectedStepIndex < 0) return;
    const currentStep = editForm.steps[selectedStepIndex];
    if (!currentStep) return;

    const newStep: StrategyStep = {
      dayOffset: currentStep.dayOffset, // Same day as selected step
      action: 'send_dm',
      template: ''
    };

    // Insert after the current step
    const steps = [...editForm.steps];
    steps.splice(selectedStepIndex + 1, 0, newStep);
    setEditForm({ ...editForm, steps });
    setSelectedStepIndex(selectedStepIndex + 1);
  };

  const removeStep = (idx: number) => {
    if (!editForm || editForm.steps.length <= 1) return;
    const newSteps = editForm.steps.filter((_, i) => i !== idx);
    setEditForm({ ...editForm, steps: newSteps });
    setSelectedStepIndex(Math.min(selectedStepIndex, newSteps.length - 1));
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    if (!editForm) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= editForm.steps.length) return;

    const steps = [...editForm.steps];
    const temp = steps[idx];
    const swapStep = steps[newIdx];
    if (!temp || !swapStep) return;
    steps[idx] = swapStep;
    steps[newIdx] = temp;

    setEditForm({ ...editForm, steps });
    setSelectedStepIndex(newIdx);
  };

  // Insert a variable at the cursor position in the template textarea
  const handleInsertVariable = useCallback((variableKey: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea || !editForm) return;

    const { selectionStart, selectionEnd } = textarea;
    const currentValue = editForm.steps[selectedStepIndex]?.template || '';
    const variableText = `{${variableKey}}`;

    // Insert at cursor position
    const newValue =
      currentValue.slice(0, selectionStart) +
      variableText +
      currentValue.slice(selectionEnd);

    updateStep(selectedStepIndex, 'template', newValue);

    // Restore focus and set cursor after inserted text
    requestAnimationFrame(() => {
      textarea.focus();
      const newCursorPos = selectionStart + variableText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    });
  }, [editForm, selectedStepIndex, updateStep]);

  // Show loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-blue-600" /> Outreach Strategies
          </h2>
        </div>
        <StrategySkeleton />
      </div>
    );
  }

  // Show empty state
  if (strategies.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="text-blue-600" /> Outreach Strategies
          </h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg">
          <EmptyStrategies onCreateStrategy={addNew} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Zap className="text-blue-600" /> Outreach Strategies
        </h2>
        <div className="flex items-center gap-3">
          {!isPro && (
            <span className="text-sm text-gray-500">
              {strategies.length} / {limits.maxStrategies}
            </span>
          )}
          <Button
            onClick={addNew}
            icon={canAddStrategy ? <Plus size={18} /> : <Lock size={18} />}
            disabled={!canAddStrategy}
          >
            {canAddStrategy ? 'Add New Strategy' : 'Upgrade for More'}
          </Button>
          {!isPro && !canAddStrategy && <ProBadge />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {strategies.map((s, index) => {
          const isExpanded = expandedIds.has(s.id);
          return (
          <div key={s.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden transition-all shadow-sm hover:shadow-md">
            {editingId === s.id && editForm ? (
              // Edit Mode
              <div className="p-6 space-y-6">
                {/* Name, Description, and Color */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Strategy Name</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Description</label>
                    <input
                      value={editForm.description}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Strategy Color</label>
                  <div className="flex items-center gap-2">
                    {(Object.keys(strategyColors) as StrategyColor[]).map((colorKey) => {
                      const colorStyles = strategyColors[colorKey];
                      const isSelected = editForm.color === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color: colorKey })}
                          className={`w-8 h-8 rounded-full ${colorStyles.solid} transition-all ${
                            isSelected
                              ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                              : 'hover:scale-105 opacity-70 hover:opacity-100'
                          }`}
                          title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Reply Sequence Configuration */}
                <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Reply size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Reply Sequence</h4>
                        <p className="text-xs text-slate-500">Multi-step follow-up when lead replies</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(editForm.replySequence && editForm.replySequence.length > 0) || false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setEditForm({
                            ...editForm,
                            replySequence: enabled
                              ? [{ dayOffset: 0, action: 'send_dm', template: 'Thanks for getting back to me! I wanted to follow up on...' }]
                              : undefined
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {editForm.replySequence && editForm.replySequence.length > 0 && (
                    <div className="space-y-4 pt-2 border-t border-emerald-200/50">
                      <p className="text-xs text-slate-500">
                        When a lead replies, this sequence starts. All tasks use the same channel the lead replied from.
                        Day 0 = immediate, Day 1 = next day, etc.
                      </p>

                      {/* Reply Sequence Steps */}
                      <div className="space-y-3">
                        {editForm.replySequence.map((step, idx) => (
                          <div key={idx} className="bg-white rounded-lg border border-emerald-100 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center text-xs font-bold text-emerald-600">
                                  {idx + 1}
                                </div>
                                <span className="text-sm font-medium text-slate-700">
                                  {idx === 0 && step.dayOffset === 0 ? 'Immediate' : `Day ${step.dayOffset}`}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {editForm.replySequence && editForm.replySequence.length > 1 && (
                                  <IconButton
                                    icon={<Trash2 size={14} />}
                                    aria-label="Remove step"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const newSteps = editForm.replySequence?.filter((_, i) => i !== idx) || [];
                                      setEditForm({ ...editForm, replySequence: newSteps });
                                    }}
                                    className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                  />
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-xs text-slate-500">Day</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={step.dayOffset}
                                  onChange={(e) => {
                                    const newSteps = [...(editForm.replySequence || [])];
                                    const currentStep = newSteps[idx];
                                    if (currentStep) {
                                      newSteps[idx] = { ...currentStep, dayOffset: parseInt(e.target.value) || 0 };
                                      setEditForm({ ...editForm, replySequence: newSteps });
                                    }
                                  }}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs text-slate-500">Channel (from reply)</label>
                                <div className="p-2 bg-slate-100 border border-slate-200 rounded-md text-sm text-slate-500 flex items-center gap-1.5">
                                  <Reply size={12} />
                                  Same as reply
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">Template</label>
                              <textarea
                                value={step.template}
                                onChange={(e) => {
                                  const newSteps = [...(editForm.replySequence || [])];
                                  const currentStep = newSteps[idx];
                                  if (currentStep) {
                                    newSteps[idx] = { ...currentStep, template: e.target.value };
                                    setEditForm({ ...editForm, replySequence: newSteps });
                                  }
                                }}
                                placeholder="Follow-up message..."
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-sm min-h-[60px] resize-y focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Step Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const lastStep = editForm.replySequence?.[editForm.replySequence.length - 1];
                          const newStep: StrategyStep = {
                            dayOffset: (lastStep?.dayOffset || 0) + 2,
                            action: 'send_dm', // Will be overridden by reply channel
                            template: ''
                          };
                          setEditForm({
                            ...editForm,
                            replySequence: [...(editForm.replySequence || []), newStep]
                          });
                        }}
                        icon={<Plus size={14} />}
                        className="w-full justify-center border border-dashed border-emerald-300 text-emerald-600 hover:bg-emerald-50"
                      >
                        Add Follow-Up Step
                      </Button>
                    </div>
                  )}
                </div>

                {/* No-Reply Timeout Configuration */}
                <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Clock size={16} className="text-slate-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">No-Reply Timeout</h4>
                        <p className="text-xs text-slate-500">Auto-archive leads that finish without responding</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editForm.noReplyDelayDays !== undefined && editForm.noReplyDelayDays !== null}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setEditForm({
                            ...editForm,
                            noReplyDelayDays: enabled ? 7 : undefined  // Default 7 days
                          });
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-slate-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-600"></div>
                    </label>
                  </div>

                  {editForm.noReplyDelayDays !== undefined && editForm.noReplyDelayDays !== null && (
                    <div className="space-y-2 pt-2 border-t border-slate-200/50">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                        <Clock size={12} />
                        Days After Completion
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[2, 5, 7, 14].map((days) => (
                            <button
                              key={days}
                              type="button"
                              onClick={() => setEditForm({
                                ...editForm,
                                noReplyDelayDays: days
                              })}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                editForm.noReplyDelayDays === days
                                  ? 'bg-slate-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                              }`}
                            >
                              {days} days
                            </button>
                          ))}
                        </div>
                        <span className="text-xs text-slate-400">or</span>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={editForm.noReplyDelayDays || 7}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            noReplyDelayDays: parseInt(e.target.value) || 7
                          })}
                          className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-slate-500/20 focus:border-slate-400 outline-none"
                        />
                        <span className="text-xs text-slate-500">days</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        Leads that complete this strategy without replying will be automatically moved to "No Reply" status after this period.
                      </p>
                    </div>
                  )}
                </div>

                {/* Timeline Header */}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sequence Timeline
                  </h4>
                  <Button variant="ghost" size="sm" onClick={addStep} icon={<Plus size={16} />}>
                    Add Step
                  </Button>
                </div>

                {/* Visual Timeline */}
                <div className="bg-slate-50 rounded-xl border border-slate-100">
                  <EditableTimeline
                    steps={editForm.steps}
                    selectedIndex={selectedStepIndex}
                    onSelect={setSelectedStepIndex}
                  />
                </div>

                {/* Selected Step Editor */}
                {editForm.steps[selectedStepIndex] && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-700">
                          Step {selectedStepIndex + 1}
                        </span>
                        <span className="text-xs text-slate-400">
                          Day {editForm.steps[selectedStepIndex]?.dayOffset}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={addStepToSameDay}
                          icon={<Plus size={14} />}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          Add to this day
                        </Button>
                        <div className="w-px h-4 bg-slate-200 mx-1" />
                        <IconButton
                          icon={<ChevronUp size={16} />}
                          aria-label="Move step up"
                          variant="ghost"
                          size="sm"
                          disabled={selectedStepIndex === 0}
                          onClick={() => moveStep(selectedStepIndex, 'up')}
                        />
                        <IconButton
                          icon={<ChevronDown size={16} />}
                          aria-label="Move step down"
                          variant="ghost"
                          size="sm"
                          disabled={selectedStepIndex === editForm.steps.length - 1}
                          onClick={() => moveStep(selectedStepIndex, 'down')}
                        />
                        <IconButton
                          icon={<Trash2 size={16} />}
                          aria-label="Remove step"
                          variant="ghost"
                          size="sm"
                          disabled={editForm.steps.length <= 1}
                          onClick={() => removeStep(selectedStepIndex)}
                          className="text-rose-500 hover:bg-rose-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Action Type</label>
                        <select
                          value={editForm.steps[selectedStepIndex]?.action}
                          onChange={e => updateStep(selectedStepIndex, 'action', e.target.value as TaskAction)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400"
                        >
                          <option value="send_dm">Instagram DM</option>
                          <option value="linkedin_dm">LinkedIn Message</option>
                          <option value="send_email">Email</option>
                          <option value="call">Phone Call</option>
                          <option value="fb_message">FB Message</option>
                          <option value="manual">Manual Task</option>
                          <option value="walk_in">Walk-in</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Day Offset</label>
                        <input
                          type="number"
                          min="0"
                          value={editForm.steps[selectedStepIndex]?.dayOffset}
                          onChange={e => updateStep(selectedStepIndex, 'dayOffset', parseInt(e.target.value) || 0)}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-500">Message Template</label>
                        <button
                          type="button"
                          onClick={() => setShowVariablePanel(!showVariablePanel)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                        >
                          <Puzzle size={12} />
                          {showVariablePanel ? 'Hide' : 'Insert'} Variables
                        </button>
                      </div>

                      {showVariablePanel && (
                        <VariableInsertPanel
                          onInsert={handleInsertVariable}
                          customFields={customFieldDefinitions}
                        />
                      )}

                      <textarea
                        ref={templateTextareaRef}
                        value={editForm.steps[selectedStepIndex]?.template}
                        onChange={e => updateStep(selectedStepIndex, 'template', e.target.value)}
                        placeholder="Type your message or click a variable above to insert it..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm min-h-[100px] resize-y focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={cancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={save} icon={<Save size={18} />} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode (Collapsed or Expanded)
              <div className="group">
                {/* Collapsed Header - Always visible */}
                <div
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleExpanded(s.id)}
                >
                  {/* Expand/Collapse Chevron */}
                  <ChevronRight
                    size={18}
                    className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                  />

                  {/* Color indicator */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${getStrategyColor(s.color).solid}`} />

                  {/* Strategy name */}
                  <h3 className="font-semibold text-slate-900 truncate flex-1">{s.name}</h3>

                  {/* Reorder buttons - visible on hover */}
                  <div
                    className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      icon={<ChevronUp size={16} />}
                      aria-label="Move up"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveStrategy(index, 'up')}
                      className="text-slate-400 hover:text-slate-600"
                    />
                    <IconButton
                      icon={<ChevronDown size={16} />}
                      aria-label="Move down"
                      variant="ghost"
                      size="sm"
                      disabled={index === strategies.length - 1}
                      onClick={() => moveStrategy(index, 'down')}
                      className="text-slate-400 hover:text-slate-600"
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Step count badge */}
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                          {s.steps.length} {s.steps.length === 1 ? 'step' : 'steps'}
                        </span>

                        {/* Description */}
                        <p className="text-sm text-slate-500 mt-2 line-clamp-2">{s.description}</p>

                        {/* Step Timeline Preview */}
                        <div className="mt-3">
                          <StepTimeline steps={s.steps} />
                        </div>

                        {/* Performance Metrics */}
                        <div className="mt-3">
                          <StrategyMetrics performance={performanceMap.get(s.id)} />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        <IconButton
                          icon={<Edit3 size={18} />}
                          aria-label="Edit strategy"
                          variant="ghost"
                          onClick={() => startEdit(s)}
                        />
                        <IconButton
                          icon={<Trash2 size={18} />}
                          aria-label="Delete strategy"
                          variant="ghost"
                          onClick={() => remove(s.id)}
                          className="text-rose-500 hover:bg-rose-50"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
};

export default StrategyManager;
