import React, { useState, useEffect } from 'react';
import {
  MapPin, Building, Sparkles, Loader2, Target, CheckCircle2,
  SearchCode, ArrowRight, History, AlertTriangle, Users,
  RefreshCw, XCircle, Clock, Key, Settings, Radar, Globe
} from 'lucide-react';
import { ScrapeJob } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useScrapeJobs } from '../hooks/queries/useScrapeJobsQuery';
import { hasApiKeysConfigured } from '../services/supabase';
import ScrapeProgressTimeline from './ScrapeProgressTimeline';

interface LeadFinderProps {
  onNavigateToSettings?: () => void;
}

const LeadFinder: React.FC<LeadFinderProps> = ({ onNavigateToSettings }) => {
  const { user } = useAuth();
  const userId = user?.id;

  // Form state
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [leadCount, setLeadCount] = useState(20);
  const [expandedRadius, setExpandedRadius] = useState(false);

  // API keys state
  const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);
  const [checkingKeys, setCheckingKeys] = useState(true);

  // Query hooks
  const {
    scrapeJobs: scrapeHistory = [],
    loading: historyLoading,
    createJob,
    isCreating,
    resetJob
  } = useScrapeJobs(userId);

  // Check if user has API keys configured
  useEffect(() => {
    async function checkKeys() {
      if (!userId) {
        setCheckingKeys(false);
        return;
      }
      try {
        const configured = await hasApiKeysConfigured(userId);
        setHasApiKeys(configured);
      } catch (error) {
        console.error('Failed to check API keys:', error);
        setHasApiKeys(false);
      } finally {
        setCheckingKeys(false);
      }
    }
    checkKeys();
  }, [userId]);

  // Check for active jobs (pending or processing)
  const activeJobs = scrapeHistory.filter(
    job => job.status === 'pending' || job.status === 'processing'
  );
  const hasActiveJob = activeJobs.length > 0;

  // Check for duplicate job warning
  const checkForDuplicateJob = (niche: string, loc: string): ScrapeJob | undefined => {
    return scrapeHistory.find(
      job => job.niche.toLowerCase() === niche.toLowerCase() &&
        job.location.toLowerCase() === loc.toLowerCase() &&
        job.status === 'completed'
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !location || !userId) return;

    // Check for duplicate
    const existingJob = checkForDuplicateJob(industry, location);
    if (existingJob) {
      const statsText = existingJob.leadsImported
        ? ` (${existingJob.leadsImported} leads imported)`
        : '';
      if (!confirm(
        `You already scraped "${industry}" in "${location}" on ${new Date(existingJob.createdAt).toLocaleDateString()}${statsText}. Do you want to search again?`
      )) {
        return;
      }
    }

    try {
      await createJob({
        niche: industry,
        location,
        leadCount,
        expandedRadius,
      });
      // Clear form on success
      setIndustry('');
      setLocation('');
    } catch (error) {
      console.error('Failed to start scraping job:', error);
      alert('Failed to start scraping job. Please try again.');
    }
  };

  const handleResetJob = async () => {
    if (!activeJobs[0]) return;
    if (confirm('Are you sure you want to stop the current scraping job? It will be marked as failed.')) {
      try {
        console.log('Resetting job:', activeJobs[0].id);
        await resetJob(activeJobs[0].id);
      } catch (e: any) {
        console.error('Failed to reset job:', e);
        alert(`Failed to reset job: ${e?.message || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden pb-20">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 via-indigo-50/30 to-transparent pointer-events-none" />
      <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[100px] -left-[200px] w-[500px] h-[500px] bg-amber-400/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12 relative z-10">

        {/* Header Section */}
        <header className="flex flex-col items-center text-center space-y-6 animate-in slide-in-from-top-4 duration-700">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white ring-1 ring-slate-900/5 rounded-[2.5rem] p-5 shadow-2xl flex items-center justify-center">
              <Radar size={48} className={`text-blue-600 ${hasActiveJob ? 'animate-spin-slow' : ''}`} />
            </div>
          </div>
          <div>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter flex items-center justify-center gap-4">
              Mission Control
              <span className="text-xs font-bold px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full tracking-widest uppercase align-middle transform -translate-y-4 shadow-lg shadow-blue-500/20">Beta</span>
            </h2>
            <p className="text-slate-500 font-medium text-lg mt-3 max-w-2xl mx-auto leading-relaxed">
              Deploy autonomous agents to scan global business indices.
              Identify high-value targets with proprietary signal analysis.
            </p>
          </div>
        </header>

        {/* API Warning */}
        {!checkingKeys && hasApiKeys === false && (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in duration-300">
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
              <div className="p-4 bg-amber-100 rounded-2xl">
                <Key size={32} className="text-amber-600" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h4 className="text-lg font-black text-amber-900">System Configuration Required</h4>
                <p className="text-amber-700 mt-1">
                  Access denied. Please configure Apify and Anthropic credentials to enable the scanning array.
                </p>
              </div>
              {onNavigateToSettings && (
                <button
                  onClick={onNavigateToSettings}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-200 active:scale-95"
                >
                  Configure Access
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Job Dashboard (If Active) */}
        {hasActiveJob && (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-500">
            <div className="bg-white border border-blue-100 rounded-[3rem] p-8 shadow-2xl shadow-blue-200/40 relative overflow-hidden ring-4 ring-blue-50/50">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 animate-pulse" />

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-20"></span>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 relative">
                      <Globe size={32} className="text-blue-600 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Operation in Progress</h3>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                      Scanning Sector: <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">{activeJobs[0].location}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetJob}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors text-sm font-bold uppercase tracking-wider"
                >
                  <XCircle size={16} className="group-hover:scale-110 transition-transform" />
                  Abort Mission
                </button>
              </div>

              <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-100 backdrop-blur-sm">
                <ScrapeProgressTimeline job={activeJobs[0]} />
              </div>
            </div>
          </div>
        )}

        {/* Command Console (Main Form) */}
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-[3.5rem] blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
          <div className="relative bg-white border border-slate-100 rounded-[3.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[4rem] -mr-8 -mt-8 z-0"></div>

            <div className="relative z-10">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest text-center mb-10 flex items-center justify-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <SearchCode size={20} className="text-blue-600" />
                </div>
                Configure Parameters
              </h3>

              <form onSubmit={handleSearch} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Target Niche
                    </label>
                    <div className="relative group/input">
                      <Building className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="e.g. Architects"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">
                      Target Region
                    </label>
                    <div className="relative group/input">
                      <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" size={20} />
                      <input
                        type="text"
                        placeholder="e.g. New York, NY"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-16 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[2rem] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gradient-to-br from-slate-50 to-blue-50/30 p-6 rounded-[2.5rem] border border-slate-100">
                  <div className="space-y-3 px-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Target size={14} className="text-blue-500" /> Extraction Limit
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={leadCount}
                      onChange={(e) => setLeadCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>5</span>
                      <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{leadCount} Leads</span>
                      <span>100</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-4 bg-white border-2 border-slate-100 p-4 rounded-[2rem] cursor-pointer hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all group/check">
                    <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${expandedRadius ? 'bg-blue-600 border-blue-600 scale-110 shadow-lg shadow-blue-500/20' : 'border-slate-200 bg-slate-50'}`}>
                      {expandedRadius && <CheckCircle2 size={20} className="text-white" />}
                    </div>
                    <div>
                      <span className="block text-sm font-black text-slate-700 group-hover/check:text-blue-700 transition-colors">Detailed Sweep</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Expand search radius</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={expandedRadius}
                      onChange={(e) => setExpandedRadius(e.target.checked)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isCreating || !industry || !location || !hasApiKeys}
                    className="w-full group relative flex items-center justify-center gap-4 bg-slate-900 text-white font-black rounded-[2.5rem] py-6 shadow-2xl shadow-slate-900/20 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none transition-all text-xl uppercase tracking-widest overflow-hidden hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <div className="relative flex items-center gap-3">
                      {isCreating ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          <span>Initializing...</span>
                        </>
                      ) : !hasApiKeys ? (
                        <>
                          <Key size={24} />
                          <span>Configure Keys</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={24} className={hasActiveJob ? "text-cyan-300" : "text-amber-400 group-hover:text-white"} />
                          <span>{hasActiveJob ? 'Deploy New Agent' : 'Launch Extraction'}</span>
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Mission Log (History) */}
        <div className="space-y-6 pt-12 border-t border-slate-200/60">
          <div className="flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
                <History size={20} className="text-slate-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Mission Log</h3>
            </div>

            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> Completed
              </div>
              <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]"></div> Active
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-20 text-center">
              <Loader2 size={32} className="animate-spin text-slate-300 mx-auto" />
            </div>
          ) : scrapeHistory.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-12 text-center opacity-50">
              <Globe size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-400 font-bold">No missions on record</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scrapeHistory.map((job) => (
                <div
                  key={job.id}
                  className={`group bg-white border rounded-[2.5rem] p-6 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden ${job.status === 'processing' ? 'border-blue-200 shadow-blue-100 ring-2 ring-blue-100' : 'border-slate-100'
                    }`}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                        <Building size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <JobStatusBadge job={job} />
                    </div>

                    <h4 className="font-black text-slate-800 text-lg leading-tight mb-1 line-clamp-1 group-hover:text-blue-600 transition-colors">{job.niche}</h4>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" /> {job.location}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50">
                    <JobStats job={job} />

                    <div className="flex items-center justify-between mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                      <span>ID: {job.id.slice(0, 6)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper component to render job status badge
const JobStatusBadge: React.FC<{ job: ScrapeJob }> = ({ job }) => {
  const statusConfig = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', Icon: Clock, label: 'Queued' },
    processing: { bg: 'bg-blue-100', text: 'text-blue-700', Icon: RefreshCw, label: 'Active' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', Icon: CheckCircle2, label: 'Success' },
    failed: { bg: 'bg-red-100', text: 'text-red-700', Icon: XCircle, label: 'Failed' },
  };
  const config = statusConfig[job.status] || statusConfig['pending']; // Default fallback
  const { Icon } = config;

  return (
    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 ${config.bg} ${config.text}`}>
      <Icon size={12} className={job.status === 'processing' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
};

// Helper component to render job stats
const JobStats: React.FC<{ job: ScrapeJob }> = ({ job }) => {
  if (job.status === 'failed') {
    return (
      <div className="bg-red-50 rounded-xl p-3">
        <p className="text-xs text-red-600 font-bold flex items-center gap-2">
          <AlertTriangle size={14} />
          Mission Failed
        </p>
        <p className="text-[10px] text-red-400 mt-1 line-clamp-1">{job.errorMessage || 'Unknown error occurred'}</p>
      </div>
    );
  }

  if (job.status === 'completed') {
    return (
      <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between group-hover:bg-slate-100 transition-colors">
        <div>
          <span className="block text-xl font-black text-slate-900">{job.leadsImported ?? 0}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Leads Found</span>
        </div>
        <div className="text-right">
          <span className="block text-xl font-black text-slate-900">{job.leadCount}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Target</span>
        </div>
      </div>
    );
  }

  // Pending or Processing
  return (
    <div className="bg-blue-50 rounded-xl p-3">
      <div className="flex items-center gap-2 text-blue-600">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs font-bold uppercase">Scanning...</span>
      </div>
    </div>
  );
};

export default LeadFinder;
