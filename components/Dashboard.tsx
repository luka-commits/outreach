import React, { useState, useMemo, useEffect } from 'react';
import { Instagram, Facebook, Linkedin, Mail, Phone, Footprints, Settings2, ClipboardList, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import ConsistencyChart from './shared/ConsistencyChart';
import { Lead, OutreachGoals, Activity } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../contexts/NavigationContext';
import { useDashboardActivities, useActivitiesPaginatedQuery } from '../hooks/queries/useActivitiesQuery';
import { useTaskCountsQuery } from '../hooks/queries/useTasksQuery';
import { getLead } from '../services/supabase';
import { queryKeys } from '../lib/queryClient';
import { getErrorMessage } from '../utils/errorMessages';

// Helper function for relative time formatting
const formatRelativeTime = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

// Helper function for platform icons with brand colors
const getPlatformIcon = (platform?: string) => {
  switch (platform) {
    case 'instagram': return <Instagram size={16} className="text-pink-500" />;
    case 'facebook': return <Facebook size={16} className="text-blue-700" />;
    case 'linkedin': return <Linkedin size={16} className="text-sky-600" />;
    case 'email': return <Mail size={16} className="text-rose-500" />;
    case 'call': return <Phone size={16} className="text-emerald-600" />;
    case 'walkIn': return <Footprints size={16} className="text-violet-500" />;
    default: return <Mail size={16} className="text-gray-400" />;
  }
};

interface DashboardProps {
  leads: Lead[];
  activities: Activity[]; // Kept for backward compatibility, but we fetch our own now
  onStartQueue: () => void;
  onViewLeads: () => void;
  queueCount: number;
  todaysTasks: Lead[];
  goals: OutreachGoals;
  onUpdateGoals: (goals: OutreachGoals) => void;
  onOpenPricing: () => void;
  onOpenSettings: () => void;
}

interface StatEntry {
  current: number;
  target: number;
  key: string;
}

type ChannelStatsMap = Record<string, StatEntry>;

// Default goals to prevent null reference errors
const DEFAULT_GOALS: OutreachGoals = {
  instagram: 20,
  facebook: 10,
  linkedin: 10,
  email: 20,
  call: 10,
  walkIn: 5,
};

const Dashboard: React.FC<DashboardProps> = ({ leads: _leads, activities: _legacyActivities, onStartQueue, onViewLeads, queueCount: _queueCount, todaysTasks: _todaysTasks, goals: propsGoals, onUpdateGoals, onOpenPricing: _onOpenPricing, onOpenSettings: _onOpenSettings }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  // Safe goals with default values
  const goals = propsGoals || DEFAULT_GOALS;

  // State for disabled channels - simplistic persistence could be added later
  const [disabledChannels, setDisabledChannels] = useState<string[]>([]);

  // Fetch activities with date range filtering (much more efficient!)
  const { user } = useAuth();
  const { navigateToLead } = useNavigation();

  // Safe default for activities
  const { data: activities = [], isError: activitiesError, error: activitiesQueryError, refetch: refetchActivities } = useDashboardActivities(user?.id, timeframe);

  // Task counts for quick actions section
  const { data: taskCounts, isError: taskCountsError, error: taskCountsQueryError, refetch: refetchTaskCounts } = useTaskCountsQuery(user?.id);

  // Auto-retry queries when network reconnects
  useEffect(() => {
    const handleOnline = () => {
      refetchActivities();
      refetchTaskCounts();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchActivities, refetchTaskCounts]);

  // Fetch last 7 days for the chart specifically
  const chartStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6); // Last 7 days including today
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const { data: chartActivities = [] } = useActivitiesPaginatedQuery(user?.id, {
    startDate: chartStartDate,
    limit: 5000
  });

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const isoDateParts = d.toISOString().split('T');
      const dateKey = isoDateParts[0] ?? '';

      const dayActivities = chartActivities.filter(a => a.timestamp.startsWith(dateKey)).length;

      // Calculate total daily goal sum
      const totalDailyGoal = Object.entries(goals).reduce((acc, [key, val]) => {
        if (!disabledChannels.includes(key)) return acc + (val as number);
        return acc;
      }, 0);

      const percentage = totalDailyGoal > 0 ? Math.min(100, Math.round((dayActivities / totalDailyGoal) * 100)) : 0;

      days.push({ name: dayName, score: percentage, raw: dayActivities });
    }
    return days;
  }, [chartActivities, goals, disabledChannels]);

  const toggleChannel = (channel: string) => {
    setDisabledChannels(prev =>
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const stats = useMemo(() => {
    // Activities are already filtered by date range from the server
    const multiplier = timeframe === 'weekly' ? 7 : 1;

    // Single pass to count all platforms (O(n) instead of O(6n))
    const platformCounts = activities.reduce((acc, a) => {
      if (a.platform) {
        acc[a.platform] = (acc[a.platform] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const allStats = {
      instagram: { current: platformCounts.instagram || 0, target: goals.instagram * multiplier, key: 'instagram' },
      facebook: { current: platformCounts.facebook || 0, target: goals.facebook * multiplier, key: 'facebook' },
      linkedin: { current: platformCounts.linkedin || 0, target: goals.linkedin * multiplier, key: 'linkedin' },
      email: { current: platformCounts.email || 0, target: goals.email * multiplier, key: 'email' },
      call: { current: platformCounts.call || 0, target: goals.call * multiplier, key: 'call' },
      walkIn: { current: platformCounts.walkIn || 0, target: goals.walkIn * multiplier, key: 'walkIn' },
    };

    // Filter out disabled channels
    type ChannelStats = typeof allStats;
    type ChannelKey = keyof ChannelStats;
    return (Object.entries(allStats) as [ChannelKey, ChannelStats[ChannelKey]][]).reduce((acc, [key, val]) => {
      if (!disabledChannels.includes(key)) {
        acc[key] = val;
      }
      return acc;
    }, {} as Partial<ChannelStats>) as ChannelStats;

  }, [activities, timeframe, goals, disabledChannels]);

  // Show inline error banner if activities fail to load
  const hasError = activitiesError || taskCountsError;
  const queryError = activitiesQueryError || taskCountsQueryError;

  // Get recent activities and unique lead IDs for fetching
  const recentActivities = useMemo(() => activities.slice(0, 5), [activities]);
  const uniqueLeadIds = useMemo(() =>
    [...new Set(recentActivities.map(a => a.leadId))],
    [recentActivities]
  );

  // Fetch only the leads we need for recent activities (max 5, scalable)
  const leadQueries = useQueries({
    queries: user?.id
      ? uniqueLeadIds.map(leadId => ({
          queryKey: queryKeys.lead(user.id, leadId),
          queryFn: () => getLead(leadId, user.id),
          enabled: !!leadId,
          staleTime: 1000 * 60 * 5,
        }))
      : [],
  });

  // Create lookup map for lead names
  const leadNameMap = useMemo(() => {
    const map = new Map<string, string>();
    if (user?.id) {
      leadQueries.forEach((query, index) => {
        const leadId = uniqueLeadIds[index];
        if (query.data && leadId) {
          const lead = query.data;
          map.set(leadId, lead.companyName || lead.contactName || 'Unknown');
        }
      });
    }
    return map;
  }, [leadQueries, uniqueLeadIds, user?.id]);

  // Enrich activities with lead names
  const recentActivitiesWithLeads = useMemo(() =>
    recentActivities.map(activity => ({
      ...activity,
      leadName: leadNameMap.get(activity.leadId) || 'Loading...'
    })),
    [recentActivities, leadNameMap]
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {hasError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-rose-500" size={20} />
            <div>
              <p className="font-medium text-rose-800">Failed to load some data</p>
              <p className="text-sm text-rose-600">{getErrorMessage(queryError)}</p>
            </div>
          </div>
          <button
            onClick={() => {
              refetchActivities();
              refetchTaskCounts();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      )}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy">Weekly Momentum</h2>
          <p className="text-gray-500 mt-1">Your growth pulse across every channel.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg border border-gray-200/60 flex">
            <button
              onClick={() => setTimeframe('daily')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${timeframe === 'daily' ? 'bg-pilot-blue text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${timeframe === 'weekly' ? 'bg-pilot-blue text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Weekly
            </button>
          </div>
        </div>
      </header>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Today's Tasks Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200/60 hover:shadow-md transition-all duration-150">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardList size={20} className="text-gray-400" />
            <p className="text-sm font-medium text-gray-500">Today's Tasks</p>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">{taskCounts?.today ?? 0}</p>
          <p className="text-sm text-gray-500 mb-4">leads need action</p>
          <button
            onClick={onStartQueue}
            className="flex items-center gap-2 text-pilot-blue hover:text-pilot-blue/80 font-medium text-sm transition-colors duration-150"
          >
            Start Queue <ArrowRight size={16} />
          </button>
        </div>

        {/* Overdue Card */}
        <div className={`p-6 rounded-xl border hover:shadow-md transition-all duration-150 ${
          (taskCounts?.overdue ?? 0) > 0
            ? 'bg-amber-50 border-amber-200/50'
            : 'bg-white border-gray-200/60'
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={20} className={(taskCounts?.overdue ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400'} />
            <p className="text-sm font-medium text-gray-500">Overdue</p>
          </div>
          <p className="text-4xl font-bold text-gray-900 mb-1">{taskCounts?.overdue ?? 0}</p>
          <p className="text-sm text-gray-500 mb-4">need attention</p>
          <button
            onClick={onViewLeads}
            className="flex items-center gap-2 text-pilot-blue hover:text-pilot-blue/80 font-medium text-sm transition-colors duration-150"
          >
            View Leads <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-12 bg-white p-10 rounded-xl border border-gray-200/60 relative overflow-hidden flex flex-col justify-center min-h-[550px]">
          <div className="flex flex-col lg:flex-row items-center justify-around gap-14">

            {/* Left: Huge Ring */}
            <div className="relative w-96 h-96 shrink-0 transform hover:scale-105 transition-transform duration-150">
              <ActivityRings data={stats} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-6xl font-bold text-gray-900 tracking-tight">
                  {Object.keys(stats).length > 0
                    ? Math.round((Object.values(stats) as StatEntry[]).reduce((acc, s) => acc + (s.current / (s.target || 1)), 0) / Object.keys(stats).length * 100)
                    : 0}%
                </p>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-2">{timeframe} Goal</p>
              </div>
            </div>

            {/* Right: Detailed Breakdown - social media keeps colors, non-social uses gray */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-16 w-full max-w-4xl">
              {!disabledChannels.includes('instagram') && <LegendItem icon={<Instagram size={24} />} label="Instagram" stats={stats.instagram} color="text-pink-500" bgColor="bg-pink-50" />}
              {!disabledChannels.includes('facebook') && <LegendItem icon={<Facebook size={24} />} label="Facebook" stats={stats.facebook} color="text-blue-700" bgColor="bg-blue-50" />}
              {!disabledChannels.includes('linkedin') && <LegendItem icon={<Linkedin size={24} />} label="LinkedIn" stats={stats.linkedin} color="text-sky-600" bgColor="bg-sky-50" />}
              {!disabledChannels.includes('email') && <LegendItem icon={<Mail size={24} />} label="Emailing" stats={stats.email} color="text-rose-500" bgColor="bg-rose-50" />}
              {!disabledChannels.includes('call') && <LegendItem icon={<Phone size={24} />} label="Calling" stats={stats.call} color="text-emerald-600" bgColor="bg-emerald-50" />}
              {!disabledChannels.includes('walkIn') && <LegendItem icon={<Footprints size={24} />} label="Walk-ins" stats={stats.walkIn} color="text-violet-500" bgColor="bg-violet-50" />}
            </div>
          </div>

          {/* Goal Editor Overlay Trigger */}
          <button
            onClick={() => setIsEditingGoals(true)}
            className="absolute top-10 right-10 flex items-center gap-2 bg-white/50 backdrop-blur-sm hover:bg-white border border-gray-200/60 hover:border-pilot-blue/30 text-gray-500 hover:text-pilot-blue px-4 py-2 rounded-lg transition-all duration-150 font-medium text-xs uppercase tracking-wide group"
          >
            <Settings2 size={16} className="group-hover:rotate-180 transition-transform duration-300" />
            Adjust Goals
          </button>

          {isEditingGoals && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 p-10 animate-in fade-in zoom-in duration-300 flex flex-col justify-center">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-navy">Adjust Targets</h3>
                    <p className="text-gray-500 mt-1">Set your daily outreach goals per channel.</p>
                  </div>
                  <button onClick={() => setIsEditingGoals(false)} className="px-6 py-2.5 bg-pilot-blue text-white rounded-lg font-medium text-sm hover:bg-pilot-blue/90 transition-all duration-150 active:scale-[0.98]">Save Changes</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.keys(goals).map((key) => {
                    const isEnabled = !disabledChannels.includes(key);
                    return (
                      <div key={key} className={`space-y-3 group p-4 rounded-xl border transition-all duration-150 ${isEnabled ? 'bg-white border-gray-200/60' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{key}</label>
                          <button
                            onClick={() => toggleChannel(key)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors duration-150 ${isEnabled ? 'bg-pilot-blue' : 'bg-gray-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-150 ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <input
                          type="number"
                          value={goals[key as keyof OutreachGoals]}
                          disabled={!isEnabled}
                          onChange={(e) => onUpdateGoals({ ...goals, [key]: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent font-bold text-3xl text-gray-900 outline-none"
                        />
                      </div>
                    );
                  })}

                </div>
              </div>
            </div>
          )}

          {/* Activity Chart Section */}
          <div className="bg-white p-8 rounded-xl border border-gray-200/60 mt-8">
            <ConsistencyChart data={chartData} />
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white p-6 rounded-xl border border-gray-200/60 hover:shadow-md transition-all duration-150">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold tracking-tight text-gray-900">Recent Activity</h3>
        </div>

        {recentActivitiesWithLeads.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivitiesWithLeads.map((activity) => (
              <button
                key={activity.id}
                onClick={() => navigateToLead(activity.leadId)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 text-left"
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-gray-100">
                  {getPlatformIcon(activity.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {activity.leadName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{activity.action}</p>
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {formatRelativeTime(activity.timestamp)}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};


/** Activity Rings - Memoized SVG component */
const ActivityRings = React.memo<{ data: ChannelStatsMap }>(({ data }) => {
  const allRings = [
    { key: 'instagram', label: 'Instagram', color: '#ec4899', gradient: 'url(#grad-ig)' },
    { key: 'facebook', label: 'Facebook', color: '#1d4ed8', gradient: 'url(#grad-fb)' },
    { key: 'linkedin', label: 'LinkedIn', color: '#2563eb', gradient: 'url(#grad-li)' },
    { key: 'email', label: 'Email', color: '#f43f5e', gradient: 'url(#grad-mail)' },
    { key: 'call', label: 'Call', color: '#10b981', gradient: 'url(#grad-call)' },
    { key: 'walkIn', label: 'WalkIn', color: '#8b5cf6', gradient: 'url(#grad-walk)' },
  ];

  // Only show rings that are in data (not disabled)
  const activeRings = allRings.filter(r => data[r.key]);

  const baseSize = 288;
  const strokeWidth = 16;
  const gap = 6;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${baseSize} ${baseSize}`}>
      <defs>
        <linearGradient id="grad-ig" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
        <linearGradient id="grad-fb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#1e3a8a" /><stop offset="100%" stopColor="#2563eb" /></linearGradient>
        <linearGradient id="grad-li" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#60a5fa" /></linearGradient>
        <linearGradient id="grad-mail" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
        <linearGradient id="grad-call" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
        <linearGradient id="grad-walk" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#c4b5fd" /></linearGradient>
      </defs>
      {activeRings.map((ring, i) => {
        const radius = (baseSize / 2) - (i * (strokeWidth + gap)) - strokeWidth;
        const circumference = 2 * Math.PI * radius;
        const stats = data[ring.key];
        const progress = stats ? Math.min(0.999, stats.current / (stats.target || 1)) : 0;
        const offset = circumference * (1 - progress);
        return (
          <g key={ring.label}>
            <circle cx={baseSize / 2} cy={baseSize / 2} r={radius} fill="transparent" stroke={ring.color} strokeWidth={strokeWidth} className="opacity-[0.05]" />
            <circle cx={baseSize / 2} cy={baseSize / 2} r={radius} fill="transparent" stroke={ring.gradient} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${baseSize / 2} ${baseSize / 2})`} className="transition-all duration-1000 ease-out" />
          </g>
        );
      })}
    </svg>
  );
});

ActivityRings.displayName = 'ActivityRings';

/** Legend Item - Memoized to prevent unnecessary re-renders */
const LegendItem = React.memo<{ icon: React.ReactNode, label: string, stats: StatEntry, color: string, bgColor: string }>(({ icon, label, stats, color, bgColor }) => {
  const percent = stats.target > 0 ? Math.round((stats.current / stats.target) * 100) : 0;
  return (
    <div className="flex items-center gap-5 group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bgColor} ${color} transition-all duration-150 group-hover:scale-105`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-none">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-bold text-gray-900 leading-none tracking-tight">{stats.current}</p>
          <span className="text-xs font-medium text-gray-300">/ {stats.target}</span>
          <span className={`ml-3 ${color} text-xs font-medium px-2 py-0.5 rounded-lg border border-current/30`}>{percent}%</span>
        </div>
      </div>
    </div>
  );
});

LegendItem.displayName = 'LegendItem';

export default React.memo(Dashboard);
