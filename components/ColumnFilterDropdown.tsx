import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, Filter, Search, X, Check } from 'lucide-react';
import { SortDirection } from '../services/supabase';

export interface ColumnFilterDropdownProps {
  label: string;
  field: string;

  // Sorting
  sortDirection?: SortDirection | null;
  sortPriority?: number;  // 1-based priority for multi-sort
  onSort?: (direction: SortDirection) => void;
  sortable?: boolean;

  // Filtering
  filterType?: 'multiselect' | 'range' | 'none';
  options?: string[];  // For multiselect
  selectedValues?: string[];
  onFilterChange?: (values: string[]) => void;

  // Range filter (for rating)
  rangeMin?: number;
  rangeMax?: number;
  rangeValue?: { min?: number; max?: number };
  onRangeChange?: (value: { min?: number; max?: number }) => void;

  // Loading state for dynamic options
  isLoading?: boolean;
}

export const ColumnFilterDropdown = React.memo(function ColumnFilterDropdown({
  label,
  field,
  sortDirection,
  sortPriority,
  onSort,
  sortable = true,
  filterType = 'none',
  options = [],
  selectedValues = [],
  onFilterChange,
  rangeMin = 0,
  rangeMax = 5,
  rangeValue,
  onRangeChange,
  isLoading = false,
}: ColumnFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingSelection, setPendingSelection] = useState<string[]>(selectedValues);
  const [pendingRange, setPendingRange] = useState<{ min?: number; max?: number }>(rangeValue || {});
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync pending selection with actual selection when opening
  useEffect(() => {
    if (isOpen) {
      setPendingSelection(selectedValues);
      setPendingRange(rangeValue || {});
    }
  }, [isOpen, selectedValues, rangeValue]);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4, // 4px gap below button
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close on click outside (check both button and dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);

      if (!clickedButton && !clickedDropdown) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on scroll (dropdown would be mispositioned)
  useEffect(() => {
    if (isOpen) {
      const handleScroll = () => setIsOpen(false);
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen]);

  // Filter options by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(term));
  }, [options, searchTerm]);

  const hasActiveFilter = selectedValues.length > 0 ||
    (rangeValue?.min !== undefined || rangeValue?.max !== undefined);

  const handleToggleOption = (option: string) => {
    setPendingSelection(prev =>
      prev.includes(option)
        ? prev.filter(v => v !== option)
        : [...prev, option]
    );
  };

  const handleSelectAll = () => {
    setPendingSelection(filteredOptions);
  };

  const handleClearAll = () => {
    setPendingSelection([]);
  };

  const handleApply = () => {
    if (filterType === 'multiselect' && onFilterChange) {
      onFilterChange(pendingSelection);
    } else if (filterType === 'range' && onRangeChange) {
      onRangeChange(pendingRange);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    if (filterType === 'multiselect' && onFilterChange) {
      onFilterChange([]);
    } else if (filterType === 'range' && onRangeChange) {
      onRangeChange({});
    }
    setPendingSelection([]);
    setPendingRange({});
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Column Header Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-left group hover:text-indigo-600 transition-colors ${
          hasActiveFilter ? 'text-indigo-600' : 'text-slate-400'
        }`}
      >
        <span>{label}</span>

        {/* Sort indicator */}
        {sortable && (
          <span className="flex flex-col -space-y-1 opacity-60 group-hover:opacity-100">
            <ChevronUp
              size={10}
              className={sortDirection === 'asc' ? 'text-indigo-600 opacity-100' : ''}
            />
            <ChevronDown
              size={10}
              className={sortDirection === 'desc' ? 'text-indigo-600 opacity-100' : ''}
            />
          </span>
        )}

        {/* Sort priority badge */}
        {sortPriority && sortPriority > 0 && (
          <span className="px-1 py-0.5 text-[8px] bg-indigo-100 text-indigo-700 rounded font-black">
            {sortPriority}
          </span>
        )}

        {/* Filter active indicator */}
        {hasActiveFilter && (
          <Filter size={10} className="text-indigo-600 fill-indigo-600" />
        )}
      </button>

      {/* Dropdown Menu - rendered via Portal to escape overflow:hidden */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 9999,
          }}
          className="min-w-[220px] bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden"
        >
          {/* Sort options */}
          {sortable && onSort && (
            <div className="border-b border-slate-100">
              <button
                onClick={() => { onSort('asc'); setIsOpen(false); }}
                className={`w-full px-3 py-2.5 text-left text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 ${
                  sortDirection === 'asc' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                }`}
              >
                <ChevronUp size={14} />
                Sort A → Z
                {sortDirection === 'asc' && <Check size={14} className="ml-auto text-indigo-600" />}
              </button>
              <button
                onClick={() => { onSort('desc'); setIsOpen(false); }}
                className={`w-full px-3 py-2.5 text-left text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 ${
                  sortDirection === 'desc' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'
                }`}
              >
                <ChevronDown size={14} />
                Sort Z → A
                {sortDirection === 'desc' && <Check size={14} className="ml-auto text-indigo-600" />}
              </button>
            </div>
          )}

          {/* Multiselect filter */}
          {filterType === 'multiselect' && (
            <>
              {/* Search within options */}
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Select all / Clear all */}
              <div className="px-3 py-2 border-b border-slate-100 flex gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Select All
                </button>
                <span className="text-slate-200">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Clear
                </button>
              </div>

              {/* Options list */}
              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="px-3 py-4 text-sm text-slate-500 text-center">
                    Loading...
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500 text-center">
                    {searchTerm ? 'No matches found' : 'No options available'}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={pendingSelection.includes(option)}
                        onChange={() => handleToggleOption(option)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700 truncate">{option}</span>
                    </label>
                  ))
                )}
              </div>

              {/* Apply / Clear buttons */}
              <div className="p-2 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
            </>
          )}

          {/* Range filter (for rating) */}
          {filterType === 'range' && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Min</label>
                  <input
                    type="number"
                    min={rangeMin}
                    max={rangeMax}
                    step={0.5}
                    value={pendingRange.min ?? ''}
                    onChange={(e) => setPendingRange(prev => ({
                      ...prev,
                      min: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    placeholder="0"
                    className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
                <span className="text-slate-300 mt-5 font-bold">—</span>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Max</label>
                  <input
                    type="number"
                    min={rangeMin}
                    max={rangeMax}
                    step={0.5}
                    value={pendingRange.max ?? ''}
                    onChange={(e) => setPendingRange(prev => ({
                      ...prev,
                      max: e.target.value ? Number(e.target.value) : undefined
                    }))}
                    placeholder="5"
                    className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Apply / Clear buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-3 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
});

export default ColumnFilterDropdown;
