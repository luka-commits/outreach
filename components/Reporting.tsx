import React, { useMemo } from 'react';
import {
  BarChart3, TrendingUp, Target, Calendar, ArrowUpRight,
  ArrowDownRight, Loader2, Award, Zap, LayoutDashboard,
  Mail, Instagram, Phone, Facebook, Linkedin, Users, MessageCircle
} from 'lucide-react';
import { Lead, Activity, Strategy, OutreachGoals } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useLeadsQuery } from '../hooks/queries/useLeadsQuery';


interface ReportingProps {
  leads: Lead[];
  activities: Activity[];
  strategies: Strategy[];
  goals?: OutreachGoals;
}

const Reporting: React.FC<ReportingProps> = ({ leads: propLeads, activities, strategies, goals }) => {
  const { user } = useAuth();

  // Data Fetching Logic (preserved from previous fix)
  const { data: fetchedLeads, isLoading } = useLeadsQuery(user?.id);
  const leads = propLeads.length > 0 ? propLeads : (fetchedLeads || []);

  // --- ANALYTICS LOGIC --- //

  // 1. Overall Stats
  const overallStats = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter(l => l.status !== 'not_contacted').length;
    const replied = leads.filter(l => l.status === 'replied' || l.status === 'qualified').length;
    const qualified = leads.filter(l => l.status === 'qualified').length;

    return {
      total,
      contacted,
      replied,
      qualified,
      responseRate: contacted > 0 ? ((replied / contacted) * 100).toFixed(1) : '0.0',
      conversionRate: replied > 0 ? ((qualified / replied) * 100).toFixed(1) : '0.0',
    };
  }, [leads]);

  // 2. Campaign Leaderboard
  const campaignStats = useMemo(() => {
    return strategies.map(strategy => {
      const strategyLeads = leads.filter(l => l.strategyId === strategy.id);
      const output = strategyLeads.filter(l => l.status !== 'not_contacted').length;
      const responses = strategyLeads.filter(l => ['replied', 'qualified'].includes(l.status)).length;
      const qualified = strategyLeads.filter(l => l.status === 'qualified').length;

      return {
        id: strategy.id,
        name: strategy.name,
        leads: strategyLeads.length,
        output,
        responses,
        qualified,
        eff: output > 0 ? (responses / output) * 100 : 0
      };
    }).sort((a, b) => b.eff - a.eff); // Sort by efficiency
  }, [strategies, leads]);

  // 3. Daily Pulse (Actual vs Goal)
  const dailyPulse = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => a.timestamp.startsWith(today));

    // Default goals if undefined
    const safeGoals = goals || { instagram: 20, facebook: 10, linkedin: 10, email: 20, call: 10, walkIn: 0 };

    const counts = {
      instagram: todayActivities.filter(a => a.platform === 'instagram').length,
      facebook: todayActivities.filter(a => a.platform === 'facebook').length,
      linkedin: todayActivities.filter(a => a.platform === 'linkedin').length,
      email: todayActivities.filter(a => a.platform === 'email').length,
      call: todayActivities.filter(a => a.platform === 'call' || a.action === 'call').length,
    };

    return [
      { label: 'Instagram', actual: counts.instagram, goal: safeGoals.instagram, icon: <Instagram size={14} /> },
      { label: 'Email', actual: counts.email, goal: safeGoals.email, icon: <Mail size={14} /> },
      { label: 'LinkedIn', actual: counts.linkedin, goal: safeGoals.linkedin, icon: <Linkedin size={14} /> },
      { label: 'Calls', actual: counts.call, goal: safeGoals.call, icon: <Phone size={14} /> },
    ];
  }, [activities, goals]);

  // 4. Channel Efficiency (All Time)
  const channelMatrix = useMemo(() => {
    // This is an approximation since we don't track lead source perfectly yet.
    // We will look at activities. Count total outreach per platform.
    // Then count replies where the *last* activity before reply was on that platform? 
    // Simplified: Just Ratio of Activities on Platform vs Total Replies attributed (Hard to attr without field).
    // ALTERNATIVE: Use Lead fields (instagramUrl, etc) -> if they have it, did they reply?

    // Better Logic: Look at strategies. Strategies define the channel.
    // But mixed strategies exist.

    // Fallback: Let's use Activity Volume as "Effort" and try to correlate? No that's bad.
    // Let's rely on 'platform' in Activity.
    // Count UNIQUE leads contacted per platform.

    const uniqueContacted = { instagram: new Set(), email: new Set(), linkedin: new Set(), call: new Set() };
    activities.forEach(a => {
      if (a.platform && uniqueContacted[a.platform as keyof typeof uniqueContacted]) {
        uniqueContacted[a.platform as keyof typeof uniqueContacted].add(a.leadId);
      }
    });

    // Count replies from those sets
    const getRepliesForSet = (ids: Set<unknown>) => {
      let count = 0;
      ids.forEach(id => {
        const lead = leads.find(l => l.id === id);
        if (lead && ['replied', 'qualified'].includes(lead.status)) count++;
      });
      return count;
    };

    return [
      { name: 'Instagram', volume: uniqueContacted.instagram.size, replies: getRepliesForSet(uniqueContacted.instagram), icon: <Instagram size={16} />, color: 'text-pink-500 bg-pink-50' },
      { name: 'Email', volume: uniqueContacted.email.size, replies: getRepliesForSet(uniqueContacted.email), icon: <Mail size={16} />, color: 'text-blue-500 bg-blue-50' },
      { name: 'LinkedIn', volume: uniqueContacted.linkedin.size, replies: getRepliesForSet(uniqueContacted.linkedin), icon: <Linkedin size={16} />, color: 'text-blue-700 bg-blue-50' },
      { name: 'Cold Call', volume: uniqueContacted.call.size, replies: getRepliesForSet(uniqueContacted.call), icon: <Phone size={16} />, color: 'text-emerald-500 bg-emerald-50' },
    ];
  }, [activities, leads]);


  if (isLoading && leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold">crunching numbers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-slate-300" size={32} />
            Command Center
          </h2>
          <p className="text-slate-500 font-medium text-lg mt-1">Real-time intelligence across all active theaters.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <Calendar size={16} className="text-slate-400" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* 1. Overall KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Active Leads"
          value={overallStats.contacted}
          subValue={`${overallStats.total} Total`}
          icon={<Users size={20} />}
          trend="neutral"
        />
        <StatsCard
          label="Response Rate"
          value={`${overallStats.responseRate}%`}
          subValue={`${overallStats.replied} Replies`}
          icon={<MessageCircle size={20} />}
          trend={parseFloat(overallStats.responseRate) > 5 ? 'up' : 'neutral'}
        />
        <StatsCard
          label="Conversion"
          value={`${overallStats.conversionRate}%`}
          subValue={`${overallStats.qualified} Wins`}
          icon={<Award size={20} />}
          trend="up"
        />
        <StatsCard
          label="Pipeline Velocity"
          value={activities.filter(a => new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
          subValue="Actions last 7d"
          icon={<Zap size={20} />}
          trend="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 2. Daily Pulse (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-rose-50 p-2.5 rounded-xl text-rose-500"><Target size={20} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Today's Pulse</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actual vs Daily Goal</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {dailyPulse.map((metric) => {
              const progress = Math.min((metric.actual / (metric.goal || 1)) * 100, 100);
              return (
                <div key={metric.label} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                      {metric.icon} {metric.label}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-900">{metric.actual}</span>
                      <span className="text-xs text-slate-400 font-bold"> / {metric.goal}</span>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Channel Matrix (1/3 width) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
          <h3 className="text-xl font-black text-slate-900 mb-6">Channel Matrix</h3>
          <div className="space-y-6">
            {channelMatrix.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${c.color}`}>
                    {c.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{c.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{c.volume} Contacted</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{c.volume > 0 ? ((c.replies / c.volume) * 100).toFixed(1) : 0}%</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Reply Rate</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Campaign Leaderboard */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-xl font-black text-slate-900">Campaign Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategy</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Contacted</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Replies</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaignStats.map((s) => (
                <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{s.name}</p>
                  </td>
                  <td className="px-8 py-6 text-right font-medium text-slate-600">{s.leads}</td>
                  <td className="px-8 py-6 text-right font-medium text-slate-600">{s.output}</td>
                  <td className="px-8 py-6 text-right font-medium text-slate-900">{s.responses}</td>
                  <td className="px-8 py-6 text-right">
                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${s.eff > 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.eff.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {campaignStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No active campaigns found. Start scraping!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

const StatsCard: React.FC<{ label: string, value: string | number, subValue: string, icon: React.ReactNode, trend: 'up' | 'down' | 'neutral' }> = ({ label, value, subValue, icon, trend }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between h-40 group hover:border-indigo-200 transition-all">
    <div className="flex justify-between items-start">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      {trend === 'up' && <div className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1"><TrendingUp size={12} /> Good</div>}
    </div>
    <div>
      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-medium text-slate-300">• {subValue}</span>
      </div>
    </div>
  </div>
);

export default Reporting;
