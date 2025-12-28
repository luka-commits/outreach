import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  ArrowLeft, Check, Copy, ExternalLink, Instagram, Mail, Phone,
  Facebook, Sparkles, Loader2, Linkedin, LayoutGrid, List, ChevronRight,
  PlayCircle, Clock, Calendar as CalendarIcon, ChevronLeft, MapPin, AlertCircle, RefreshCw, CheckSquare
} from 'lucide-react';
import { Lead, Strategy, Activity } from '../types';
import { ACTION_ICONS } from '../constants';
import { generatePersonalizedMessage } from '../services/geminiService';
import { getPlatformColor } from '../utils/styles';

interface TaskQueueProps {
  todayTasks: Lead[];
  allScheduledTasks: Lead[];
  strategies: Strategy[];
  onBack: () => void;
  onUpdateLead: (lead: Lead) => void;
  onAddActivity: (leadId: string, action: string, note?: string, isFirstOutreach?: boolean, platform?: Activity['platform']) => void;
  onSelectLead: (id: string) => void;
}

type ViewMode = 'list' | 'calendar' | 'processing';
type FilterType = 'overdue' | 'today' | 'upcoming';
type CalendarMode = 'week' | 'month';

const TaskQueue: React.FC<TaskQueueProps> = ({ todayTasks, allScheduledTasks, strategies, onBack, onUpdateLead, onAddActivity, onSelectLead }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
  const [isSessionMode, setIsSessionMode] = useState(false);

  // Processing State
  const [processLeadId, setProcessLeadId] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [message, setMessage] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date()); // Used for both Month and Week view anchor

  // Filter Logic & Counts
  const { filteredTasks, sessionTasks, counts } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let overdueCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;

    const sortedTasks = [...allScheduledTasks].sort((a, b) => new Date(a.nextTaskDate!).getTime() - new Date(b.nextTaskDate!).getTime());

    sortedTasks.forEach(task => {
      if (!task.nextTaskDate) return;
      const taskDate = new Date(task.nextTaskDate);
      taskDate.setHours(0, 0, 0, 0);

      if (taskDate < today && task.status !== 'replied' && task.status !== 'closed_won' && task.status !== 'closed_lost') {
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
      return taskDate <= today && task.status !== 'replied' && task.status !== 'closed_won' && task.status !== 'closed_lost';
    });

    const filtered = sortedTasks.filter(task => {
      if (!task.nextTaskDate) return false;
      const taskDate = new Date(task.nextTaskDate);
      taskDate.setHours(0, 0, 0, 0);

      if (activeFilter === 'overdue') {
        return taskDate < today && task.status !== 'replied' && task.status !== 'closed_won' && task.status !== 'closed_lost';
      }
      if (activeFilter === 'today') {
        return taskDate.getTime() === today.getTime();
      }
      if (activeFilter === 'upcoming') {
        return taskDate > today;
      }
      return false;
    });

    return {
      filteredTasks: filtered,
      sessionTasks: sessionTasksList,
      counts: { overdue: overdueCount, today: todayCount, upcoming: upcomingCount }
    };
  }, [allScheduledTasks, activeFilter]);

  // Determine current lead for processing
  const currentLead = processLeadId ? allScheduledTasks.find(l => l.id === processLeadId) : null;
  const strategy = currentLead?.strategyId ? strategies.find(s => s.id === currentLead.strategyId) : null;
  const step = currentLead && strategy ? strategy.steps[currentLead.currentStepIndex] : null;

  useEffect(() => {
    if (currentLead && step) {
      const template = step.template
        .replace('{companyName}', currentLead.companyName)
        .replace('{contactName}', currentLead.contactName || 'there')
        .replace('{service}', 'our services');
      setMessage(template);
    }
    setCopied(false);
  }, [processLeadId, currentLead, step]);

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
    if (!currentLead || !strategy || !step) return;

    // ... Update logic ...
    const nextStepIndex = currentLead.currentStepIndex + 1;
    const isLastStep = nextStepIndex >= strategy.steps.length;
    const isFirstOutreach = currentLead.currentStepIndex === 0;
    const platform = getPlatformFromAction(step.action);

    let nextTaskDate: string | undefined = undefined;
    if (!isLastStep) {
      const nextStep = strategy.steps[nextStepIndex];
      const today = new Date();
      today.setDate(today.getDate() + (nextStep.dayOffset - step.dayOffset));
      nextTaskDate = today.toISOString();
    }

    const updatedLead: Lead = {
      ...currentLead,
      currentStepIndex: nextStepIndex,
      nextTaskDate: nextTaskDate,
      status: isLastStep ? 'replied' : 'in_progress'
    };

    onUpdateLead(updatedLead);
    onAddActivity(currentLead.id, `Task completed: ${step.action}`, message, isFirstOutreach, platform);

    // AUTO-ADVANCE LOGIC
    if (isSessionMode) {
      // Find next task in sessionTasks that isn't the current one
      const currentIndex = sessionTasks.findIndex(t => t.id === currentLead.id);
      const nextTask = sessionTasks[currentIndex + 1];

      if (nextTask) {
        setProcessLeadId(nextTask.id);
        // View remains 'processing'
        return;
      } else {
        // End of session
        alert("All tasks in this session are complete!");
        setIsSessionMode(false);
        setProcessLeadId(null);
        setViewMode('list');
      }
    } else {
      setProcessLeadId(null);
      setViewMode('list');
    }
  };

  const startProcessingTask = (leadId: string) => {
    setProcessLeadId(leadId);
    setViewMode('processing');
    setIsSessionMode(false); // Single task mode
  };

  const startSession = () => {
    if (sessionTasks.length === 0) {
      alert("No outstanding tasks to process!");
      return;
    }
    setIsSessionMode(true);
    setProcessLeadId(sessionTasks[0].id);
    setViewMode('processing');
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
    const dateStr = date.toISOString().split('T')[0];
    return allScheduledTasks.filter(t => t.nextTaskDate?.startsWith(dateStr));
  };


  if (viewMode === 'processing' && currentLead && step) {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <button onClick={() => { setViewMode('list'); setIsSessionMode(false); }} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold text-xs uppercase tracking-widest">
            <List size={18} /> {isSessionMode ? 'End Session' : 'Back to List'}
          </button>
          <div className="bg-white border border-slate-200 px-4 py-1.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">
            {isSessionMode ? (
              <span className="text-indigo-600">Session: {sessionTasks.findIndex(t => t.id === currentLead.id) + 1} / {sessionTasks.length}</span>
            ) : (
              `Step ${currentLead.currentStepIndex + 1}`
            )}
          </div>
          <div className="w-6" />
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl space-y-8 animate-in slide-in-from-bottom-8 duration-500">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900 leading-tight">{currentLead.companyName}</h2>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{strategy?.name}</span>
              <span className="flex items-center gap-1 uppercase tracking-wider font-bold text-[10px]">
                {ACTION_ICONS[step.action]}
                {step.action.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message Draft</span>
              <button onClick={handlePersonalize} disabled={personalizing} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 disabled:opacity-50">
                {personalizing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI Personalize
              </button>
            </div>
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[160px] p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-slate-700 font-medium resize-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none leading-relaxed transition-all"
              />
              <button onClick={handleCopy} className="absolute bottom-4 right-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600 active:scale-95 transition-all">
                {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {step.action === 'send_dm' && <ActionButton icon={<Instagram />} label="Open Instagram" href={currentLead.instagramUrl} color="bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white" />}
            {step.action === 'linkedin_dm' && <ActionButton icon={<Linkedin />} label="Open LinkedIn" href={currentLead.linkedinUrl} color="bg-[#0A66C2] text-white" />}
            {step.action === 'send_email' && <ActionButton icon={<Mail />} label="Open Email" href={currentLead.email ? `mailto:${currentLead.email}?subject=Inquiry&body=${encodeURIComponent(message)}` : undefined} color="bg-[#EA4335] text-white" />}
            {step.action === 'fb_message' && <ActionButton icon={<Facebook />} label="Open Facebook" href={currentLead.facebookUrl} color="bg-[#1877F2] text-white" />}
            {step.action === 'call' && <ActionButton icon={<Phone />} label="Call Now" href={currentLead.phone ? `tel:${currentLead.phone}` : undefined} color="bg-[#25D366] text-white" />}
          </div>

          <div className="pt-4 flex gap-4">
            <button onClick={() => {
              if (isSessionMode) {
                /* Logic to just skip to next without completing? */
                const currentIndex = sessionTasks.findIndex(t => t.id === currentLead.id);
                const nextTask = sessionTasks[currentIndex + 1];
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
    );
  }

  // --- LIST FILTER VIEW ---
  if (viewMode === 'list') {
    return (
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

        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-100">
          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const taskStrategy = strategies.find(s => s.id === task.strategyId);
                const taskStep = taskStrategy?.steps[task.currentStepIndex];

                // Calculate simple status text
                const isOverdue = new Date(task.nextTaskDate!).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0);
                const isToday = new Date(task.nextTaskDate!).setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);

                return (
                  <div
                    key={task.id}
                    onClick={() => startProcessingTask(task.id)}
                    className="p-6 hover:bg-slate-50 transition-colors cursor-pointer group flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${getPlatformColor(taskStep?.action)}`}>
                        {taskStep ? ACTION_ICONS[taskStep.action] : <CheckSquare size={20} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-700 transition-colors">{task.companyName}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Step {task.currentStepIndex + 1}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{taskStrategy?.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 text-right">
                      <div className="hidden md:block">
                        <p className={`text-xs font-black uppercase tracking-widest ${isOverdue ? 'text-rose-500' : isToday ? 'text-indigo-500' : 'text-slate-400'
                          }`}>
                          {isOverdue ? 'Overdue' : isToday ? 'Today' : 'Upcoming'}
                        </p>
                        <p className="text-xs font-medium text-slate-400 mt-1">
                          {new Date(task.nextTaskDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-indigo-500 group-hover:text-indigo-500 transition-all">
                        <ChevronRight size={20} />
                      </button>
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
                  calendarMode === 'week' ? `Week of ${getWeekDays(currentDate)[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
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

              if (!date && calendarMode === 'week') return null; // Should not happen in week view

              return (
                <div key={idx} className={`min-h-[140px] p-4 border-r border-b border-slate-50 last:border-r-0 group hover:bg-slate-50/50 transition-all ${date ? '' : 'bg-slate-50/20'}`}>
                  {date && (
                    <div className="flex flex-col h-full">
                      <span className={`text-xs font-black mb-3 inline-flex items-center justify-center w-8 h-8 rounded-xl ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 group-hover:text-slate-900 transition-colors'}`}>
                        {dayNum}
                      </span>
                      <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-hide max-h-[300px]">
                        {dayTasks.map(t => {
                          const taskStep = strategies.find(s => s.id === t.strategyId)?.steps[t.currentStepIndex];
                          return (
                            <div
                              key={t.id}
                              onClick={() => onSelectLead(t.id)}
                              className={`p-2 rounded-xl border text-[9px] font-black uppercase tracking-tight flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.02] transition-all bg-white border-slate-100 ${getPlatformColor(taskStep?.action)}`}
                            >
                              {taskStep && ACTION_ICONS[taskStep.action]}
                              <span className="truncate">{t.companyName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

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

export default TaskQueue;
