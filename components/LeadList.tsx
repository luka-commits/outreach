import React, { useState, useCallback, memo, useDeferredValue, useEffect, useMemo } from 'react';
import { Search, Plus, ChevronRight, Instagram, Mail, Phone, Facebook, Users, Globe, Filter, MapPin, Target, Star, ChevronDown, ListFilter, X, Download, Loader2, ChevronLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Lead, LeadStatus, Strategy } from '../types';
import { getLeadStatusStyle, getRatingColor } from '../utils/styles';
import { useAuth } from '../hooks/useAuth';
import { useLeadsPaginatedQuery } from '../hooks/queries/useLeadsPaginated';
import { SortField, SortDirection, LeadFilters } from '../services/supabase';
import { ColumnFilterDropdown } from './ColumnFilterDropdown';

// Utility: Show only first niche term to keep table clean
const getFirstNiche = (niche?: string): string => {
  if (!niche) return 'Other';
  const first = niche.split(/[,;\/]/)[0].trim();
  return first.length > 25 ? first.substring(0, 25) + '…' : first;
};

type PageSize = 10 | 25 | 50 | 100;

interface LeadListProps {
  strategies: Strategy[];
  onSelectLead: (id: string) => void;
  onOpenUpload: () => void;
  onUpdateLead: (lead: Lead) => void;
}

// Channel filter type for array-based filtering
type ChannelFilter = LeadFilters['channels'];

// Status options for the filter dropdown
const STATUS_OPTIONS = [
  { value: 'not_contacted', label: 'New Leads' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'replied', label: 'Responded' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Not a Fit' },
];

// Channel options for the filter dropdown
const CHANNEL_OPTIONS = [
  { value: 'has_instagram', label: 'Has Instagram' },
  { value: 'has_facebook', label: 'Has Facebook' },
  { value: 'has_linkedin', label: 'Has LinkedIn' },
  { value: 'has_email', label: 'Has Email' },
  { value: 'has_phone', label: 'Has Phone' },
];

const LeadList: React.FC<LeadListProps> = ({ strategies, onSelectLead, onOpenUpload, onUpdateLead }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  // Array-based filters for Excel-style multi-select
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [strategyFilter, setStrategyFilter] = useState<string[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>([]);
  const [ratingRange, setRatingRange] = useState<{ min?: number; max?: number }>({});

  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Multi-column sort: arrays of fields and their directions
  const [sortFields, setSortFields] = useState<SortField[]>(['created_at']);
  const [sortDirections, setSortDirections] = useState<SortDirection[]>(['desc']);

  // Defer search value to avoid hammering the API
  const deferredSearch = useDeferredValue(search);

  // Build filters object for query
  const filters: LeadFilters = useMemo(() => ({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    strategyId: strategyFilter.length > 0 ? strategyFilter : undefined,
    channels: channelFilter && channelFilter.length > 0 ? channelFilter : undefined,
    ratingMin: ratingRange.min,
    ratingMax: ratingRange.max,
    search: deferredSearch || undefined,
    sortBy: sortFields,
    sortDirection: sortDirections,
  }), [pageSize, currentPage, statusFilter, strategyFilter, channelFilter, ratingRange, deferredSearch, sortFields, sortDirections]);

  // Query for data
  const { data, isLoading, isPlaceholderData } = useLeadsPaginatedQuery(user?.id, filters);

  // Reset sort to default
  const resetSort = useCallback(() => {
    setSortFields(['created_at']);
    setSortDirections(['desc']);
    setCurrentPage(1);
  }, []);

  const leads = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Count active filters for display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter.length > 0) count++;
    if (strategyFilter.length > 0) count++;
    if (channelFilter && channelFilter.length > 0) count++;
    if (ratingRange.min !== undefined || ratingRange.max !== undefined) count++;
    return count;
  }, [statusFilter, strategyFilter, channelFilter, ratingRange]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setStatusFilter([]);
    setStrategyFilter([]);
    setChannelFilter([]);
    setRatingRange({});
    resetSort();
    setCurrentPage(1);
  }, []);

  // Strategy options for dropdown
  const strategyOptions = useMemo(() => [
    { value: 'none', label: 'No Sequence' },
    ...strategies.map(s => ({ value: s.id, label: s.name }))
  ], [strategies]);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch]);

  const handlePageSizeChange = useCallback((newSize: PageSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  // Export current view (simplified for now)
  const exportToCSV = useCallback(() => {
    if (!leads.length) return;

    // NOTE: This currently only exports the current page. 
    // For full export, we would need a separate API call to fetch all matching leads.
    const headers = ['Company Name', 'Contact Name', 'Email', 'Phone', 'Website', 'Instagram', 'Facebook', 'LinkedIn', 'Address', 'Location', 'Niche', 'Google Rating', 'Reviews', 'Status'];
    const rows = leads.map(lead => [
      lead.companyName,
      lead.contactName || '',
      lead.email || '',
      lead.phone || '',
      lead.websiteUrl || '',
      lead.instagramUrl || '',
      lead.facebookUrl || '',
      lead.linkedinUrl || '',
      lead.address || '',
      lead.location || '',
      lead.niche || '',
      lead.googleRating?.toString() || '',
      lead.googleReviewCount?.toString() || '',
      lead.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [leads]);

  const handleStrategyChange = (lead: Lead, strategyId: string) => {
    if (!strategyId) {
      onUpdateLead({ ...lead, strategyId: undefined, currentStepIndex: 0, status: 'not_contacted' });
      return;
    }
    onUpdateLead({ ...lead, strategyId, currentStepIndex: 0, status: 'in_progress', nextTaskDate: new Date().toISOString() });
  };


  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-100 text-white"><Users size={28} /></div>
            Pipeline
          </h2>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-3">
            Showing {totalCount.toLocaleString()} leads
            {activeFilterCount > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 text-indigo-600">
                  <Filter size={14} />
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
                <button
                  onClick={clearAllFilters}
                  className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                >
                  <X size={14} /> Clear
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group min-w-[320px]">
            {isLoading || isPlaceholderData ? (
              <Loader2 className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={20} />
            ) : (
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            )}
            <input
              type="text"
              placeholder="Search companies, niche, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none w-full transition-all shadow-sm ${isLoading ? 'opacity-80' : ''}`}
            />
          </div>
          <button
            onClick={exportToCSV}
            disabled={leads.length === 0}
            className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 font-black px-6 py-4 rounded-2xl transition-all shadow-sm flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} /> Export Page
          </button>
          <button onClick={onOpenUpload} className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center gap-3 text-xs uppercase tracking-widest">
            <Plus size={20} /> Import
          </button>
        </div>
      </header>

      <div className={`bg-white border border-slate-200 rounded-[3rem] shadow-sm flex-1 flex flex-col min-h-[600px] transition-opacity ${isLoading && !isPlaceholderData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* Table Header with Excel-style column filters */}
        <div className="bg-slate-50/90 backdrop-blur-xl border-b border-slate-100 rounded-t-[3rem]">
          <div className="grid grid-cols-[60px_minmax(180px,2fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)_100px_180px_130px_130px_50px] min-w-[1200px]">
            <div className="px-4 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-center">#</div>

            {/* Prospect column - sortable, no filter */}
            <div className="px-4 py-5">
              <ColumnFilterDropdown
                label="Prospect"
                field="company_name"
                sortable={true}
                sortDirection={sortFields.includes('company_name') ? sortDirections[sortFields.indexOf('company_name')] : null}
                sortPriority={sortFields.length > 1 && sortFields.includes('company_name') ? sortFields.indexOf('company_name') + 1 : undefined}
                onSort={(dir) => {
                  const idx = sortFields.indexOf('company_name');
                  if (idx !== -1) {
                    setSortDirections(prev => prev.map((d, i) => i === idx ? dir : d));
                  } else {
                    setSortFields(prev => [...prev, 'company_name']);
                    setSortDirections(prev => [...prev, dir]);
                  }
                  setCurrentPage(1);
                }}
                filterType="none"
              />
            </div>

            {/* Location column - not sortable, but filterable (would need dynamic options) */}
            <div className="px-4 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Location</div>

            {/* Industry column - not sortable for now */}
            <div className="px-4 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">Industry</div>

            {/* Trust/Rating column - sortable with range filter */}
            <div className="px-4 py-5 flex justify-center">
              <ColumnFilterDropdown
                label="Trust"
                field="google_rating"
                sortable={true}
                sortDirection={sortFields.includes('google_rating') ? sortDirections[sortFields.indexOf('google_rating')] : null}
                sortPriority={sortFields.length > 1 && sortFields.includes('google_rating') ? sortFields.indexOf('google_rating') + 1 : undefined}
                onSort={(dir) => {
                  const idx = sortFields.indexOf('google_rating');
                  if (idx !== -1) {
                    setSortDirections(prev => prev.map((d, i) => i === idx ? dir : d));
                  } else {
                    setSortFields(prev => [...prev, 'google_rating']);
                    setSortDirections(prev => [...prev, dir]);
                  }
                  setCurrentPage(1);
                }}
                filterType="range"
                rangeMin={0}
                rangeMax={5}
                rangeValue={ratingRange}
                onRangeChange={(val) => { setRatingRange(val); setCurrentPage(1); }}
              />
            </div>

            {/* Sequence column - filterable with strategies */}
            <div className="px-4 py-5 flex justify-center">
              <ColumnFilterDropdown
                label="Sequence"
                field="strategy_id"
                sortable={false}
                filterType="multiselect"
                options={strategyOptions.map(s => s.label)}
                selectedValues={strategyFilter.map(id => {
                  const strategy = strategyOptions.find(s => s.value === id);
                  return strategy?.label || id;
                })}
                onFilterChange={(labels) => {
                  const ids = labels.map(label => {
                    const strategy = strategyOptions.find(s => s.label === label);
                    return strategy?.value || label;
                  });
                  setStrategyFilter(ids);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Channels column - filterable */}
            <div className="px-4 py-5 flex justify-center">
              <ColumnFilterDropdown
                label="Channels"
                field="channels"
                sortable={false}
                filterType="multiselect"
                options={CHANNEL_OPTIONS.map(c => c.label)}
                selectedValues={(channelFilter || []).map(ch => {
                  const opt = CHANNEL_OPTIONS.find(c => c.value === ch);
                  return opt?.label || ch;
                })}
                onFilterChange={(labels) => {
                  const values = labels.map(label => {
                    const opt = CHANNEL_OPTIONS.find(c => c.label === label);
                    return opt?.value || label;
                  }) as ChannelFilter;
                  setChannelFilter(values);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status column - sortable and filterable */}
            <div className="px-4 py-5">
              <ColumnFilterDropdown
                label="Status"
                field="status"
                sortable={true}
                sortDirection={sortFields.includes('status') ? sortDirections[sortFields.indexOf('status')] : null}
                sortPriority={sortFields.length > 1 && sortFields.includes('status') ? sortFields.indexOf('status') + 1 : undefined}
                onSort={(dir) => {
                  const idx = sortFields.indexOf('status');
                  if (idx !== -1) {
                    setSortDirections(prev => prev.map((d, i) => i === idx ? dir : d));
                  } else {
                    setSortFields(prev => [...prev, 'status']);
                    setSortDirections(prev => [...prev, dir]);
                  }
                  setCurrentPage(1);
                }}
                filterType="multiselect"
                options={STATUS_OPTIONS.map(s => s.label)}
                selectedValues={statusFilter.map(val => {
                  const opt = STATUS_OPTIONS.find(s => s.value === val);
                  return opt?.label || val;
                })}
                onFilterChange={(labels) => {
                  const values = labels.map(label => {
                    const opt = STATUS_OPTIONS.find(s => s.label === label);
                    return opt?.value || label;
                  });
                  setStatusFilter(values);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="px-4 py-5"></div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto flex-1">
          {leads.length > 0 ? (
            <div className="min-w-[1200px]">
              {leads.map((lead, idx) => {
                const globalIdx = (currentPage - 1) * pageSize + idx;
                return (
                  <div
                    key={lead.id}
                    className="group hover:bg-indigo-50/30 transition-all cursor-pointer border-b border-slate-50"
                    onClick={() => onSelectLead(lead.id)}
                  >
                    <div className="grid grid-cols-[60px_minmax(180px,2fr)_minmax(140px,1.2fr)_minmax(140px,1.2fr)_100px_180px_130px_130px_50px] items-center">
                      <div className="px-4 py-5 text-xs text-slate-300 text-center font-bold">{globalIdx + 1}</div>
                      <div className="px-4 py-5">
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-base" title={lead.companyName}>{lead.companyName}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {lead.contactName && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide" title={lead.contactName}>{lead.contactName}</span>}
                          {lead.websiteUrl && <div className="bg-slate-100 p-1.5 rounded-md shrink-0"><Globe size={12} className="text-slate-400" /></div>}
                        </div>
                      </div>
                      <div className="px-4 py-5">
                        <div className="flex items-start gap-2 text-xs font-black text-slate-500 uppercase tracking-tight">
                          <MapPin size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                          <span className="break-words" title={lead.location || 'Unknown'}>{lead.location || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="px-4 py-5">
                        <div className="flex items-start gap-2 text-xs font-black text-slate-500 uppercase tracking-tight">
                          <Target size={14} className="text-slate-300 shrink-0 mt-0.5" />
                          <span className="break-words" title={lead.niche || 'Other'}>{getFirstNiche(lead.niche)}</span>
                        </div>
                      </div>
                      <div className="px-4 py-5">
                        <div className="flex flex-col items-center justify-center">
                          <div className="flex items-center gap-1.5">
                            <Star size={14} className={lead.googleRating ? 'text-amber-400 fill-amber-400' : 'text-slate-100'} />
                            <span className={`text-xs font-black ${getRatingColor(lead.googleRating)}`}>
                              {lead.googleRating ? lead.googleRating.toFixed(1) : '-'}
                            </span>
                          </div>
                          <span className="text-[9px] font-black text-slate-300 uppercase mt-0.5">{lead.googleReviewCount || 0} REVS</span>
                        </div>
                      </div>
                      <div className="px-4 py-5" onClick={e => e.stopPropagation()}>
                        <div className="relative group/select">
                          <select
                            value={lead.strategyId || ''}
                            onChange={(e) => handleStrategyChange(lead, e.target.value)}
                            className={`appearance-none text-[10px] font-black uppercase px-4 py-2.5 rounded-2xl border transition-all cursor-pointer pr-8 w-full text-center ${lead.strategyId
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100'
                                : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'
                              }`}
                          >
                            <option value="">Select Strategy</option>
                            {strategies.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${lead.strategyId ? 'text-indigo-200' : 'text-slate-300'}`} />
                        </div>
                      </div>
                      <div className="px-4 py-5">
                        <div className="flex justify-center gap-1.5">
                          <Indicator active={!!lead.instagramUrl} icon={<Instagram size={14} />} activeClass="bg-pink-500 text-white shadow-lg shadow-pink-100" />
                          <Indicator active={!!lead.facebookUrl} icon={<Facebook size={14} />} activeClass="bg-blue-600 text-white shadow-lg shadow-blue-100" />
                          <Indicator active={!!lead.email} icon={<Mail size={14} />} activeClass="bg-rose-500 text-white shadow-lg shadow-rose-100" />
                          <Indicator active={!!lead.phone} icon={<Phone size={14} />} activeClass="bg-emerald-500 text-white shadow-lg shadow-emerald-100" />
                        </div>
                      </div>
                      <div className="px-4 py-5" onClick={e => e.stopPropagation()}>
                        <div className={`text-[10px] font-black uppercase py-2.5 px-3 rounded-[1.25rem] border text-center shadow-sm whitespace-nowrap ${getLeadStatusStyle(lead.status)}`}>
                          {lead.status.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="px-4 py-5 text-right">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-40 text-slate-300">
              <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 shadow-inner">
                <ListFilter size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">No Leads Found</h3>
              <p className="font-bold text-slate-400 mt-2 text-center max-w-xs">Adjust your dropdown filters or search term to discover leads.</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                Showing <span className="font-bold text-slate-700">{(currentPage - 1) * pageSize + 1}</span>
                {' - '}
                <span className="font-bold text-slate-700">{Math.min(currentPage * pageSize, totalCount)}</span>
                {' of '}
                <span className="font-bold text-slate-700">{totalCount.toLocaleString()}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase font-bold">Per page:</span>
                {([10, 25, 50, 100] as PageSize[]).map(size => (
                  <button
                    key={size}
                    onClick={() => handlePageSizeChange(size)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${pageSize === size
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-slate-400">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-9 h-9 rounded-lg text-sm font-bold bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-all"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Channel indicator for the table rows
const Indicator = memo<{ active: boolean; icon: React.ReactNode; activeClass: string }>(
  ({ active, icon, activeClass }) => (
    <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${active ? activeClass : 'bg-white border-slate-100 text-slate-200'}`}>
      {icon}
    </div>
  )
);

Indicator.displayName = 'Indicator';

export default LeadList;
