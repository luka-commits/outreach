import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  Loader2, AlertCircle, RefreshCw, BarChart3, TrendingUp,
  Mail, Instagram, Phone, Linkedin, Users, MessageCircle,
  PhoneCall, CheckCircle, Voicemail, PhoneMissed, XCircle, Clock, Trophy,
  Calendar, AlertTriangle, Facebook, UserX
} from 'lucide-react';

// Funnel color palette
const funnelColors = {
  notContacted: { primary: '#94A3B8', light: '#CBD5E1' },  // slate
  inProgress: { primary: '#F59E0B', light: '#FCD34D' },    // amber
  replied: { primary: '#3B82F6', light: '#93C5FD' },       // pilot-blue
  qualified: { primary: '#10B981', light: '#6EE7B7' },     // emerald
  noReply: { primary: '#64748B', light: '#94A3B8' },       // slate-500
  disqualified: { primary: '#F43F5E', light: '#FDA4AF' },  // rose
};
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useLeadStatusCounts } from '../hooks/queries/useLeadCountQuery';
import { useCallMetrics } from '../hooks/queries/useCallRecordsQuery';
import { useStrategyPerformance } from '../hooks/queries/useStrategyPerformanceQuery';
import { useReportingDashboard } from '../hooks/queries/useReportingQueries';
import { useSubscription } from '../hooks/useSubscription';
import { ProFeatureGate } from './ui/ProFeatureGate';
import { getErrorMessage } from '../utils/errorMessages';

type TrendPeriod = 4 | 8 | 12;

interface ReportingProps {
  onNavigateToPricing?: () => void;
}

const Reporting: React.FC<ReportingProps> = ({ onNavigateToPricing }) => {
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>(8);

  // Check subscription - must be called before any conditional returns
  const { canAccessFeature } = useSubscription();
  const hasAccess = canAccessFeature('reporting');

  // Data fetching hooks - must be called unconditionally (React rules of hooks)
  // These will only fetch when hasAccess is true via the enabled option
  const { data: statusCounts, isLoading, isError, error, refetch } = useLeadStatusCounts();
  const { data: callMetrics } = useCallMetrics();
  const { data: strategyPerformance } = useStrategyPerformance();
  // Combined reporting dashboard query (4 queries → 1)
  const { data: reportingDashboard } = useReportingDashboard(7, trendPeriod);

  // Extract data from combined dashboard query
  const staleLeadsCount = reportingDashboard?.staleLeadsCount;
  const channelPerformance = reportingDashboard?.channelPerformance;
  const weeklyTrends = reportingDashboard?.weeklyTrends;

  // Pipeline funnel data
  const pipelineData = useMemo(() => {
    if (!statusCounts) return null;

    const counts = statusCounts as Record<string, number>;
    const total = Object.values(counts).reduce((acc: number, count: number) => acc + count, 0);
    if (total === 0) return null;

    return {
      total,
      notContacted: counts.not_contacted || 0,
      inProgress: counts.in_progress || 0,
      replied: counts.replied || 0,
      qualified: counts.qualified || 0,
      disqualified: counts.disqualified || 0,
      noReply: counts.no_reply || 0,
    };
  }, [statusCounts]);

  // Strategy comparison data (sorted by response rate)
  const sortedStrategies = useMemo(() => {
    if (strategyPerformance && strategyPerformance.length > 0) {
      return [...strategyPerformance].sort((a, b) => b.responseRate - a.responseRate);
    }
    return [];
  }, [strategyPerformance]);

  // Best performing channel
  const bestChannel = useMemo(() => {
    if (!channelPerformance || channelPerformance.length === 0) return null;
    return channelPerformance.reduce((best, curr) =>
      curr.replyRate > best.replyRate ? curr : best
    );
  }, [channelPerformance]);

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!weeklyTrends) return [];
    return weeklyTrends.map(week => ({
      ...week,
      weekLabel: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [weeklyTrends]);

  // Gate for Pro users only - placed after all hooks to satisfy React rules
  if (!hasAccess) {
    return (
      <ProFeatureGate
        feature="Advanced Analytics"
        description="Get deep insights into your pipeline health, strategy performance, and channel effectiveness."
        icon={<BarChart3 size={32} className="text-amber-600" />}
        onUpgrade={onNavigateToPricing || (() => {})}
      />
    );
  }

  if (isLoading && !statusCounts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold">Loading analytics...</p>
      </div>
    );
  }

  if (isError && !statusCounts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
          <AlertCircle size={32} className="text-rose-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to load data</h3>
        <p className="text-slate-500 max-w-sm mb-6 text-center">{getErrorMessage(error)}</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart3 className="text-slate-300" size={32} />
            Analytics
          </h2>
          <p className="text-slate-500 font-medium text-lg mt-1">Strategic insights and pipeline health</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <Calendar size={16} className="text-slate-400" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Section 1: Pipeline Health */}
      {pipelineData && (
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-500">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Pipeline Health</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lead progression funnel</p>
            </div>
          </div>

          {/* Funnel Visualization */}
          <div className="mb-8">
            <GHLFunnel data={pipelineData} />
          </div>

          {/* Alert Card */}
          <div className="max-w-xs">
            <AlertCard
              icon={<AlertTriangle size={18} />}
              label="Stale Leads"
              value={staleLeadsCount || 0}
              subtitle="No activity in 7+ days"
              colorClass={staleLeadsCount && staleLeadsCount > 10 ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-50'}
            />
          </div>
        </div>
      )}

      {/* Section 2 & 3: Strategy Comparison + Channel Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Strategy Comparison (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden">
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2.5 rounded-xl text-purple-500">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Strategy Comparison</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Which sequences work best</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategy</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Contacted</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Replied</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qualified</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedStrategies.map((sp, index) => (
                  <tr key={sp.strategyId} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        {index === 0 && sp.responseRate > 0 && (
                          <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                            <Trophy size={14} />
                          </div>
                        )}
                        <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {sp.strategyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-medium text-slate-600">{sp.leadsAssigned}</td>
                    <td className="px-4 py-5 text-right font-medium text-slate-600">{sp.leadsContacted}</td>
                    <td className="px-4 py-5 text-right font-bold text-indigo-600">{sp.leadsReplied}</td>
                    <td className="px-4 py-5 text-right font-bold text-emerald-600">{sp.leadsQualified}</td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${Math.min(sp.responseRate, 100)}%` }}
                          />
                        </div>
                        <span className={`font-black text-sm min-w-[45px] text-right ${sp.responseRate > 10 ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {sp.responseRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedStrategies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                      No strategies with leads yet. Assign leads to strategies to see performance.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Channel Performance (1/3 width) */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
          <h3 className="text-xl font-black text-slate-900 mb-6">Channel Performance</h3>
          <div className="space-y-5">
            {channelPerformance && channelPerformance.length > 0 ? (
              channelPerformance.map((c) => (
                <ChannelCard
                  key={c.channel}
                  channel={c.channel}
                  contacted={c.leadsContacted}
                  replyRate={c.replyRate}
                  isBest={bestChannel?.channel === c.channel}
                />
              ))
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">
                No channel data yet. Start outreach to see performance.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: Trends */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-100/50">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Performance Trends</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly activity and results</p>
            </div>
          </div>

          {/* Period Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {([4, 8, 12] as TrendPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTrendPeriod(period)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  trendPeriod === period
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {period}w
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="weekLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activitiesCount"
                  name="Activities"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="repliesCount"
                  name="Replies"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="qualifiedCount"
                  name="Qualified"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-slate-400">
            Not enough data to show trends yet. Keep up the outreach!
          </div>
        )}
      </div>

      {/* Call Analytics */}
      {callMetrics && callMetrics.totalCalls > 0 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100/50 overflow-hidden max-w-2xl">
          <div className="p-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-500">
                <PhoneCall size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Call Analytics</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {callMetrics.totalCalls} Total Calls
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Call outcome breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <CallOutcomeCard
                label="Connected"
                count={callMetrics.connected}
                total={callMetrics.totalCalls}
                icon={<CheckCircle size={16} />}
                colorClass="text-emerald-600 bg-emerald-50"
              />
              <CallOutcomeCard
                label="Voicemail"
                count={callMetrics.voicemail}
                total={callMetrics.totalCalls}
                icon={<Voicemail size={16} />}
                colorClass="text-amber-600 bg-amber-50"
              />
              <CallOutcomeCard
                label="No Answer"
                count={callMetrics.noAnswer}
                total={callMetrics.totalCalls}
                icon={<PhoneMissed size={16} />}
                colorClass="text-slate-600 bg-slate-50"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <CallOutcomeCard
                label="Busy"
                count={callMetrics.busy}
                total={callMetrics.totalCalls}
                icon={<AlertCircle size={16} />}
                colorClass="text-orange-600 bg-orange-50"
              />
              <CallOutcomeCard
                label="Wrong #"
                count={callMetrics.wrongNumber}
                total={callMetrics.totalCalls}
                icon={<XCircle size={16} />}
                colorClass="text-rose-600 bg-rose-50"
              />
              <div className="p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                  <Clock size={14} />
                  <span className="text-lg font-black">
                    {Math.floor(callMetrics.totalTalkTimeSeconds / 60)}m
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Talk Time
                </span>
              </div>
            </div>

            {/* Connect rate bar */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Connect Rate</span>
                <span className="text-2xl font-black text-slate-900">
                  {callMetrics.connectRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(callMetrics.connectRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// --- Helper Components ---

const AlertCard = React.memo<{
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  colorClass: string;
}>(({ icon, label, value, subtitle, colorClass }) => (
  <div className={`p-4 rounded-2xl flex items-center gap-4 ${colorClass.includes('bg-') ? colorClass : `${colorClass} bg-slate-50`}`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-bold text-slate-600">{label}</p>
      <p className="text-[10px] text-slate-400">{subtitle}</p>
    </div>
  </div>
));
AlertCard.displayName = 'AlertCard';

const ChannelCard = React.memo<{
  channel: string;
  contacted: number;
  replyRate: number;
  isBest: boolean;
}>(({ channel, contacted, replyRate, isBest }) => {
  const getChannelInfo = (ch: string) => {
    switch (ch) {
      case 'instagram':
        return { icon: <Instagram size={16} />, label: 'Instagram', color: 'text-pink-500 bg-pink-50' };
      case 'email':
        return { icon: <Mail size={16} />, label: 'Email', color: 'text-blue-500 bg-blue-50' };
      case 'linkedin':
        return { icon: <Linkedin size={16} />, label: 'LinkedIn', color: 'text-blue-700 bg-blue-50' };
      case 'call':
        return { icon: <Phone size={16} />, label: 'Calls', color: 'text-emerald-500 bg-emerald-50' };
      case 'facebook':
        return { icon: <Facebook size={16} />, label: 'Facebook', color: 'text-blue-600 bg-blue-50' };
      default:
        return { icon: <MessageCircle size={16} />, label: channel, color: 'text-slate-500 bg-slate-50' };
    }
  };

  const info = getChannelInfo(channel);

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${isBest ? 'bg-emerald-50 ring-2 ring-emerald-200' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${info.color}`}>
          {info.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-slate-900 text-sm">{info.label}</p>
            {isBest && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">BEST</span>}
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{contacted} Contacted</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-black ${replyRate > 10 ? 'text-emerald-600' : 'text-slate-900'}`}>{replyRate.toFixed(1)}%</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">Reply Rate</p>
      </div>
    </div>
  );
});
ChannelCard.displayName = 'ChannelCard';

const CallOutcomeCard = React.memo<{
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  colorClass: string;
}>(({ label, count, total, icon, colorClass }) => {
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="p-3 rounded-2xl border border-slate-100 flex flex-col items-center justify-center hover:border-slate-200 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1 ${colorClass}`}>
        {icon}
      </div>
      <span className="text-xl font-black text-slate-900">{count}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-slate-500">{percentage}%</span>
    </div>
  );
});
CallOutcomeCard.displayName = 'CallOutcomeCard';

// --- GHL-Style Pipeline Funnel ---

// Stage configuration
const STAGE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorKey: keyof typeof funnelColors;
  bgClass: string;
  textClass: string;
}> = {
  notContacted: { label: 'Not Contacted', icon: Users, colorKey: 'notContacted', bgClass: 'bg-slate-100', textClass: 'text-slate-500' },
  inProgress: { label: 'In Progress', icon: Clock, colorKey: 'inProgress', bgClass: 'bg-amber-50', textClass: 'text-amber-500' },
  replied: { label: 'Replied', icon: MessageCircle, colorKey: 'replied', bgClass: 'bg-blue-50', textClass: 'text-blue-500' },
  qualified: { label: 'Qualified', icon: CheckCircle, colorKey: 'qualified', bgClass: 'bg-emerald-50', textClass: 'text-emerald-500' },
  noReply: { label: 'No Reply', icon: Clock, colorKey: 'noReply', bgClass: 'bg-slate-100', textClass: 'text-slate-500' },
  disqualified: { label: 'Disqualified', icon: UserX, colorKey: 'disqualified', bgClass: 'bg-rose-50', textClass: 'text-rose-500' },
};

// Funnel stages (linear progression)
const FUNNEL_STAGES = ['notContacted', 'inProgress', 'replied', 'qualified'] as const;
// Dropoff stages (exits from funnel, shown separately)
const DROPOFF_STAGES = ['noReply', 'disqualified'] as const;

interface FunnelStageData {
  key: string;
  label: string;
  count: number;
  barWidth: number;
  cumulativePercent: number;
  conversionPercent: number;
  color: { primary: string; light: string };
  icon: React.ComponentType<{ size?: number; className?: string }>;
  bgClass: string;
  textClass: string;
}

interface GHLFunnelRowProps {
  stage: FunnelStageData;
  index: number;
  maxBarWidth: number;
}

const GHLFunnelRow = React.memo<GHLFunnelRowProps>(({ stage, index, maxBarWidth }) => {
  const Icon = stage.icon;

  return (
    <div
      className="flex items-center gap-4 py-3 border-b border-slate-100 last:border-b-0"
      style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.08}s both` }}
    >
      {/* Stage icon and label */}
      <div className="flex items-center gap-3 w-40 shrink-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.bgClass}`}>
          <Icon size={16} className={stage.textClass} />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-bold text-slate-800 block truncate">{stage.label}</span>
        </div>
      </div>

      {/* Count */}
      <div className="w-16 text-right shrink-0">
        <span className="text-sm font-black text-slate-900">{stage.count.toLocaleString()}</span>
      </div>

      {/* Bar */}
      <div className="flex-1 min-w-0">
        <div className="h-7 bg-slate-100 rounded-lg overflow-hidden">
          <div
            className="h-full rounded-lg transition-all duration-700 ease-out"
            style={{
              width: `${Math.max((stage.count / maxBarWidth) * 100, stage.count > 0 ? 3 : 0)}%`,
              backgroundColor: stage.color.primary,
            }}
          />
        </div>
      </div>

      {/* Cumulative % */}
      <div className="w-20 text-right shrink-0">
        <span className="text-sm font-bold text-slate-600">{stage.cumulativePercent.toFixed(1)}%</span>
      </div>

      {/* Conversion % */}
      <div className="w-20 text-right shrink-0">
        <span className={`text-sm font-bold ${
          stage.conversionPercent >= 50 ? 'text-emerald-600' :
          stage.conversionPercent >= 20 ? 'text-slate-600' :
          'text-amber-600'
        }`}>
          {stage.conversionPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
});
GHLFunnelRow.displayName = 'GHLFunnelRow';

// Mobile version of funnel row
const GHLFunnelRowMobile = React.memo<GHLFunnelRowProps>(({ stage, index, maxBarWidth }) => {
  const Icon = stage.icon;

  return (
    <div
      className="bg-white rounded-xl border border-slate-200 p-4"
      style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.08}s both` }}
    >
      {/* Header: Icon, Label, Count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stage.bgClass}`}>
            <Icon size={16} className={stage.textClass} />
          </div>
          <span className="text-sm font-bold text-slate-800">{stage.label}</span>
        </div>
        <span className="text-lg font-black text-slate-900">{stage.count.toLocaleString()}</span>
      </div>

      {/* Bar */}
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.max((stage.count / maxBarWidth) * 100, stage.count > 0 ? 3 : 0)}%`,
            backgroundColor: stage.color.primary,
          }}
        />
      </div>

      {/* Metrics */}
      <div className="flex justify-between text-xs">
        <div>
          <span className="text-slate-400 uppercase tracking-wider font-bold">Cumulative</span>
          <span className="ml-2 font-bold text-slate-600">{stage.cumulativePercent.toFixed(1)}%</span>
        </div>
        <div>
          <span className="text-slate-400 uppercase tracking-wider font-bold">Conversion</span>
          <span className={`ml-2 font-bold ${
            stage.conversionPercent >= 50 ? 'text-emerald-600' :
            stage.conversionPercent >= 20 ? 'text-slate-600' :
            'text-amber-600'
          }`}>
            {stage.conversionPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
});
GHLFunnelRowMobile.displayName = 'GHLFunnelRowMobile';

interface GHLFunnelProps {
  data: {
    total: number;
    notContacted: number;
    inProgress: number;
    replied: number;
    qualified: number;
    disqualified: number;
    noReply: number;
  };
}

const GHLFunnel = React.memo<GHLFunnelProps>(({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Responsive detection
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      setIsMobile(width < 640);
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate funnel metrics (only for main funnel stages)
  const funnelStages = useMemo((): FunnelStageData[] => {
    const total = data.total;
    if (total === 0) return [];

    const counts: Record<string, number> = {
      notContacted: data.notContacted,
      inProgress: data.inProgress,
      replied: data.replied,
      qualified: data.qualified,
    };

    // Calculate metrics for funnel stages only
    return FUNNEL_STAGES.map((key, index) => {
      const count = counts[key] || 0;
      const config = STAGE_CONFIG[key]!;

      // Cumulative %: leads at this stage or beyond in the funnel
      const leadsAtOrBeyond = FUNNEL_STAGES
        .slice(index)
        .reduce((sum, k) => sum + (counts[k] || 0), 0);
      const cumulativePercent = total > 0 ? (leadsAtOrBeyond / total) * 100 : 0;

      // Conversion %: from previous stage to this stage
      let conversionPercent = 100;
      if (index > 0) {
        const prevKey = FUNNEL_STAGES[index - 1]!;
        const prevCount = counts[prevKey] || 0;
        conversionPercent = prevCount > 0 ? (count / prevCount) * 100 : 0;
      }

      return {
        key,
        label: config.label,
        count,
        barWidth: count,
        cumulativePercent,
        conversionPercent,
        color: funnelColors[config.colorKey],
        icon: config.icon,
        bgClass: config.bgClass,
        textClass: config.textClass,
      };
    });
  }, [data]);

  // Dropoff data (No Reply, Disqualified)
  const dropoffs = useMemo(() => {
    const total = data.total;
    return DROPOFF_STAGES.map(key => {
      const count = key === 'noReply' ? data.noReply : data.disqualified;
      const config = STAGE_CONFIG[key]!;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return {
        key,
        label: config.label,
        count,
        percent,
        color: funnelColors[config.colorKey],
        icon: config.icon,
        bgClass: config.bgClass,
        textClass: config.textClass,
      };
    });
  }, [data]);

  // Max count for bar scaling (funnel stages only)
  const maxBarWidth = useMemo(() => {
    return Math.max(...funnelStages.map(s => s.count), 1);
  }, [funnelStages]);

  if (funnelStages.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No lead data available
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      {/* CSS for animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {isMobile ? (
        /* Mobile: Card layout */
        <div className="space-y-3">
          {funnelStages.map((stage, index) => (
            <GHLFunnelRowMobile
              key={stage.key}
              stage={stage}
              index={index}
              maxBarWidth={maxBarWidth}
            />
          ))}

          {/* Dropoffs section */}
          <div className="pt-4 border-t border-slate-200 mt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Exits</p>
            <div className="flex flex-wrap gap-3">
              {dropoffs.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${d.key === 'disqualified' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d.bgClass}`}>
                      <Icon size={16} className={d.textClass} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${d.key === 'disqualified' ? 'text-rose-700' : 'text-slate-700'}`}>{d.label}</p>
                      <p className={`text-xs ${d.key === 'disqualified' ? 'text-rose-500' : 'text-slate-500'}`}>
                        {d.count.toLocaleString()} ({d.percent.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Desktop: Table layout */
        <div>
          {/* Header */}
          <div className="flex items-center gap-4 py-2 border-b border-slate-200 mb-1">
            <div className="w-40 shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stage</span>
            </div>
            <div className="w-16 text-right shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leads</span>
            </div>
            <div className="flex-1 min-w-0" />
            <div className="w-20 text-right shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumulative</span>
            </div>
            <div className="w-20 text-right shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversion</span>
            </div>
          </div>

          {/* Funnel Rows */}
          {funnelStages.map((stage, index) => (
            <GHLFunnelRow
              key={stage.key}
              stage={stage}
              index={index}
              maxBarWidth={maxBarWidth}
            />
          ))}

          {/* Dropoffs section */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-200">
            <p className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Exits</p>
            {dropoffs.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.key} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${d.key === 'disqualified' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d.bgClass}`}>
                    <Icon size={16} className={d.textClass} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${d.key === 'disqualified' ? 'text-rose-700' : 'text-slate-700'}`}>{d.label}</p>
                    <p className={`text-xs ${d.key === 'disqualified' ? 'text-rose-500' : 'text-slate-500'}`}>
                      {d.count.toLocaleString()} ({d.percent.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
GHLFunnel.displayName = 'GHLFunnel';

export default Reporting;
