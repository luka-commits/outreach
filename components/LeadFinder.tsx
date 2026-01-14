import React, { useState, useEffect } from 'react';
import { Search, MapPin, Globe, Users, Loader2, AlertCircle, CheckCircle2, ExternalLink, Phone, Mail, Facebook, Instagram, Linkedin, ArrowLeft, Download, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { useLeadFinderJob, LeadFinderLead } from '../hooks/useLeadFinderJob';
import { queryClient, queryKeys } from '../lib/queryClient';
import { useToast } from './Toast';
import { radius, shadows, transitions } from '../lib/designTokens';

interface LeadFinderProps {
  onNavigateToSettings?: () => void;
}

interface SearchParams {
  keyword: string;
  location: string | null;
  country: string;
}

interface StartJobResponse {
  success: boolean;
  job_id: string;
  status: string;
  message: string;
}

interface ImportResponse {
  success: boolean;
  imported: number;
  message: string;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
];

const MAX_ADS_FREE = 100;
const MAX_ADS_PRO = 500;

type ViewState = 'search' | 'processing' | 'preview' | 'imported';

const LeadFinder: React.FC<LeadFinderProps> = ({ onNavigateToSettings: _onNavigateToSettings }) => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { showToast } = useToast();

  // Search form state
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('US');
  const [maxAds, setMaxAds] = useState(50);

  // UI state
  const [viewState, setViewState] = useState<ViewState>('search');
  const [isStarting, setIsStarting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job tracking
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { job, isCompleted, isFailed, leads, duplicates } = useLeadFinderJob(currentJobId);

  // Update elapsed time while processing
  useEffect(() => {
    if (viewState !== 'processing' || !searchStartTime) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - searchStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [viewState, searchStartTime]);

  // Results state (for preview)
  const [previewLeads, setPreviewLeads] = useState<LeadFinderLead[]>([]);
  const [duplicateLeads, setDuplicateLeads] = useState<LeadFinderLead[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [totalFound, setTotalFound] = useState(0);
  const [importedCount, setImportedCount] = useState(0);

  const maxAllowed = isPro ? MAX_ADS_PRO : MAX_ADS_FREE;

  // Watch for job completion
  useEffect(() => {
    if (isCompleted && job) {
      // Job completed - move to preview
      const safeLeads = leads || [];
      const safeDuplicates = duplicates || [];
      setPreviewLeads(safeLeads);
      setDuplicateLeads(safeDuplicates);
      setSearchParams({
        keyword: job.keyword,
        location: job.location,
        country: job.country,
      });
      setTotalFound(job.total_found || 0);
      setViewState('preview');
      showToast(`Found ${safeLeads.length} new leads!`, 'success');
    } else if (isFailed && job) {
      // Job failed - show error and go back to search
      setError(job.error_message || 'Search failed. Please try again.');
      setViewState('search');
      showToast(job.error_message || 'Search failed', 'error');
    }
  }, [isCompleted, isFailed, job, leads, duplicates, showToast]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to search for leads');
      return;
    }

    if (!keyword.trim()) {
      setError('Please enter a search keyword');
      return;
    }

    if (!country) {
      setError('Please select a country');
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-leads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            keyword: keyword.trim(),
            location: location.trim() || undefined,
            country,
            max_ads: Math.min(maxAds, maxAllowed),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data: StartJobResponse = await response.json();

      if (!data.success || !data.job_id) {
        throw new Error('Failed to start search');
      }

      // Store job ID and switch to processing view
      setCurrentJobId(data.job_id);
      setSearchStartTime(Date.now());
      setSearchParams({
        keyword: keyword.trim(),
        location: location.trim() || null,
        country,
      });
      setViewState('processing');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsStarting(false);
    }
  };

  const handleImport = async () => {
    if (!user || (previewLeads || []).length === 0) return;

    setIsImporting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-leads`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            leads: previewLeads,
            search_params: searchParams,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Import failed with status ${response.status}`);
      }

      const data: ImportResponse = await response.json();

      if (!data.success) {
        throw new Error('Failed to import leads');
      }

      setImportedCount(data.imported);
      setViewState('imported');

      // Invalidate leads query to show new leads
      queryClient.invalidateQueries({ queryKey: queryKeys.leads(user.id) });
      showToast(`Successfully imported ${data.imported} leads!`, 'success');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleNewSearch = () => {
    setViewState('search');
    setCurrentJobId(null);
    setPreviewLeads([]);
    setDuplicateLeads([]);
    setSearchParams(null);
    setTotalFound(0);
    setImportedCount(0);
    setError(null);
  };

  const handleCancelSearch = () => {
    // Just go back to search form - job will continue in background but we won't watch it
    setCurrentJobId(null);
    setViewState('search');
  };

  // Count leads with specific data (safeguard against undefined)
  const leadsWithFacebook = (previewLeads || []).filter(l => l.facebook_url).length;
  const leadsWithEmail = (previewLeads || []).filter(l => l.email).length;
  const leadsWithPhone = (previewLeads || []).filter(l => l.phone).length;

  // Format elapsed time
  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Manual refresh function
  const handleCheckStatus = () => {
    if (currentJobId && user?.id) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadFinderJob(user.id, currentJobId),
      });
    }
  };

  // Render processing view
  if (viewState === 'processing') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className={`bg-white p-8 ${radius.md} ${shadows.sm} border border-slate-200 text-center`}>
          <Loader2 size={48} className="text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Searching for Leads</h2>
          <p className="text-slate-600 mb-2">
            {searchParams?.keyword}
            {searchParams?.location && ` in ${searchParams.location}`}
            {searchParams?.country && `, ${searchParams.country}`}
          </p>

          {/* Progress info */}
          <div className="mt-6 mb-6">
            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${job?.progress || 10}%` }}
              />
            </div>
            <p className="text-sm text-slate-500">
              {job?.stage_message || 'Starting search...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Elapsed: {formatElapsed(elapsedSeconds)}
            </p>
          </div>

          <p className="text-sm text-slate-500 mb-6">
            This may take a few minutes. We're searching Facebook Ads and extracting contact details for each advertiser.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleCheckStatus}
              className={`py-2 px-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 ${radius.md} ${transitions.fast} inline-flex items-center gap-2`}
            >
              <RefreshCw size={16} />
              Check Status
            </button>
            <button
              onClick={handleCancelSearch}
              className={`py-2 px-4 text-slate-600 hover:text-slate-800 hover:bg-slate-100 ${radius.md} ${transitions.fast} inline-flex items-center gap-2`}
            >
              <XCircle size={16} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render search form
  if (viewState === 'search') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-navy mb-2">Lead Finder</h1>
          <p className="text-slate-600">
            Search for businesses and import them directly as leads
          </p>
        </div>

        {/* How It Works */}
        <div className={`bg-slate-50 p-5 ${radius.md} mb-6 border border-slate-200`}>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">How It Works</h2>
          <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
            <li>Enter a business type (e.g., "plumber") and optionally a city or region</li>
            <li>We search Facebook Ads for businesses running ads in your niche</li>
            <li>For each advertiser, we extract contact info including website, phone, and social links</li>
            <li>Preview the results and import them into your pipeline</li>
          </ol>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-6">
          <div className={`bg-white p-6 ${radius.md} ${shadows.sm} border border-slate-200`}>
            {/* Keyword */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Type / Keyword *
              </label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., plumber, electrician, dentist"
                  className={`w-full pl-10 pr-4 py-2.5 border border-slate-200 ${radius.md} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${transitions.fast}`}
                  disabled={isStarting}
                />
              </div>
            </div>

            {/* Location */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                City / Region (optional)
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Sydney, Los Angeles, London"
                  className={`w-full pl-10 pr-4 py-2.5 border border-slate-200 ${radius.md} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${transitions.fast}`}
                  disabled={isStarting}
                />
              </div>
            </div>

            {/* Country */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country *
              </label>
              <div className="relative">
                <Globe size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border border-slate-200 ${radius.md} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${transitions.fast} appearance-none bg-white`}
                  disabled={isStarting}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Listings to Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Maximum Listings to Search
              </label>
              <div className="relative">
                <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={maxAds}
                  onChange={(e) => setMaxAds(Math.min(Number(e.target.value), maxAllowed))}
                  min={1}
                  max={maxAllowed}
                  className={`w-full pl-10 pr-4 py-2.5 border border-slate-200 ${radius.md} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${transitions.fast}`}
                  disabled={isStarting}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                How many Facebook Ads to search. Actual leads found may be fewer due to duplicates.
                {!isPro && ` Free: up to ${MAX_ADS_FREE}. Pro: up to ${MAX_ADS_PRO}.`}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={`bg-red-50 p-4 ${radius.md} flex items-start gap-3`}>
              <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isStarting || !keyword.trim()}
            className={`w-full py-3 px-4 bg-blue-600 text-white font-medium ${radius.md} hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${transitions.fast} flex items-center justify-center gap-2`}
          >
            {isStarting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Starting search...
              </>
            ) : (
              <>
                <Search size={18} />
                Find Leads
              </>
            )}
          </button>
        </form>
      </div>
    );
  }

  // Render preview view
  if (viewState === 'preview') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleNewSearch}
            className={`p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 ${radius.md} ${transitions.fast}`}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-navy">Search Results</h1>
            <p className="text-slate-600">
              {searchParams?.keyword}
              {searchParams?.location && ` in ${searchParams.location}`}
              {searchParams?.country && `, ${searchParams.country}`}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`bg-white p-4 ${radius.md} ${shadows.sm} border border-slate-200`}>
            <p className="text-2xl font-semibold text-slate-800">{totalFound}</p>
            <p className="text-xs text-slate-500">Listings Scraped</p>
          </div>
          <div className={`bg-white p-4 ${radius.md} ${shadows.sm} border border-emerald-200 bg-emerald-50`}>
            <p className="text-2xl font-semibold text-emerald-600">{(previewLeads || []).length}</p>
            <p className="text-xs text-slate-500">New Leads</p>
          </div>
          <div className={`bg-white p-4 ${radius.md} ${shadows.sm} border border-slate-200`}>
            <p className="text-2xl font-semibold text-slate-400">{(duplicateLeads || []).length}</p>
            <p className="text-xs text-slate-500">Duplicates</p>
          </div>
          <div className={`bg-white p-4 ${radius.md} ${shadows.sm} border border-blue-200 bg-blue-50`}>
            <p className="text-2xl font-semibold text-blue-600">{leadsWithFacebook}</p>
            <p className="text-xs text-slate-500">With Facebook</p>
          </div>
        </div>

        {/* Data Quality Stats */}
        <div className={`bg-slate-50 p-4 ${radius.md} mb-6 border border-slate-200`}>
          <p className="text-sm font-medium text-slate-700 mb-2">Data Quality</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Phone size={14} className="text-slate-400" />
              {leadsWithPhone} with phone
            </span>
            <span className="flex items-center gap-1">
              <Mail size={14} className="text-slate-400" />
              {leadsWithEmail} with email
            </span>
            <span className="flex items-center gap-1">
              <Facebook size={14} className="text-slate-400" />
              {leadsWithFacebook} with Facebook
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`bg-red-50 p-4 ${radius.md} flex items-start gap-3 mb-6`}>
            <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Leads List */}
        {(previewLeads || []).length > 0 ? (
          <div className={`bg-white ${radius.md} ${shadows.sm} border border-slate-200 mb-6 overflow-hidden`}>
            <div className="max-h-96 overflow-y-auto">
              {(previewLeads || []).map((lead, index) => (
                <div
                  key={index}
                  className={`p-4 ${index !== (previewLeads || []).length - 1 ? 'border-b border-slate-100' : ''} hover:bg-slate-50 ${transitions.fast}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">{lead.company_name}</h3>
                      {lead.category && (
                        <p className="text-xs text-slate-500 mt-0.5">{lead.category}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-slate-400" />
                            {lead.email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lead.website && (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 ${radius.sm} ${transitions.fast}`}
                          title="Website"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      {lead.facebook_url && (
                        <a
                          href={lead.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 ${radius.sm} ${transitions.fast}`}
                          title="Facebook"
                        >
                          <Facebook size={16} />
                        </a>
                      )}
                      {lead.instagram_url && (
                        <a
                          href={lead.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 text-slate-400 hover:text-pink-600 hover:bg-pink-50 ${radius.sm} ${transitions.fast}`}
                          title="Instagram"
                        >
                          <Instagram size={16} />
                        </a>
                      )}
                      {lead.linkedin_url && (
                        <a
                          href={lead.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 ${radius.sm} ${transitions.fast}`}
                          title="LinkedIn"
                        >
                          <Linkedin size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`bg-slate-50 p-8 ${radius.md} text-center mb-6`}>
            <p className="text-slate-600">No new leads found. All results are duplicates of existing leads.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleNewSearch}
            className={`flex-1 py-3 px-4 border border-slate-200 text-slate-700 font-medium ${radius.md} hover:bg-slate-50 ${transitions.fast} flex items-center justify-center gap-2`}
          >
            <ArrowLeft size={18} />
            New Search
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting || (previewLeads || []).length === 0}
            className={`flex-1 py-3 px-4 bg-blue-600 text-white font-medium ${radius.md} hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${transitions.fast} flex items-center justify-center gap-2`}
          >
            {isImporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download size={18} />
                Import {(previewLeads || []).length} Leads
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render imported success view
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className={`bg-emerald-50 p-8 ${radius.md} border border-emerald-200 text-center`}>
        <CheckCircle2 size={48} className="text-emerald-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-emerald-800 mb-2">Import Complete!</h2>
        <p className="text-emerald-700 mb-6">
          Successfully imported {importedCount} leads into your pipeline.
        </p>
        <button
          onClick={handleNewSearch}
          className={`py-3 px-6 bg-emerald-600 text-white font-medium ${radius.md} hover:bg-emerald-700 ${transitions.fast} inline-flex items-center gap-2`}
        >
          <Search size={18} />
          Find More Leads
        </button>
      </div>
    </div>
  );
};

export default LeadFinder;
