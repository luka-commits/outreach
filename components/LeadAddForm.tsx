import React, { useState, useRef, useEffect } from 'react';
import { X, UserPlus, Building, Mail, Phone, Globe, Instagram, Facebook, Linkedin, MapPin, Loader2, CheckCircle2, Link2, ChevronDown, Zap } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Lead, ScrapeUrlResponse } from '../types';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../hooks/useAuth';
import { useUrlScrapeUsageQuery } from '../hooks/queries/useUrlScrapeUsageQuery';
import { useStrategiesQuery } from '../hooks/queries/useStrategiesQuery';
import { getSession } from '../services/supabase';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { queryKeys } from '../lib/queryClient';
import { getStrategyColor } from '../utils/styles';

interface LeadAddFormProps {
  onClose: () => void;
  onAdd: (lead: Lead) => Promise<void> | void;
  currentLeadCount: number;
}

const LeadAddForm: React.FC<LeadAddFormProps> = ({ onClose, onAdd, currentLeadCount }) => {
  const { checkLimit, checkUrlScrapeLimit, limits, isPro } = useSubscription();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: urlScrapeUsage = 0 } = useUrlScrapeUsageQuery(user?.id);
  const { data: strategies = [] } = useStrategiesQuery(user?.id);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Strategy selection state
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const strategyDropdownRef = useRef<HTMLDivElement>(null);

  // Refetch strategies when modal opens to ensure fresh data
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.strategies(user.id) });
    }
  }, [user?.id, queryClient]);

  // Close strategy dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (strategyDropdownRef.current && !strategyDropdownRef.current.contains(event.target as Node)) {
        setShowStrategyDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId) || null;

  // URL import state
  const [importUrl, setImportUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [wasImported, setWasImported] = useState(false);

  // Calculate remaining URL scrapes
  const { allowed: canScrape, remaining: scrapesRemaining } = checkUrlScrapeLimit(urlScrapeUsage);

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    websiteUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    linkedinUrl: '',
    address: '',
  });

  const handleFetchUrl = async () => {
    if (!importUrl.trim()) return;

    // Check limit before making request
    if (!canScrape) {
      setFetchError(`Monthly limit reached (${limits.maxUrlScrapesPerMonth} URL scrapes). Upgrade to Pro for unlimited.`);
      return;
    }

    setFetchError(null);
    setIsFetching(true);
    setWasImported(false);

    try {
      // Normalize URL
      let url = importUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const session = await getSession();
      if (!session) {
        throw new Error('Please sign in to use this feature.');
      }

      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
      const response = await fetchWithTimeout(
        `${supabaseUrl}/functions/v1/scrape-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url }),
        },
        45000 // 45 second timeout (page fetch + AI processing)
      );

      const result: ScrapeUrlResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to extract data from URL');
      }

      // Auto-fill form with extracted data
      if (result.data) {
        setFormData(prev => ({
          ...prev,
          companyName: result.data!.companyName || prev.companyName,
          contactName: result.data!.contactName || prev.contactName,
          email: result.data!.email || prev.email,
          phone: result.data!.phone || prev.phone,
          websiteUrl: result.data!.websiteUrl || url,
          instagramUrl: result.data!.instagramUrl || prev.instagramUrl,
          facebookUrl: result.data!.facebookUrl || prev.facebookUrl,
          linkedinUrl: result.data!.linkedinUrl || prev.linkedinUrl,
          address: result.data!.address || prev.address,
        }));
      }

      setWasImported(true);

      // Invalidate the usage query to refresh the count
      queryClient.invalidateQueries({ queryKey: queryKeys.urlScrapeUsage(user?.id) });

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch URL';
      setFetchError(message);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check Limit
    if (!checkLimit(currentLeadCount, 'leads')) {
      setError(`Limit reached! Free plan is limited to ${limits.maxLeads} leads. Upgrade to Pro.`);
      return;
    }

    // Validate required fields
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }

    const newLead: Lead = {
      id: crypto.randomUUID(),
      ...formData,
      currentStepIndex: 0,
      status: selectedStrategyId ? 'in_progress' : 'not_contacted',
      strategyId: selectedStrategyId || undefined,
      nextTaskDate: selectedStrategyId ? new Date().toISOString() : undefined,
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      await onAdd(newLead);
    } catch {
      setError('Failed to create lead. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg p-10 animate-in zoom-in duration-300 relative shadow-md">
        <button onClick={onClose} className="absolute top-8 right-8 p-3 text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-md">
          <X size={24} />
        </button>

        <header className="mb-10 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <UserPlus size={40} />
          </div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">New Lead</h3>
          <p className="text-slate-500 mt-2 font-medium">Create a single entry for manual outreach tracking.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8 max-h-[70vh] overflow-y-auto pr-4 scrollbar-hide">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {/* Quick Import from URL */}
          <div className="border-b border-slate-100 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Quick Import</h4>
              {!isPro && (
                <span className="text-[10px] font-medium text-slate-400">
                  {scrapesRemaining === Infinity ? 'Unlimited' : `${scrapesRemaining} scrapes left`}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1 group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                  <Link2 size={18} />
                </div>
                <input
                  type="url"
                  placeholder="Paste website URL to auto-fill..."
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFetchUrl();
                    }
                  }}
                  disabled={isFetching}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 outline-none transition-all disabled:opacity-50"
                />
              </div>
              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isFetching || !importUrl.trim()}
                className="px-5 py-3 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isFetching ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  'Fetch'
                )}
              </button>
            </div>
            {fetchError && (
              <p className="mt-3 text-sm text-rose-500">{fetchError}</p>
            )}
            {wasImported && !fetchError && (
              <p className="mt-3 text-sm text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Fields auto-filled. Review and edit below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Company & Contact</h4>
              <FormInput icon={<Building size={18} />} name="companyName" placeholder="Company Name *" value={formData.companyName} onChange={handleChange} required />
              <FormInput icon={<UserPlus size={18} />} name="contactName" placeholder="Contact Person" value={formData.contactName} onChange={handleChange} />
              <FormInput icon={<Mail size={18} />} name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} type="email" />
              <FormInput icon={<Phone size={18} />} name="phone" placeholder="Phone Number" value={formData.phone} onChange={handleChange} />
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Digital Presence</h4>
              <FormInput icon={<Globe size={18} />} name="websiteUrl" placeholder="Website URL" value={formData.websiteUrl} onChange={handleChange} />
              <FormInput icon={<Instagram size={18} />} name="instagramUrl" placeholder="Instagram URL" value={formData.instagramUrl} onChange={handleChange} />
              <FormInput icon={<Facebook size={18} />} name="facebookUrl" placeholder="Facebook URL" value={formData.facebookUrl} onChange={handleChange} />
              <FormInput icon={<Linkedin size={18} />} name="linkedinUrl" placeholder="LinkedIn URL" value={formData.linkedinUrl} onChange={handleChange} />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Location Details</h4>
            <div className="relative group">
              <div className="absolute left-4 top-4 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <MapPin size={20} />
              </div>
              <textarea
                name="address"
                placeholder="Business Physical Address (for Walk-ins)"
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 outline-none transition-all min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1">Strategy (Optional)</h4>
            <div className="relative" ref={strategyDropdownRef}>
              <button
                type="button"
                onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium hover:bg-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 outline-none transition-all"
              >
                <div className="flex items-center gap-3">
                  {selectedStrategy ? (
                    <>
                      <div className={`w-3 h-3 rounded-full ${getStrategyColor(selectedStrategy.color).solid}`} />
                      <span>{selectedStrategy.name}</span>
                      <span className="text-xs text-slate-400">({selectedStrategy.steps.length} steps)</span>
                    </>
                  ) : (
                    <>
                      <Zap size={18} className="text-slate-300" />
                      <span className="text-slate-400">Assign later</span>
                    </>
                  )}
                </div>
                <ChevronDown size={18} className={`text-slate-400 transition-transform ${showStrategyDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStrategyDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 max-h-[200px] overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStrategyId(null);
                      setShowStrategyDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      !selectedStrategyId
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium">Assign later</p>
                    <p className="text-xs text-slate-400 mt-0.5">Create lead without a strategy</p>
                  </button>
                  {strategies.map((s) => {
                    const colorStyles = getStrategyColor(s.color);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStrategyId(s.id);
                          setShowStrategyDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          selectedStrategyId === s.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${colorStyles.solid}`} />
                          <span className="font-medium">{s.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 ml-[18px]">
                          {s.steps.length} steps • {s.description || 'No description'}
                        </p>
                      </button>
                    );
                  })}
                  {strategies.length === 0 && (
                    <p className="px-4 py-2.5 text-sm text-slate-400">No strategies created yet</p>
                  )}
                </div>
              )}
            </div>
            {selectedStrategy && (
              <p className="text-xs text-slate-500 ml-1">
                Lead will start with status "In Progress" and first task scheduled for today.
              </p>
            )}
          </div>

          <div className="pt-8 border-t border-slate-100 flex gap-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-4 text-slate-500 font-medium text-sm hover:bg-slate-50 rounded-md transition-all disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Lead Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormInput: React.FC<{ icon: React.ReactNode, name: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean }> = ({ icon, name, placeholder, value, onChange, type = "text", required }) => (
  <div className="relative group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
      {icon}
    </div>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-slate-700 font-medium placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 outline-none transition-all"
    />
  </div>
);

export default LeadAddForm;
