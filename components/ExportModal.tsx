import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Download, FileSpreadsheet, Loader2, Check, AlertCircle, Lock } from 'lucide-react';
import { Lead } from '../types';
import { exportAllLeads, LeadFilters } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { ProBadge } from './ui/ProBadge';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageLeads: Lead[];
  totalCount: number;
  currentFilters: LeadFilters;
  onNavigateToPricing?: () => void;
}

type ExportScope = 'page' | 'filtered' | 'all';

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentPageLeads,
  totalCount,
  currentFilters,
  onNavigateToPricing,
}) => {
  const { user } = useAuth();
  const { canAccessFeature } = useSubscription();
  const canExport = canAccessFeature('csvExport');
  const [scope, setScope] = useState<ExportScope>('filtered');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const currentPageCount = currentPageLeads.length;
  const hasFilters = Boolean(
    currentFilters.status?.length ||
    currentFilters.strategyId?.length ||
    currentFilters.channels?.length ||
    currentFilters.search ||
    currentFilters.ratingMin !== undefined ||
    currentFilters.ratingMax !== undefined
  );

  const downloadCSV = useCallback((leads: Lead[], filename: string) => {
    const headers = [
      'Company Name',
      'Contact Name',
      'Email',
      'Phone',
      'Website',
      'Instagram',
      'Facebook',
      'LinkedIn',
      'Twitter',
      'YouTube',
      'TikTok',
      'Address',
      'Location',
      'Niche',
      'Category',
      'Google Rating',
      'Reviews',
      'Status',
      'Strategy ID',
      'Current Step',
      'Next Task Date',
      'Created At',
    ];

    const rows = leads.map((lead) => [
      lead.companyName,
      lead.contactName || '',
      lead.email || '',
      lead.phone || '',
      lead.websiteUrl || '',
      lead.instagramUrl || '',
      lead.facebookUrl || '',
      lead.linkedinUrl || '',
      lead.twitterUrl || '',
      lead.youtubeUrl || '',
      lead.tiktokUrl || '',
      lead.address || '',
      lead.location || '',
      lead.niche || '',
      lead.category || '',
      lead.googleRating?.toString() || '',
      lead.googleReviewCount?.toString() || '',
      lead.status,
      lead.strategyId || '',
      lead.currentStepIndex?.toString() || '0',
      lead.nextTaskDate || '',
      lead.createdAt || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(async () => {
    if (!user?.id) {
      setError('You must be logged in to export leads.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    try {
      const dateStr = new Date().toISOString().split('T')[0];
      let leads: Lead[];
      let filename: string;

      if (scope === 'page') {
        leads = currentPageLeads;
        filename = `leads-page-${dateStr}.csv`;
      } else if (scope === 'filtered') {
        leads = await exportAllLeads(
          user.id,
          currentFilters as Parameters<typeof exportAllLeads>[1],
          setProgress
        );
        filename = `leads-filtered-${dateStr}.csv`;
      } else {
        // Export all leads (no filters)
        leads = await exportAllLeads(user.id, {}, setProgress);
        filename = `leads-all-${dateStr}.csv`;
      }

      downloadCSV(leads, filename);
      setSuccess(true);

      // Auto-close after success (with cleanup)
      closeTimerRef.current = setTimeout(() => {
        onClose();
        setSuccess(false);
        setProgress(0);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [user?.id, scope, currentPageLeads, currentFilters, downloadCSV, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <Download size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Export Leads</h3>
              <p className="text-sm text-slate-300">
                {totalCount.toLocaleString()} leads available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Scope Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              What to Export
            </label>
            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  scope === 'page'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="page"
                  checked={scope === 'page'}
                  onChange={() => setScope('page')}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    scope === 'page' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}
                >
                  {scope === 'page' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">Current Page</p>
                  <p className="text-sm text-slate-500">{currentPageCount} leads</p>
                </div>
                <FileSpreadsheet size={18} className="text-slate-400" />
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  scope === 'filtered'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  value="filtered"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    scope === 'filtered' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}
                >
                  {scope === 'filtered' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">
                    {hasFilters ? 'All Filtered Results' : 'All Leads'}
                  </p>
                  <p className="text-sm text-slate-500">
                    {totalCount.toLocaleString()} leads {hasFilters && '(matching current filters)'}
                  </p>
                </div>
                <FileSpreadsheet size={18} className="text-slate-400" />
              </label>

              {hasFilters && (
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    scope === 'all'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value="all"
                    checked={scope === 'all'}
                    onChange={() => setScope('all')}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      scope === 'all' ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}
                  >
                    {scope === 'all' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">All Leads (Ignore Filters)</p>
                    <p className="text-sm text-slate-500">Export entire database</p>
                  </div>
                  <FileSpreadsheet size={18} className="text-slate-400" />
                </label>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">Exporting...</span>
                <span className="text-blue-600 font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
              <AlertCircle size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <Check size={18} />
              <p className="text-sm font-medium">Export complete! Download started.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          {canExport ? (
            <button
              onClick={handleExport}
              disabled={isExporting || success}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : success ? (
                <>
                  <Check size={16} />
                  Done!
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export CSV
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                onClose();
                onNavigateToPricing?.();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-md hover:from-amber-600 hover:to-orange-600 transition-colors"
            >
              <Lock size={16} />
              Upgrade to Export
              <ProBadge size="sm" className="ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
