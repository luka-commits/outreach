import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Columns3, Check, RotateCcw, Lock } from 'lucide-react';
import type { BuiltInColumn, CustomFieldDefinition } from '../types';

export interface ColumnVisibilityDropdownProps {
  builtInColumns: BuiltInColumn[];
  customFields: CustomFieldDefinition[];
  visibleColumns: string[];
  visibleCustomFields: string[];
  onVisibilityChange: (columns: string[], customFields: string[]) => void;
  isLoading?: boolean;
}

export const ColumnVisibilityDropdown = React.memo(function ColumnVisibilityDropdown({
  builtInColumns,
  customFields,
  visibleColumns,
  visibleCustomFields,
  onVisibilityChange,
  isLoading = false,
}: ColumnVisibilityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingColumns, setPendingColumns] = useState<string[]>(visibleColumns);
  const [pendingCustomFields, setPendingCustomFields] = useState<string[]>(visibleCustomFields);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync pending state when opening
  useEffect(() => {
    if (isOpen) {
      setPendingColumns(visibleColumns);
      setPendingCustomFields(visibleCustomFields);
    }
  }, [isOpen, visibleColumns, visibleCustomFields]);

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 280;

      // Position to the left if not enough space on the right
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth - 16) {
        left = rect.right - dropdownWidth;
      }

      setDropdownPosition({
        top: rect.bottom + 4,
        left: Math.max(8, left),
      });
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedDropdown = dropdownRef.current?.contains(target);

      if (!clickedButton && !clickedDropdown) {
        // Apply changes when closing
        if (isOpen) {
          onVisibilityChange(pendingColumns, pendingCustomFields);
        }
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, pendingColumns, pendingCustomFields, onVisibilityChange]);

  // Close on scroll (only for scrolls OUTSIDE the dropdown)
  useEffect(() => {
    if (isOpen) {
      const handleScroll = (e: Event) => {
        // Don't close if scrolling inside the dropdown
        if (dropdownRef.current?.contains(e.target as Node)) {
          return;
        }
        onVisibilityChange(pendingColumns, pendingCustomFields);
        setIsOpen(false);
      };
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen, pendingColumns, pendingCustomFields, onVisibilityChange]);

  const handleToggleColumn = (key: string) => {
    const column = builtInColumns.find(c => c.key === key);
    if (column?.required) return; // Can't toggle required columns

    setPendingColumns(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleToggleCustomField = (fieldId: string) => {
    setPendingCustomFields(prev =>
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleResetToDefault = () => {
    const defaultColumns = builtInColumns
      .filter(c => c.defaultVisible)
      .map(c => c.key);
    const defaultCustomFields = customFields
      .filter(f => f.showInList)
      .map(f => f.id);

    setPendingColumns(defaultColumns);
    setPendingCustomFields(defaultCustomFields);
  };

  const handleApply = () => {
    onVisibilityChange(pendingColumns, pendingCustomFields);
    setIsOpen(false);
  };

  // Count of visible columns (non-required built-in + custom fields)
  const toggleableBuiltIn = builtInColumns.filter(c => !c.required);
  const visibleToggleableCount = toggleableBuiltIn.filter(c => pendingColumns.includes(c.key)).length;
  const totalVisible = visibleToggleableCount + pendingCustomFields.length;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
          border transition-colors
          ${isOpen
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      >
        <Columns3 size={16} />
        <span>Columns</span>
        {totalVisible > 0 && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-1.5 py-0.5 rounded">
            {totalVisible}
          </span>
        )}
      </button>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: 280,
            maxHeight: 400,
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700">Visible Columns</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose which columns to display</p>
          </div>

          {/* Scrollable content */}
          <div className="max-h-[280px] overflow-y-auto">
            {/* Built-in columns section */}
            <div className="p-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                Built-in Columns
              </div>
              {builtInColumns.map(column => {
                const isChecked = pendingColumns.includes(column.key);
                const isRequired = column.required;

                return (
                  <button
                    key={column.key}
                    onClick={() => handleToggleColumn(column.key)}
                    disabled={isRequired}
                    className={`
                      w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left
                      transition-colors
                      ${isRequired
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:bg-slate-100 cursor-pointer'
                      }
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded flex items-center justify-center border
                      ${isChecked
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-white border-slate-300'
                      }
                    `}>
                      {isChecked && <Check size={14} className="text-white" />}
                    </div>
                    <span className="flex-1 text-sm text-slate-700">{column.label}</span>
                    {isRequired && (
                      <span title="Required column">
                        <Lock size={14} className="text-slate-400" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom fields section */}
            {customFields.length > 0 && (
              <div className="p-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                  Custom Fields
                </div>
                {customFields.map(field => {
                  const isChecked = pendingCustomFields.includes(field.id);

                  return (
                    <button
                      key={field.id}
                      onClick={() => handleToggleCustomField(field.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-slate-100 transition-colors"
                    >
                      <div className={`
                        w-5 h-5 rounded flex items-center justify-center border
                        ${isChecked
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-white border-slate-300'
                        }
                      `}>
                        {isChecked && <Check size={14} className="text-white" />}
                      </div>
                      <span className="flex-1 text-sm text-slate-700">{field.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {customFields.length === 0 && (
              <div className="p-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  No custom fields defined yet
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            <div className="flex-1" />
            <button
              onClick={handleApply}
              className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
            >
              Apply
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
