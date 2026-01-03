import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUp, ChevronDown, Filter, Search, Check } from 'lucide-react';
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
  field: _field,
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
        className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-left group hover:text-pilot-blue transition-colors duration-150 ${
          hasActiveFilter ? 'text-pilot-blue' : 'text-gray-500'
        }`}
      >
        <span>{label}</span>

        {/* Sort indicator */}
        {sortable && (
          <span className="flex flex-col -space-y-1.5 opacity-60 group-hover:opacity-100">
            <ChevronUp
              size={12}
              className={sortDirection === 'asc' ? 'text-pilot-blue opacity-100' : ''}
            />
            <ChevronDown
              size={12}
              className={sortDirection === 'desc' ? 'text-pilot-blue opacity-100' : ''}
            />
          </span>
        )}

        {/* Sort priority badge */}
        {sortPriority && sortPriority > 0 && (
          <span className="px-1 py-0.5 text-[8px] bg-pilot-blue/10 text-pilot-blue rounded-md font-medium">
            {sortPriority}
          </span>
        )}

        {/* Filter indicator - always show for filterable columns */}
        {filterType !== 'none' && (
          <Filter
            size={12}
            className={hasActiveFilter
              ? "text-pilot-blue fill-pilot-blue"
              : "text-gray-300 group-hover:text-gray-400"
            }
          />
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
          className="min-w-[220px] bg-white rounded-xl shadow-lg border border-gray-200/60 overflow-hidden"
        >
          {/* Sort options */}
          {sortable && onSort && (
            <div className="border-b border-gray-100">
              <button
                onClick={() => { onSort('asc'); setIsOpen(false); }}
                className={`w-full px-3 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors duration-150 ${
                  sortDirection === 'asc' ? 'bg-pilot-blue/10 text-pilot-blue' : 'text-gray-600'
                }`}
              >
                <ChevronUp size={14} />
                Sort A → Z
                {sortDirection === 'asc' && <Check size={14} className="ml-auto text-pilot-blue" />}
              </button>
              <button
                onClick={() => { onSort('desc'); setIsOpen(false); }}
                className={`w-full px-3 py-2.5 text-left text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors duration-150 ${
                  sortDirection === 'desc' ? 'bg-pilot-blue/10 text-pilot-blue' : 'text-gray-600'
                }`}
              >
                <ChevronDown size={14} />
                Sort Z → A
                {sortDirection === 'desc' && <Check size={14} className="ml-auto text-pilot-blue" />}
              </button>
            </div>
          )}

          {/* Multiselect filter */}
          {filterType === 'multiselect' && (
            <>
              {/* Search within options */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pilot-blue/10 focus:border-pilot-blue/50"
                    autoFocus
                  />
                </div>
              </div>

              {/* Select all / Clear all */}
              <div className="px-3 py-2 border-b border-gray-100 flex gap-3">
                <button
                  onClick={handleSelectAll}
                  className="text-xs font-medium text-pilot-blue hover:text-pilot-blue/80 transition-colors duration-150"
                >
                  Select All
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-150"
                >
                  Clear
                </button>
              </div>

              {/* Options list */}
              <div className="max-h-48 overflow-y-auto">
                {isLoading ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    Loading...
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    {searchTerm ? 'No matches found' : 'No options available'}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                    >
                      <input
                        type="checkbox"
                        checked={pendingSelection.includes(option)}
                        onChange={() => handleToggleOption(option)}
                        className="rounded border-gray-300 text-pilot-blue focus:ring-pilot-blue/20"
                      />
                      <span className="text-sm text-gray-700 truncate">{option}</span>
                    </label>
                  ))
                )}
              </div>

              {/* Apply / Clear buttons */}
              <div className="p-2 border-t border-gray-100 flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors duration-150"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-pilot-blue text-white rounded-lg hover:bg-pilot-blue/90 transition-colors duration-150"
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
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Min</label>
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
                    className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pilot-blue/10 focus:border-pilot-blue/50"
                  />
                </div>
                <span className="text-gray-300 mt-5 font-bold">—</span>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Max</label>
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
                    className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pilot-blue/10 focus:border-pilot-blue/50"
                  />
                </div>
              </div>

              {/* Apply / Clear buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="flex-1 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors duration-150"
                >
                  Clear
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 px-3 py-2 text-sm font-medium bg-pilot-blue text-white rounded-lg hover:bg-pilot-blue/90 transition-colors duration-150"
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
