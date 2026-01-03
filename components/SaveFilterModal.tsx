import React, { useState, useEffect } from 'react';
import { X, Filter, Bookmark, FolderOpen, Tag, Users, Target, Star, Inbox, Archive, Clock } from 'lucide-react';
import type { SavedFilter } from '../types';
import type { LeadFilters } from '../services/supabase';

// Available icons for saved filters
const FILTER_ICONS = [
  { id: 'filter', icon: Filter, label: 'Filter' },
  { id: 'bookmark', icon: Bookmark, label: 'Bookmark' },
  { id: 'folder', icon: FolderOpen, label: 'Folder' },
  { id: 'tag', icon: Tag, label: 'Tag' },
  { id: 'users', icon: Users, label: 'Users' },
  { id: 'target', icon: Target, label: 'Target' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'inbox', icon: Inbox, label: 'Inbox' },
  { id: 'archive', icon: Archive, label: 'Archive' },
  { id: 'clock', icon: Clock, label: 'Clock' },
] as const;

// Available colors for saved filters
const FILTER_COLORS = [
  { id: '#6B7280', label: 'Gray' },
  { id: '#3B82F6', label: 'Blue' },
  { id: '#10B981', label: 'Green' },
  { id: '#F59E0B', label: 'Amber' },
  { id: '#EF4444', label: 'Red' },
  { id: '#8B5CF6', label: 'Purple' },
  { id: '#EC4899', label: 'Pink' },
  { id: '#14B8A6', label: 'Teal' },
  { id: '#F97316', label: 'Orange' },
  { id: '#6366F1', label: 'Indigo' },
] as const;

interface SaveFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filter: { name: string; icon: string; color: string; filters: Record<string, unknown> }) => void;
  filters: LeadFilters;
  existingFilter?: SavedFilter;
  isLoading?: boolean;
}

export function SaveFilterModal({
  isOpen,
  onClose,
  onSave,
  filters,
  existingFilter,
  isLoading = false,
}: SaveFilterModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('filter');
  const [color, setColor] = useState('#6B7280');

  // Populate fields when editing an existing filter
  useEffect(() => {
    if (existingFilter) {
      setName(existingFilter.name);
      setIcon(existingFilter.icon);
      setColor(existingFilter.color);
    } else {
      setName('');
      setIcon('filter');
      setColor('#6B7280');
    }
  }, [existingFilter, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Cast filters to Record<string, unknown> for storage
    const filtersToSave = existingFilter
      ? existingFilter.filters
      : (filters as unknown as Record<string, unknown>);

    onSave({
      name: name.trim(),
      icon,
      color,
      filters: filtersToSave,
    });
  };

  // Count active filters for display
  const filtersObj = filters as unknown as Record<string, unknown>;
  const activeFilters = Object.entries(filtersObj).filter(([key, value]) => {
    if (key === 'limit' || key === 'offset') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {existingFilter ? 'Edit Smart List' : 'Save as Smart List'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., High-Value Prospects"
              className="w-full px-4 py-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Icon selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_ICONS.map(({ id, icon: IconComponent, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setIcon(id)}
                  title={label}
                  className={`p-3 rounded-lg transition-all ${
                    icon === id
                      ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                  }`}
                >
                  <IconComponent size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {FILTER_COLORS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setColor(id)}
                  title={label}
                  className={`w-9 h-9 rounded-full transition-all ${
                    color === id
                      ? 'ring-2 ring-offset-2 ring-slate-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: id }}
                />
              ))}
            </div>
          </div>

          {/* Active filters preview */}
          {!existingFilter && activeFilters.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Filters to save ({activeFilters.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map(([key]) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2.5 py-1 bg-white rounded text-xs text-slate-600 border border-slate-200"
                  >
                    {formatFilterKey(key)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-md text-slate-600 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isLoading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                existingFilter ? 'Update' : 'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper to format filter keys for display
function formatFilterKey(key: string): string {
  const labels: Record<string, string> = {
    status: 'Status',
    strategyId: 'Strategy',
    channels: 'Channels',
    ratingMin: 'Min Rating',
    ratingMax: 'Max Rating',
    search: 'Search',
    location: 'Location',
    niche: 'Niche',
    staleDays: 'Stale Days',
    sortBy: 'Sort By',
    sortDirection: 'Sort Order',
  };
  return labels[key] || key;
}

export default SaveFilterModal;
