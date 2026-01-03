import React, { useState, useEffect } from 'react';
import {
  MapPin, Building, Sparkles, Loader2, Target, CheckCircle2,
  History, AlertTriangle, RefreshCw, XCircle, Clock, Key, Radar, Globe
} from 'lucide-react';
import { ScrapeJob } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useScrapeJobs, useScrapeUsageQuery } from '../hooks/queries';
import { hasApiKeysConfigured } from '../services/supabase';
import { useSubscription } from '../hooks/useSubscription';
import { useToast } from './Toast';
import ScrapeProgressTimeline from './ScrapeProgressTimeline';
import { Button } from './ui/Button';
import { Input, Label } from './ui/Input';
import { ProBadge } from './ui/ProBadge';
import { cardStyles, typography } from '../lib/designTokens';

interface LeadFinderProps {
  onNavigateToSettings?: () => void;
  onNavigateToPricing?: () => void;
}

const LeadFinder: React.FC<LeadFinderProps> = ({ onNavigateToSettings, onNavigateToPricing }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { showToast } = useToast();

  // Form state
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [leadCount, setLeadCount] = useState(20);
  const [expandedRadius, setExpandedRadius] = useState(false);

  // API keys state
  const [hasApiKeys, setHasApiKeys] = useState<boolean | null>(null);
  const [checkingKeys, setCheckingKeys] = useState(true);

  // Subscription and usage
  const { isPro, checkScrapeLimit, limits } = useSubscription();
  const { data: scrapedThisMonth = 0 } = useScrapeUsageQuery(userId);
  const { allowed: canScrape, remaining: remainingQuota } = checkScrapeLimit(scrapedThisMonth, leadCount);

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

    // Check scrape limit for free users
    if (!canScrape) {
      showToast(
        `You've reached your free plan limit of ${limits.maxScrapesPerMonth} leads/month. Upgrade to Pro for unlimited scraping.`,
        'error'
      );
      return;
    }

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
      showToast('Failed to start scraping job. Please try again.', 'error');
    }
  };

  const handleResetJob = async () => {
    if (!activeJobs[0]) return;
    if (confirm('Are you sure you want to stop the current scraping job? It will be marked as failed.')) {
      try {
        console.warn('Resetting job:', activeJobs[0].id);
        await resetJob(activeJobs[0].id);
      } catch (e) {
        console.error('Failed to reset job:', e);
        const message = e instanceof Error ? e.message : 'Unknown error';
        alert(`Failed to reset job: ${message}`);
      }
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">

        {/* Header Section */}
        <header className="flex items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4">
            <div className="bg-pilot-blue/10 rounded-xl p-3">
              <Radar size={28} className="text-pilot-blue" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className={typography.pageTitle}>Lead Finder</h2>
                <span className="text-xs font-medium px-2 py-0.5 bg-pilot-blue/10 text-pilot-blue rounded-full">Beta</span>
              </div>
              <p className="text-gray-500 mt-1">
                Search for new leads by industry and location
              </p>
            </div>
          </div>

          {/* Monthly Quota Indicator */}
          <div className="text-right">
            {isPro ? (
              <div className="flex items-center gap-2">
                <ProBadge size="md" />
                <span className="text-sm text-gray-500">Unlimited</span>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {scrapedThisMonth} / {limits.maxScrapesPerMonth}
                </div>
                <div className="text-xs text-gray-500">leads this month</div>
                {remainingQuota <= 20 && remainingQuota > 0 && (
                  <button
                    onClick={onNavigateToPricing}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-1"
                  >
                    Upgrade for unlimited
                  </button>
                )}
                {remainingQuota === 0 && (
                  <button
                    onClick={onNavigateToPricing}
                    className="text-xs text-rose-600 hover:text-rose-700 font-medium mt-1"
                  >
                    Limit reached - Upgrade
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* API Warning */}
        {!checkingKeys && hasApiKeys === false && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-5 flex flex-col md:flex-row items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Key size={24} className="text-amber-600" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h4 className="font-semibold text-amber-900">API Keys Required</h4>
                <p className="text-amber-700 text-sm mt-1">
                  Configure your Apify and Anthropic API keys to search for leads.
                </p>
              </div>
              {onNavigateToSettings && (
                <Button
                  onClick={onNavigateToSettings}
                  variant="primary"
                  size="md"
                >
                  Configure Keys
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Active Job Card */}
        {hasActiveJob && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className={`${cardStyles.base} border-pilot-blue/30 p-6`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-pilot-blue/10 p-3 rounded-lg">
                    <Globe size={24} className="text-pilot-blue" />
                  </div>
                  <div>
                    <h3 className={typography.sectionTitle}>Search in Progress</h3>
                    <p className="text-gray-500 text-sm">
                      Searching in <span className="text-pilot-blue font-medium">{activeJobs[0]?.location}</span>
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleResetJob}
                  variant="ghost"
                  size="sm"
                  icon={<XCircle size={16} />}
                  className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  Cancel
                </Button>
              </div>

              {activeJobs[0] && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <ScrapeProgressTimeline job={activeJobs[0]} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="max-w-2xl mx-auto">
          <div className={`${cardStyles.base} p-6`}>
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Architects"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    icon={<Building size={18} />}
                    iconPosition="left"
                    inputSize="sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    type="text"
                    placeholder="e.g. New York, NY"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    icon={<MapPin size={18} />}
                    iconPosition="left"
                    inputSize="sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Target size={14} className="text-gray-400" /> Number of leads
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={leadCount}
                    onChange={(e) => setLeadCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pilot-blue"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5</span>
                    <span className="font-medium text-pilot-blue">{leadCount} leads</span>
                    <span>100</span>
                  </div>
                </div>

                <label className="flex items-center gap-3 bg-white border border-gray-200 p-3 rounded-lg cursor-pointer hover:border-pilot-blue/50 transition-colors">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${expandedRadius ? 'bg-pilot-blue border-pilot-blue' : 'border-gray-300 bg-white'}`}>
                    {expandedRadius && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Extended search</span>
                    <span className="text-xs text-gray-500">Expand search radius</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={expandedRadius}
                    onChange={(e) => setExpandedRadius(e.target.checked)}
                    className="hidden"
                  />
                </label>
              </div>

              <Button
                type="submit"
                disabled={isCreating || !industry || !location || !hasApiKeys || !canScrape}
                variant="primary"
                size="lg"
                fullWidth
                loading={isCreating}
                icon={!isCreating && !hasApiKeys ? <Key size={18} /> : !isCreating ? <Sparkles size={18} /> : undefined}
              >
                {isCreating ? 'Starting search...' : !hasApiKeys ? 'Configure API Keys' : !canScrape ? 'Monthly Limit Reached' : 'Start Search'}
              </Button>

              {/* Show warning when approaching limit */}
              {!isPro && canScrape && remainingQuota <= leadCount && remainingQuota > 0 && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  This search will use {leadCount} of your remaining {remainingQuota} leads this month.
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Search History */}
        <div className="space-y-4 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-gray-400" />
              <h3 className={typography.sectionTitle}>Search History</h3>
            </div>

            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-pilot-blue"></span> Active
              </span>
            </div>
          </div>

          {historyLoading ? (
            <div className="py-12 text-center">
              <Loader2 size={24} className="animate-spin text-gray-300 mx-auto" />
            </div>
          ) : scrapeHistory.length === 0 ? (
            <div className={`${cardStyles.base} border-dashed p-8 text-center`}>
              <Globe size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400">No searches yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scrapeHistory.map((job) => (
                <div
                  key={job.id}
                  className={`${cardStyles.interactive} p-4 ${job.status === 'processing' ? 'border-pilot-blue/30' : ''}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Building size={16} className="text-gray-400" />
                    </div>
                    <JobStatusBadge job={job} />
                  </div>

                  <h4 className="font-semibold text-gray-900 mb-1 line-clamp-1">{job.niche}</h4>
                  <p className="text-gray-500 text-sm flex items-center gap-1">
                    <MapPin size={12} className="text-gray-400" /> {job.location}
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <JobStats job={job} />

                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
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
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', Icon: Clock, label: 'Queued' },
    processing: { bg: 'bg-pilot-blue/10', text: 'text-pilot-blue', Icon: RefreshCw, label: 'Searching' },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', Icon: CheckCircle2, label: 'Done' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-600', Icon: XCircle, label: 'Failed' },
  };
  const config = statusConfig[job.status] || statusConfig['pending'];
  const { Icon } = config;

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${config.bg} ${config.text}`}>
      <Icon size={12} className={job.status === 'processing' ? 'animate-spin' : ''} />
      {config.label}
    </span>
  );
};

// Helper component to render job stats
const JobStats: React.FC<{ job: ScrapeJob }> = ({ job }) => {
  if (job.status === 'failed') {
    return (
      <div className="bg-rose-50 rounded-lg p-2">
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1.5">
          <AlertTriangle size={12} />
          Search failed
        </p>
        <p className="text-xs text-rose-400 mt-0.5 line-clamp-1">{job.errorMessage || 'Unknown error'}</p>
      </div>
    );
  }

  if (job.status === 'completed') {
    return (
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="block text-lg font-semibold text-gray-900">{job.leadsImported ?? 0}</span>
          <span className="text-xs text-gray-400">Found</span>
        </div>
        <div className="text-right">
          <span className="block text-lg font-semibold text-gray-900">{job.leadCount}</span>
          <span className="text-xs text-gray-400">Target</span>
        </div>
      </div>
    );
  }

  // Pending or Processing
  return (
    <div className="flex items-center gap-2 text-pilot-blue text-sm">
      <Loader2 size={14} className="animate-spin" />
      <span>Searching...</span>
    </div>
  );
};

export default LeadFinder;
