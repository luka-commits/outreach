import React, { useState, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Copy,
  Building2,
  Mail,
  Phone,
  Merge,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDuplicatesQuery, useMergeLeads } from '../hooks/queries';
import { useToast } from './Toast';
import { getErrorMessage } from '../utils/errorMessages';
import { useNavigation } from '../contexts/NavigationContext';
import { EmptyState } from './ui/EmptyState';
import type { DuplicateType, DuplicateGroup, Lead } from '../types';
import { getLeadStatusStyle } from '../utils/styles';
import { formatRelativeDate } from '../utils/dateFormat';

// Tab configuration
const TABS: { type: DuplicateType; label: string; Icon: LucideIcon }[] = [
  { type: 'company_name', label: 'Company Name', Icon: Building2 },
  { type: 'email', label: 'Email', Icon: Mail },
  { type: 'phone', label: 'Phone', Icon: Phone },
];

const DuplicateDetection: React.FC = () => {
  const { user } = useAuth();
  const { navigate, navigateToLead } = useNavigation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<DuplicateType>('company_name');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: duplicates, isLoading, refetch, isRefetching } = useDuplicatesQuery(user?.id, activeTab);
  const mergeLeads = useMergeLeads(user?.id);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleMerge = async (group: DuplicateGroup, primaryId: string) => {
    // Validate inputs
    if (!primaryId) {
      showToast('Please select a primary lead', 'error');
      return;
    }

    if (!group.leads || group.leads.length < 2) {
      showToast('No duplicates to merge', 'error');
      return;
    }

    const duplicateIds = group.leads.filter(l => l.id !== primaryId).map(l => l.id);

    if (duplicateIds.length === 0) {
      showToast('No duplicates to merge', 'error');
      return;
    }

    try {
      await mergeLeads.mutateAsync({
        primaryLeadId: primaryId,
        duplicateLeadIds: duplicateIds,
        deleteAfterMerge: true,
      });
      showToast(`Merged ${duplicateIds.length} duplicate(s) into primary lead`, 'success');
      // Remove from expanded since the group is now gone
      setExpandedGroups(prev => {
        const next = new Set(prev);
        next.delete(group.key);
        return next;
      });
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  };

  const totalDuplicates = useMemo(() => {
    if (!duplicates) return 0;
    return duplicates.reduce((sum, g) => sum + g.count - 1, 0); // -1 because primary is not a duplicate
  }, [duplicates]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <button
          onClick={() => navigate('leads')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Back to Pipeline</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <div className="bg-amber-500 p-2.5 rounded-2xl shadow-lg shadow-amber-100 text-white">
                <Copy size={28} />
              </div>
              Find Duplicates
            </h2>
            <p className="text-slate-500 font-medium mt-1">
              Identify and merge duplicate leads to keep your pipeline clean
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {TABS.map(({ type, label, Icon }) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
              activeTab === type
                ? 'text-indigo-600 border-indigo-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {!isLoading && duplicates && duplicates.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="text-amber-600" size={20} />
          <span className="text-amber-800 font-medium">
            Found <strong>{duplicates.length}</strong> groups with{' '}
            <strong>{totalDuplicates}</strong> duplicate leads to review
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!duplicates || duplicates.length === 0) && (
        <EmptyState
          icon={CheckCircle2}
          title="No duplicates found"
          description={`Great job! Your pipeline has no duplicate leads by ${TABS.find(t => t.type === activeTab)?.label.toLowerCase()}.`}
        />
      )}

      {/* Duplicate groups */}
      {!isLoading && duplicates && duplicates.length > 0 && (
        <div className="space-y-4">
          {duplicates.map((group) => (
            <DuplicateGroupCard
              key={group.key}
              group={group}
              isExpanded={expandedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onMerge={handleMerge}
              onViewLead={navigateToLead}
              isMerging={mergeLeads.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Individual duplicate group card
interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onMerge: (group: DuplicateGroup, primaryId: string) => void;
  onViewLead: (leadId: string) => void;
  isMerging: boolean;
}

const DuplicateGroupCard: React.FC<DuplicateGroupCardProps> = ({
  group,
  isExpanded,
  onToggle,
  onMerge,
  onViewLead,
  isMerging,
}) => {
  const [selectedPrimary, setSelectedPrimary] = useState<string>(group.leads[0]?.id || '');

  // Recommend the oldest lead as primary (first created)
  const recommendedPrimary = group.leads[0]?.id || '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 text-amber-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
            {group.count}
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-900">{group.key}</div>
            <div className="text-xs text-slate-500">
              {group.count} leads with same {group.type.replace('_', ' ')}
            </div>
          </div>
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Select primary lead to keep (others will be merged into it)
          </div>

          {/* Lead list */}
          <div className="space-y-2 mb-4">
            {group.leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={selectedPrimary === lead.id}
                isRecommended={lead.id === recommendedPrimary}
                onSelect={() => setSelectedPrimary(lead.id)}
                onView={() => onViewLead(lead.id)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {group.count - 1} lead{group.count - 1 !== 1 ? 's' : ''} will be deleted after merge
            </div>
            <button
              onClick={() => onMerge(group, selectedPrimary)}
              disabled={isMerging || !selectedPrimary}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isMerging ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Merge size={16} />
              )}
              Merge & Delete Duplicates
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual lead card within a group
interface LeadCardProps {
  lead: Lead;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
  onView: () => void;
}

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isSelected,
  isRecommended,
  onSelect,
  onView,
}) => {
  const statusStyle = getLeadStatusStyle(lead.status);

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="radio"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 text-indigo-600"
          />
          <div>
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              {lead.companyName}
              {isRecommended && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold uppercase">
                  Oldest
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5">
              {lead.email && <span>{lead.email}</span>}
              {lead.phone && <span>{lead.phone}</span>}
              {lead.location && <span>{lead.location}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle}`}>
            {lead.status.replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-400">
            {formatRelativeDate(lead.createdAt)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateDetection;
