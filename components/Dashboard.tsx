import React, { useState, useMemo } from 'react';
import { Instagram, Facebook, Linkedin, Mail, Phone, Footprints, Settings2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lead, OutreachGoals, Activity } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useDashboardActivities, useActivitiesPaginatedQuery } from '../hooks/queries/useActivitiesQuery';

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
  key: keyof OutreachGoals;
}

const Dashboard: React.FC<DashboardProps> = ({ leads, activities: _legacyActivities, onStartQueue, onViewLeads, queueCount, todaysTasks, goals, onUpdateGoals, onOpenPricing, onOpenSettings }) => {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  // State for disabled channels - simplistic persistence could be added later
  const [disabledChannels, setDisabledChannels] = useState<string[]>([]);

  // Fetch activities with date range filtering (much more efficient!)
  const { user } = useAuth();
  // Safe default for activities
  const { data: activities = [] } = useDashboardActivities(user?.id, timeframe);

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
      const dateKey = d.toISOString().split('T')[0];

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

    const allStats = {
      instagram: { current: activities.filter(a => a.platform === 'instagram').length, target: goals.instagram * multiplier, key: 'instagram' },
      facebook: { current: activities.filter(a => a.platform === 'facebook').length, target: goals.facebook * multiplier, key: 'facebook' },
      linkedin: { current: activities.filter(a => a.platform === 'linkedin').length, target: goals.linkedin * multiplier, key: 'linkedin' },
      email: { current: activities.filter(a => a.platform === 'email').length, target: goals.email * multiplier, key: 'email' },
      call: { current: activities.filter(a => a.platform === 'call').length, target: goals.call * multiplier, key: 'call' },
      walkIn: { current: activities.filter(a => a.platform === 'walkIn').length, target: goals.walkIn * multiplier, key: 'walkIn' },
    };

    // Filter out disabled channels
    return Object.entries(allStats).reduce((acc, [key, val]) => {
      if (!disabledChannels.includes(key)) {
        acc[key as keyof typeof allStats] = val as any;
      }
      return acc;
    }, {} as typeof allStats);

  }, [activities, timeframe, goals, disabledChannels]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Weekly Momentum</h2>
          <p className="text-slate-500 font-medium text-lg">Your growth pulse across every channel.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex">
            <button
              onClick={() => setTimeframe('daily')}
              className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${timeframe === 'daily' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Daily
            </button>
            <button
              onClick={() => setTimeframe('weekly')}
              className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${timeframe === 'weekly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Weekly
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-12 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100/50 relative overflow-hidden flex flex-col justify-center min-h-[550px]">
          <div className="flex flex-col lg:flex-row items-center justify-around gap-14">

            {/* Left: Huge Ring */}
            <div className="relative w-96 h-96 shrink-0 transform hover:scale-105 transition-transform duration-500">
              <ActivityRings data={stats} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-6xl font-black text-slate-900 tracking-tighter">
                  {Object.keys(stats).length > 0
                    ? Math.round((Object.values(stats) as StatEntry[]).reduce((acc, s) => acc + (s.current / (s.target || 1)), 0) / Object.keys(stats).length * 100)
                    : 0}%
                </p>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{timeframe} Goal</p>
              </div>
            </div>

            {/* Right: Detailed Breakdown */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-16 w-full max-w-4xl">
              {!disabledChannels.includes('instagram') && <LegendItem icon={<Instagram size={24} />} label="Instagram" stats={stats.instagram} color="text-pink-500" bgColor="bg-pink-50" />}
              {!disabledChannels.includes('facebook') && <LegendItem icon={<Facebook size={24} />} label="Facebook" stats={stats.facebook} color="text-blue-700" bgColor="bg-blue-50" />}
              {!disabledChannels.includes('linkedin') && <LegendItem icon={<Linkedin size={24} />} label="LinkedIn" stats={stats.linkedin} color="text-blue-600" bgColor="bg-blue-50" />}
              {!disabledChannels.includes('email') && <LegendItem icon={<Mail size={24} />} label="Emailing" stats={stats.email} color="text-rose-500" bgColor="bg-rose-50" />}
              {!disabledChannels.includes('call') && <LegendItem icon={<Phone size={24} />} label="Calling" stats={stats.call} color="text-emerald-500" bgColor="bg-emerald-50" />}
              {!disabledChannels.includes('walkIn') && <LegendItem icon={<Footprints size={24} />} label="Walk-ins" stats={stats.walkIn} color="text-indigo-500" bgColor="bg-indigo-50" />}
            </div>
          </div>

          {/* Goal Editor Overlay Trigger */}
          <button
            onClick={() => setIsEditingGoals(true)}
            className="absolute top-10 right-10 flex items-center gap-2 bg-white/50 backdrop-blur-sm hover:bg-white border border-white/20 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-xs uppercase tracking-wider group"
          >
            <Settings2 size={16} className="group-hover:rotate-180 transition-transform duration-500" />
            Adjust Goals
          </button>

          {isEditingGoals && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 p-10 animate-in fade-in zoom-in duration-300 flex flex-col justify-center">
              <div className="max-w-4xl mx-auto w-full">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="font-black text-4xl tracking-tight text-slate-900">Adjust Targets</h3>
                    <p className="text-slate-500 font-medium">Set your daily outreach goals per channel.</p>
                  </div>
                  <button onClick={() => setIsEditingGoals(false)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all">Save Changes</button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  {Object.keys(goals).map((key) => {
                    const isEnabled = !disabledChannels.includes(key);
                    return (
                      <div key={key} className={`space-y-3 group p-4 rounded-3xl border transition-all ${isEnabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key}</label>
                          <button
                            onClick={() => toggleChannel(key)}
                            className={`w-10 h-6 rounded-full p-1 transition-colors ${isEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <input
                          type="number"
                          value={goals[key as keyof OutreachGoals]}
                          disabled={!isEnabled}
                          onChange={(e) => onUpdateGoals({ ...goals, [key]: parseInt(e.target.value) || 0 })}
                          className="w-full bg-transparent font-black text-3xl text-slate-900 outline-none"
                        />
                      </div>
                    );
                  })}

                </div>
              </div>
            </div>
          )}

          {/* Activity Chart Section */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-100/50 mt-8">
            <h3 className="text-2xl font-black text-slate-900 mb-6 px-4">Daily Consistency (Last 7 Days)</h3>
            <div className="h-[300px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                      formatter={(value: number) => [`${value}% Goal Achieved`, 'Performance']}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                  Loading Chart...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityRings: React.FC<{ data: any }> = ({ data }) => {
  const allRings = [
    { key: 'instagram', label: 'Instagram', color: '#ec4899', gradient: 'url(#grad-ig)' },
    { key: 'facebook', label: 'Facebook', color: '#1d4ed8', gradient: 'url(#grad-fb)' },
    { key: 'linkedin', label: 'LinkedIn', color: '#2563eb', gradient: 'url(#grad-li)' },
    { key: 'email', label: 'Email', color: '#f43f5e', gradient: 'url(#grad-mail)' },
    { key: 'call', label: 'Call', color: '#10b981', gradient: 'url(#grad-call)' },
    { key: 'walkIn', label: 'WalkIn', color: '#6366f1', gradient: 'url(#grad-walk)' },
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
        <linearGradient id="grad-walk" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#a5b4fc" /></linearGradient>
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
};

const LegendItem: React.FC<{ icon: React.ReactNode, label: string, stats: any, color: string, bgColor: string }> = ({ icon, label, stats, color, bgColor }) => {
  const percent = stats.target > 0 ? Math.round((stats.current / stats.target) * 100) : 0;
  return (
    <div className="flex items-center gap-5 group">
      <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center ${bgColor} ${color} border border-white shadow-md transition-all group-hover:scale-110 active:scale-95`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-black text-slate-900 leading-none tracking-tight">{stats.current}</p>
          <span className="text-[10px] font-black text-slate-300">/ {stats.target}</span>
          <span className={`ml-3 ${color} text-[10px] font-black px-2 py-0.5 rounded-lg border border-current opacity-70`}>{percent}%</span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
