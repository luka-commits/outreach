import React, { useState, useCallback, memo, useDeferredValue, useEffect, useMemo } from 'react';
import { Search, Plus, ChevronRight, Instagram, Mail, Phone, Facebook, Users, Globe, Filter, Star, ChevronDown, ListFilter, X, Download, Loader2, ChevronLeft, Trash2, Tag, CheckSquare, Square, Target, Edit3, Bookmark, Copy } from 'lucide-react';
import { Lead, Strategy } from '../types';
import { getLeadStatusStyle, getRatingColor, getStrategyColor } from '../utils/styles';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useLeadsPaginatedQuery, usePaginatedLeadMutations, usePrefetchLeadsPage } from '../hooks/queries/useLeadsPaginated';
import { useCreateSavedFilter, useDuplicatesSummary } from '../hooks/queries';
import { SortField, SortDirection, LeadFilters, bulkUpdateLeadFields } from '../services/supabase';
import { useToast } from './Toast';
import { getErrorMessage } from '../utils/errorMessages';
import { ColumnFilterDropdown } from './ColumnFilterDropdown';
import BulkStatusModal from './BulkStatusModal';
import BulkStrategyModal from './BulkStrategyModal';
import BulkEditModal from './BulkEditModal';
import ConfirmModal from './ConfirmModal';
import ExportModal from './ExportModal';
import { EmptyState } from './ui/EmptyState';
import { LeadListSkeleton } from './ui/Skeleton';
import { SaveFilterModal } from './SaveFilterModal';
import { useSavedFiltersContext } from '../contexts/SavedFiltersContext';
import { useNavigation } from '../contexts/NavigationContext';

// Utility: Show only first niche term to keep table clean
const getFirstNiche = (niche?: string): string => {
  if (!niche) return 'Other';
  const parts = niche.split(/[,;/]/);
  const first = (parts[0] ?? '').trim();
  return first.length > 25 ? first.substring(0, 25) + '…' : first;
};

type PageSize = 10 | 25 | 50 | 100;

interface LeadListProps {
  strategies: Strategy[];
  onSelectLead: (id: string) => void;
  onOpenUpload: () => void;
  onUpdateLead: (lead: Lead) => void;
  onOpenFinder?: () => void;
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

const LeadList: React.FC<LeadListProps> = ({ strategies, onSelectLead, onOpenUpload, onUpdateLead, onOpenFinder }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { navigate } = useNavigation();
  const { activeSavedFilter, pendingFilters, clearPendingFilters, clearActiveSavedFilter } = useSavedFiltersContext();
  const createSavedFilter = useCreateSavedFilter(user?.id);
  const { data: duplicatesSummary } = useDuplicatesSummary(user?.id);
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

  // Selection state for bulk actions
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  // Modal states for bulk actions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);

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

  // Prefetch hook for instant page navigation
  const { prefetchPage } = usePrefetchLeadsPage(user?.id, filters);

  // Bulk mutations
  const { bulkDelete, bulkUpdateStatus, bulkAssignStrategy } = usePaginatedLeadMutations(user?.id);

  // Clear selection when page/filters/search changes to avoid stale selection
  useEffect(() => {
    setSelectedLeadIds(new Set());
    setSelectAllChecked(false);
  }, [currentPage, statusFilter, strategyFilter, channelFilter, ratingRange, deferredSearch, sortFields, sortDirections]);

  // Apply pending filters from Smart List selection
  useEffect(() => {
    if (pendingFilters) {
      // Apply each filter from the saved filter
      if (pendingFilters.status) setStatusFilter(pendingFilters.status);
      else setStatusFilter([]);

      if (pendingFilters.strategyId) setStrategyFilter(pendingFilters.strategyId);
      else setStrategyFilter([]);

      if (pendingFilters.channels) setChannelFilter(pendingFilters.channels);
      else setChannelFilter([]);

      if (pendingFilters.ratingMin !== undefined || pendingFilters.ratingMax !== undefined) {
        setRatingRange({ min: pendingFilters.ratingMin, max: pendingFilters.ratingMax });
      } else {
        setRatingRange({});
      }

      if (pendingFilters.search) setSearch(pendingFilters.search);
      else setSearch('');

      if (pendingFilters.sortBy) setSortFields(pendingFilters.sortBy);
      else setSortFields(['created_at']);

      if (pendingFilters.sortDirection) setSortDirections(pendingFilters.sortDirection);
      else setSortDirections(['desc']);

      setCurrentPage(1);
      clearPendingFilters();
    }
  }, [pendingFilters, clearPendingFilters]);

  // Reset sort to default
  const resetSort = useCallback(() => {
    setSortFields(['created_at']);
    setSortDirections(['desc']);
    setCurrentPage(1);
  }, []);

  const leads = useMemo(() => data?.data || [], [data?.data]);
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
    setSearch('');
    resetSort();
    setCurrentPage(1);
    clearActiveSavedFilter();
  }, [clearActiveSavedFilter, resetSort]);

  // Handle save filter
  const handleSaveFilter = useCallback((filterData: { name: string; icon: string; color: string; filters: Record<string, unknown> }) => {
    createSavedFilter.mutate(filterData, {
      onSuccess: () => {
        showToast('Smart List created', 'success');
        setShowSaveFilterModal(false);
      },
      onError: (error) => {
        showToast(error instanceof Error ? error.message : 'Failed to save filter', 'error');
      },
    });
  }, [createSavedFilter, showToast]);

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

  const handleStrategyChange = (lead: Lead, strategyId: string) => {
    if (!strategyId) {
      onUpdateLead({ ...lead, strategyId: undefined, currentStepIndex: 0, status: 'not_contacted' });
      return;
    }
    onUpdateLead({ ...lead, strategyId, currentStepIndex: 0, status: 'in_progress', nextTaskDate: new Date().toISOString() });
  };

  // Selection handlers
  const toggleLeadSelection = useCallback((leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectAllChecked) {
      setSelectedLeadIds(new Set());
      setSelectAllChecked(false);
    } else {
      setSelectedLeadIds(new Set(leads.map(l => l.id)));
      setSelectAllChecked(true);
    }
  }, [selectAllChecked, leads]);

  const clearSelection = useCallback(() => {
    setSelectedLeadIds(new Set());
    setSelectAllChecked(false);
  }, []);

  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) {
      showToast('No leads selected', 'error');
      return;
    }
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        showToast(`Deleted ${ids.length} lead${ids.length !== 1 ? 's' : ''}`, 'success');
        clearSelection();
        setShowDeleteConfirm(false);
      },
      onError: (error) => {
        showToast(getErrorMessage(error), 'error');
      }
    });
  }, [selectedLeadIds, bulkDelete, clearSelection, showToast]);

  const handleBulkStatusChange = useCallback((status: Lead['status']) => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) {
      showToast('No leads selected', 'error');
      return;
    }
    bulkUpdateStatus.mutate({ ids, status }, {
      onSuccess: () => {
        showToast(`Updated status for ${ids.length} lead${ids.length !== 1 ? 's' : ''}`, 'success');
        clearSelection();
        setShowStatusModal(false);
      },
      onError: (error) => {
        showToast(getErrorMessage(error), 'error');
      }
    });
  }, [selectedLeadIds, bulkUpdateStatus, clearSelection, showToast]);

  const handleBulkStrategyAssign = useCallback((strategyId: string | null) => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) {
      showToast('No leads selected', 'error');
      return;
    }
    bulkAssignStrategy.mutate({ ids, strategyId }, {
      onSuccess: () => {
        showToast(`Assigned sequence to ${ids.length} lead${ids.length !== 1 ? 's' : ''}`, 'success');
        clearSelection();
        setShowStrategyModal(false);
      },
      onError: (error) => {
        showToast(getErrorMessage(error), 'error');
      }
    });
  }, [selectedLeadIds, bulkAssignStrategy, clearSelection, showToast]);

  const handleBulkFieldUpdate = useCallback(async (updates: Partial<Lead>) => {
    if (!user?.id) return;
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) {
      showToast('No leads selected', 'error');
      return;
    }
    try {
      await bulkUpdateLeadFields(ids, updates, user.id);
      showToast(`Updated ${ids.length} lead${ids.length !== 1 ? 's' : ''}`, 'success');
      // Invalidate leads query to refresh data
      queryClient.invalidateQueries({ queryKey: ['leads', user.id] });
      clearSelection();
    } catch (error) {
      console.error('Failed to bulk update leads:', error);
      showToast('Failed to update leads', 'error');
      throw error; // Re-throw so modal can handle error state
    }
  }, [user?.id, selectedLeadIds, queryClient, clearSelection, showToast]);

  // Update selectAllChecked when individual selections change
  useEffect(() => {
    if (leads.length > 0 && selectedLeadIds.size === leads.length) {
      setSelectAllChecked(true);
    } else if (selectAllChecked && selectedLeadIds.size < leads.length) {
      setSelectAllChecked(false);
    }
  }, [selectedLeadIds, leads.length, selectAllChecked]);

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-100 text-white"><Users size={28} /></div>
            Pipeline
          </h2>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
            Showing {totalCount.toLocaleString()} leads
            {activeSavedFilter && (
              <>
                <span className="text-slate-300">•</span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: activeSavedFilter.color + '20', color: activeSavedFilter.color }}
                >
                  <Bookmark size={12} />
                  {activeSavedFilter.name}
                </span>
              </>
            )}
            {activeFilterCount > 0 && !activeSavedFilter && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 text-indigo-600">
                  <Filter size={14} />
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              </>
            )}
            {(activeFilterCount > 0 || activeSavedFilter) && (
              <button
                onClick={clearAllFilters}
                className="text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
              >
                <X size={14} /> Clear
              </button>
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
          {activeFilterCount > 0 && !activeSavedFilter && (
            <button
              onClick={() => setShowSaveFilterModal(true)}
              className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 font-black px-6 py-4 rounded-2xl transition-all shadow-sm flex items-center gap-3 text-xs uppercase tracking-widest"
            >
              <Bookmark size={18} /> Save Filter
            </button>
          )}
          <button
            onClick={() => setShowExportModal(true)}
            disabled={totalCount === 0}
            className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 font-black px-6 py-4 rounded-2xl transition-all shadow-sm flex items-center gap-3 text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => navigate('duplicates')}
            className="bg-white border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-600 font-black px-6 py-4 rounded-2xl transition-all shadow-sm flex items-center gap-3 text-xs uppercase tracking-widest relative"
          >
            <Copy size={18} /> Duplicates
            {duplicatesSummary && (duplicatesSummary.companyName + duplicatesSummary.email + duplicatesSummary.phone) > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                !
              </span>
            )}
          </button>
          <button onClick={onOpenUpload} className="bg-slate-900 hover:bg-slate-800 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-xl shadow-slate-200 flex items-center gap-3 text-xs uppercase tracking-widest">
            <Plus size={20} /> Import
          </button>
        </div>
      </header>

      <div className={`bg-white border border-slate-200 rounded-xl shadow-sm flex-1 flex flex-col min-h-[600px] transition-opacity ${isLoading && !isPlaceholderData ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* Table Header with Excel-style column filters */}
        <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-xl border-b border-slate-100 rounded-t-xl">
          <div className="grid grid-cols-[40px_minmax(160px,2fr)_minmax(120px,1.2fr)_minmax(120px,1.2fr)_90px_160px_120px_120px] min-w-[1020px]">
            {/* Checkbox column header */}
            <div className="px-2 py-3 flex items-center justify-center">
              <button
                onClick={toggleSelectAll}
                className="p-1 rounded hover:bg-slate-200 transition-colors"
                title={selectAllChecked ? 'Deselect all' : 'Select all on page'}
              >
                {selectAllChecked ? (
                  <CheckSquare size={18} className="text-indigo-600" />
                ) : selectedLeadIds.size > 0 ? (
                  <div className="relative">
                    <Square size={18} className="text-slate-400" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-0.5 bg-indigo-600 rounded" />
                    </div>
                  </div>
                ) : (
                  <Square size={18} className="text-slate-300" />
                )}
              </button>
            </div>

            {/* Prospect column - sortable, no filter */}
            <div className="px-3 py-3">
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
            <div className="px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Location</div>

            {/* Industry column - not sortable for now */}
            <div className="px-3 py-3 text-xs font-black text-slate-400 uppercase tracking-wider">Industry</div>

            {/* Trust/Rating column - sortable with range filter */}
            <div className="px-3 py-3 flex justify-center">
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
            <div className="px-3 py-3 flex justify-center">
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
            <div className="px-3 py-3 flex justify-center">
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
            <div className="px-3 py-3">
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
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto flex-1">
          {isLoading && !isPlaceholderData ? (
            // Show skeleton while initial loading
            <LeadListSkeleton rows={pageSize > 10 ? 10 : pageSize} />
          ) : leads.length > 0 ? (
            <div className="min-w-[1020px]">
              {leads.map((lead) => {
                const isSelected = selectedLeadIds.has(lead.id);
                return (
                  <div
                    key={lead.id}
                    className={`group transition-all cursor-pointer border-b border-slate-50 ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/30'}`}
                    onClick={() => onSelectLead(lead.id)}
                  >
                    <div className="grid grid-cols-[40px_minmax(160px,2fr)_minmax(120px,1.2fr)_minmax(120px,1.2fr)_90px_160px_120px_120px] items-center">
                      {/* Checkbox cell */}
                      <div className="px-2 py-3 flex items-center justify-center" onClick={(e) => toggleLeadSelection(lead.id, e)}>
                        <button className="p-1 rounded hover:bg-slate-200 transition-colors">
                          {isSelected ? (
                            <CheckSquare size={18} className="text-indigo-600" />
                          ) : (
                            <Square size={18} className="text-slate-300 group-hover:text-slate-400" />
                          )}
                        </button>
                      </div>
                      <div className="px-3 py-3">
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors text-base" title={lead.companyName}>{lead.companyName}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {lead.contactName && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide" title={lead.contactName}>{lead.contactName}</span>}
                          {lead.websiteUrl && <div className="bg-slate-100 p-1.5 rounded-md shrink-0"><Globe size={12} className="text-slate-400" /></div>}
                        </div>
                      </div>
                      <div className="px-3 py-3">
                        <span className="text-xs text-slate-600 break-words" title={lead.location || 'Unknown'}>{lead.location || 'Unknown'}</span>
                      </div>
                      <div className="px-3 py-3">
                        <span className="text-xs text-slate-600 break-words" title={lead.niche || 'Other'}>{getFirstNiche(lead.niche)}</span>
                      </div>
                      <div className="px-3 py-3">
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
                      <div className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        {(() => {
                          const selectedStrategy = strategies.find(s => s.id === lead.strategyId);
                          const stratColor = getStrategyColor(selectedStrategy?.color);
                          return (
                            <div className="relative group/select">
                              <select
                                value={lead.strategyId || ''}
                                onChange={(e) => handleStrategyChange(lead, e.target.value)}
                                className={`appearance-none text-[10px] font-black uppercase px-3 py-2 rounded-2xl border transition-all cursor-pointer pr-7 w-full text-center ${lead.strategyId
                                    ? `${stratColor.solid} text-white ${stratColor.border} shadow-lg`
                                    : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-300 hover:text-indigo-600'
                                  }`}
                              >
                                <option value="">Select Strategy</option>
                                {strategies.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <ChevronDown size={12} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${lead.strategyId ? 'text-white/60' : 'text-slate-300'}`} />
                            </div>
                          );
                        })()}
                      </div>
                      <div className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        {/* Default: Show channel indicators */}
                        <div className="flex justify-center gap-1 group-hover:hidden">
                          <Indicator active={!!lead.instagramUrl} icon={<Instagram size={14} />} activeClass="bg-pink-500 text-white shadow-lg shadow-pink-100" />
                          <Indicator active={!!lead.facebookUrl} icon={<Facebook size={14} />} activeClass="bg-blue-600 text-white shadow-lg shadow-blue-100" />
                          <Indicator active={!!lead.email} icon={<Mail size={14} />} activeClass="bg-rose-500 text-white shadow-lg shadow-rose-100" />
                          <Indicator active={!!lead.phone} icon={<Phone size={14} />} activeClass="bg-emerald-500 text-white shadow-lg shadow-emerald-100" />
                        </div>
                        {/* Hover: Show quick action buttons */}
                        <div className="hidden group-hover:flex justify-center gap-1">
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
                              title={`Email ${lead.email}`}
                            >
                              <Mail size={14} />
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"
                              title={`Call ${lead.phone}`}
                            >
                              <Phone size={14} />
                            </a>
                          )}
                          {lead.instagramUrl && (
                            <a
                              href={lead.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 transition-colors shadow-sm"
                              title="Open Instagram"
                            >
                              <Instagram size={14} />
                            </a>
                          )}
                          {lead.facebookUrl && (
                            <a
                              href={lead.facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
                              title="Open Facebook"
                            >
                              <Facebook size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <div className={`text-[10px] font-black uppercase py-2 px-2 rounded-[1.25rem] border text-center shadow-sm whitespace-nowrap ${getLeadStatusStyle(lead.status)}`}>
                          {lead.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeFilterCount > 0 || deferredSearch ? (
            // No results due to filters/search
            <EmptyState
              icon={ListFilter}
              title="No matching leads"
              description="Try adjusting your filters or search term to find leads."
              action={{
                label: 'Clear Filters',
                onClick: clearAllFilters,
                variant: 'secondary',
              }}
            />
          ) : (
            // No leads at all - encourage import/discovery
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="Import leads from a CSV file or use Lead Finder to discover prospects."
              action={{
                label: 'Import CSV',
                onClick: onOpenUpload,
              }}
              secondaryAction={onOpenFinder ? {
                label: 'Find Leads',
                onClick: onOpenFinder,
              } : undefined}
            />
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
                onMouseEnter={() => currentPage > 1 && prefetchPage(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous page"
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
                      onMouseEnter={() => pageNum !== currentPage && prefetchPage(pageNum)}
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
                      onMouseEnter={() => prefetchPage(totalPages)}
                      className="w-9 h-9 rounded-lg text-sm font-bold bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 transition-all"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                onMouseEnter={() => currentPage < totalPages && prefetchPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Bulk Actions */}
      {selectedLeadIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <span className="font-bold text-sm">
            {selectedLeadIds.size} selected
          </span>
          <div className="w-px h-6 bg-slate-700" />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 font-bold text-sm transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-sm transition-colors"
          >
            <Tag size={16} />
            Status
          </button>
          <button
            onClick={() => setShowStrategyModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-300 hover:text-indigo-200 font-bold text-sm transition-colors"
          >
            <Target size={16} />
            Sequence
          </button>
          <button
            onClick={() => setShowBulkEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-bold text-sm transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </button>
          <button
            onClick={clearSelection}
            className="ml-2 p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Clear selection"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Leads"
        message={`Are you sure you want to delete ${selectedLeadIds.size} lead${selectedLeadIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Bulk Status Modal */}
      <BulkStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onConfirm={handleBulkStatusChange}
        selectedCount={selectedLeadIds.size}
      />

      {/* Bulk Strategy Modal */}
      <BulkStrategyModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        onConfirm={handleBulkStrategyAssign}
        selectedCount={selectedLeadIds.size}
        strategies={strategies}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onConfirm={handleBulkFieldUpdate}
        selectedCount={selectedLeadIds.size}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        currentPageLeads={leads}
        totalCount={totalCount}
        currentFilters={filters}
      />

      {/* Save Filter Modal */}
      <SaveFilterModal
        isOpen={showSaveFilterModal}
        onClose={() => setShowSaveFilterModal(false)}
        onSave={handleSaveFilter}
        filters={filters}
        isLoading={createSavedFilter.isPending}
      />
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

export default memo(LeadList);
