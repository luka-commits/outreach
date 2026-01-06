import React, { useState } from 'react';
import { Search, MapPin, Globe, Users, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { queryClient, queryKeys } from '../lib/queryClient';
import { useToast } from './Toast';
import { radius, shadows, transitions } from '../lib/designTokens';

interface LeadFinderProps {
  onNavigateToSettings?: () => void;
}

interface ScrapedLead {
  company_name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating?: number;
  review_count?: number;
  category?: string;
  facebook_url?: string;
  instagram_url?: string;
}

interface ScrapeResponse {
  success: boolean;
  leads: ScrapedLead[];
  total_found: number;
  imported: number;
  skipped: number;
  message?: string;
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

interface SearchResult {
  totalFound: number;
  imported: number;
  skipped: number;
}

const LeadFinder: React.FC<LeadFinderProps> = ({ onNavigateToSettings: _onNavigateToSettings }) => {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const { showToast } = useToast();

  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('US');
  const [maxAds, setMaxAds] = useState(50);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);

  const maxAllowed = isPro ? MAX_ADS_PRO : MAX_ADS_FREE;

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

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call our edge function which will call Modal
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

      const data: ScrapeResponse = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to scrape leads');
      }

      setResult({
        totalFound: data.total_found,
        imported: data.imported,
        skipped: data.skipped,
      });

      // Invalidate leads query to show new leads
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.leads(user.id) });
      }

      showToast(`Imported ${data.imported} leads!`, 'success');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
          <li>We search Google Maps for matching business listings</li>
          <li>For each listing, we extract contact info including website, phone, and social links</li>
          <li>New businesses are imported as leads (duplicates are automatically skipped)</li>
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              How many Google Maps listings to search. Actual leads imported may be fewer due to duplicates.
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

        {/* Success Result */}
        {result && (
          <div className={`bg-emerald-50 p-4 ${radius.md} border border-emerald-200`}>
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-emerald-800">Search Complete!</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={`bg-white p-3 ${radius.md}`}>
                <p className="text-2xl font-semibold text-slate-800">{result.totalFound}</p>
                <p className="text-xs text-slate-500">Listings Found</p>
              </div>
              <div className={`bg-white p-3 ${radius.md}`}>
                <p className="text-2xl font-semibold text-emerald-600">{result.imported}</p>
                <p className="text-xs text-slate-500">Leads Imported</p>
              </div>
              <div className={`bg-white p-3 ${radius.md}`}>
                <p className="text-2xl font-semibold text-slate-400">{result.skipped}</p>
                <p className="text-xs text-slate-500">Duplicates Skipped</p>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !keyword.trim()}
          className={`w-full py-3 px-4 bg-blue-600 text-white font-medium ${radius.md} hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed ${transitions.fast} flex items-center justify-center gap-2`}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Searching... This may take a minute
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
};

export default LeadFinder;
