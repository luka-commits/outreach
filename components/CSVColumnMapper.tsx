import React, { useState, useMemo } from 'react';
import { X, Sparkles, Loader2, ChevronDown, ChevronUp, Check, AlertCircle } from 'lucide-react';
import { ColumnMapping, ColumnMappingTarget, LeadField, LEAD_FIELD_LABELS } from '../types';
import { detectColumnMappings } from '../services/geminiService';
import { useCustomFieldDefinitionsQuery } from '../hooks/queries/useCustomFieldsQuery';
import { useAuth } from '../hooks/useAuth';

interface CSVColumnMapperProps {
  headers: string[];
  rows: string[][];
  initialMappings: ColumnMapping[];
  onConfirm: (mappings: ColumnMapping[]) => void;
  onBack: () => void;
}

const ALL_LEAD_FIELDS: LeadField[] = Object.keys(LEAD_FIELD_LABELS) as LeadField[];

// Helper to check if target is company_name
const isCompanyName = (target: ColumnMappingTarget | null): boolean => {
  return target?.type === 'builtin' && target.field === 'company_name';
};

// Helper to create a unique key for a target (for tracking used fields)
const getTargetKey = (target: ColumnMappingTarget): string => {
  if (target.type === 'builtin') return `builtin:${target.field}`;
  return `custom:${target.fieldId}`;
};

const CSVColumnMapper: React.FC<CSVColumnMapperProps> = ({
  headers,
  rows,
  initialMappings,
  onConfirm,
  onBack,
}) => {
  const { user } = useAuth();
  const { data: customFields = [] } = useCustomFieldDefinitionsQuery(user?.id);

  const [mappings, setMappings] = useState<ColumnMapping[]>(initialMappings);
  const [isAIDetecting, setIsAIDetecting] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Track which fields are already mapped (to disable in dropdowns)
  const usedTargets = useMemo(() => {
    const used = new Set<string>();
    mappings.forEach(m => {
      if (m.target) used.add(getTargetKey(m.target));
    });
    return used;
  }, [mappings]);

  // Check if company_name is mapped (required)
  const hasCompanyName = useMemo(() => {
    return mappings.some(m => isCompanyName(m.target));
  }, [mappings]);

  // Count unmapped columns
  const unmappedCount = useMemo(() => {
    return mappings.filter(m => m.target === null).length;
  }, [mappings]);

  const handleTargetChange = (csvIndex: number, value: string) => {
    let newTarget: ColumnMappingTarget | null = null;

    if (value.startsWith('builtin:')) {
      const field = value.replace('builtin:', '') as LeadField;
      newTarget = { type: 'builtin', field };
    } else if (value.startsWith('custom:')) {
      const fieldId = value.replace('custom:', '');
      const customField = customFields.find(f => f.id === fieldId);
      if (customField) {
        newTarget = { type: 'custom', fieldId, fieldType: customField.fieldType };
      }
    }

    setMappings(prev =>
      prev.map(m =>
        m.csvIndex === csvIndex
          ? { ...m, target: newTarget, source: 'manual' as const }
          : m
      )
    );
  };

  const handleAIDetect = async () => {
    setIsAIDetecting(true);
    setAIError(null);

    try {
      // Only send unmapped column headers to AI (AI only detects built-in fields)
      const unmappedHeaders = mappings
        .filter(m => m.target === null)
        .map(m => m.csvColumn);

      if (unmappedHeaders.length === 0) {
        setIsAIDetecting(false);
        return;
      }

      const suggestions = await detectColumnMappings(unmappedHeaders, rows);

      // Merge AI suggestions into mappings (only for unmapped columns, only built-in fields)
      setMappings(prev =>
        prev.map(m => {
          // Skip already mapped columns
          if (m.target !== null) return m;

          const suggestion = suggestions[m.csvColumn];
          if (suggestion) {
            const targetKey = `builtin:${suggestion}`;
            if (!usedTargets.has(targetKey)) {
              return {
                ...m,
                target: { type: 'builtin', field: suggestion },
                source: 'ai' as const,
              };
            }
          }
          return m;
        })
      );
    } catch (error) {
      setAIError(error instanceof Error ? error.message : 'AI detection failed');
    } finally {
      setIsAIDetecting(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(mappings);
  };

  // Get sample values for a column (first 2-3 non-empty values)
  const getSampleValues = (columnIndex: number): string[] => {
    const samples: string[] = [];
    for (const row of rows) {
      const value = row[columnIndex]?.trim();
      if (value && samples.length < 3) {
        samples.push(value.length > 30 ? value.slice(0, 30) + '...' : value);
      }
    }
    return samples;
  };

  // Get dropdown value from target
  const getDropdownValue = (target: ColumnMappingTarget | null): string => {
    if (!target) return '';
    return getTargetKey(target);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-lg shadow-md flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Map Columns</h3>
            <p className="text-sm text-slate-500 mt-1">
              Review detected mappings and adjust as needed
            </p>
          </div>
          <button
            onClick={onBack}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Preview Table (Collapsible) */}
          <div className="mb-6">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mb-3"
            >
              {showPreview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Data Preview ({rows.length} rows)
            </button>

            {showPreview && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {headers.map((header, i) => {
                          const mapping = mappings.find(m => m.csvIndex === i);
                          return (
                            <th
                              key={i}
                              className="px-3 py-2 text-left font-medium text-slate-700 border-b border-slate-200 whitespace-nowrap"
                            >
                              <div className="flex items-center gap-2">
                                <span className="truncate max-w-[150px]" title={header}>
                                  {header}
                                </span>
                                {mapping?.target && (
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      mapping.source === 'alias'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : mapping.source === 'ai'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {mapping.source === 'alias'
                                      ? 'Auto'
                                      : mapping.source === 'ai'
                                      ? 'AI'
                                      : ''}
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 3).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-slate-100 last:border-0">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-3 py-2 text-slate-600 whitespace-nowrap truncate max-w-[200px]"
                              title={cell}
                            >
                              {cell || <span className="text-slate-300 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* AI Detection Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={handleAIDetect}
                disabled={isAIDetecting || unmappedCount === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAIDetecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI Detect Unmapped
                  </>
                )}
              </button>
              {unmappedCount === 0 && (
                <span className="text-sm text-slate-500">All columns mapped</span>
              )}
            </div>

            {aiError && (
              <div className="flex items-center gap-2 text-sm text-rose-600">
                <AlertCircle size={16} />
                {aiError}
              </div>
            )}
          </div>

          {/* Column Mappings List */}
          <div className="space-y-3">
            {mappings.map(mapping => {
              const samples = getSampleValues(mapping.csvIndex);
              const isMapped = mapping.target !== null;
              const currentKey = mapping.target ? getTargetKey(mapping.target) : '';

              return (
                <div
                  key={mapping.csvIndex}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                    isMapped
                      ? 'border-slate-200 bg-white'
                      : 'border-dashed border-slate-200 bg-slate-50'
                  }`}
                >
                  {/* CSV Column Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">
                        {mapping.csvColumn}
                      </span>
                      {mapping.source === 'alias' && mapping.target && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                          <Check size={12} />
                          Auto-detected
                        </span>
                      )}
                      {mapping.source === 'ai' && mapping.target && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 flex items-center gap-1">
                          <Sparkles size={12} />
                          AI Suggested
                        </span>
                      )}
                    </div>
                    {samples.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        e.g. {samples.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-300 shrink-0">→</div>

                  {/* Field Dropdown */}
                  <div className="w-56 shrink-0">
                    <select
                      value={getDropdownValue(mapping.target)}
                      onChange={e => handleTargetChange(mapping.csvIndex, e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Not mapped</option>

                      {/* Built-in Fields */}
                      <optgroup label="Standard Fields">
                        {ALL_LEAD_FIELDS.map(field => {
                          const key = `builtin:${field}`;
                          const isUsed = usedTargets.has(key) && currentKey !== key;
                          return (
                            <option key={key} value={key} disabled={isUsed}>
                              {LEAD_FIELD_LABELS[field]}
                              {isUsed ? ' (in use)' : ''}
                            </option>
                          );
                        })}
                      </optgroup>

                      {/* Custom Fields */}
                      {customFields.length > 0 && (
                        <optgroup label="Custom Fields">
                          {customFields.map(field => {
                            const key = `custom:${field.id}`;
                            const isUsed = usedTargets.has(key) && currentKey !== key;
                            return (
                              <option key={key} value={key} disabled={isUsed}>
                                {field.name}
                                {isUsed ? ' (in use)' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Required field warning */}
          {!hasCompanyName && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-amber-800 text-sm">Company Name Required</p>
                <p className="text-amber-700 text-sm">
                  Please map at least one column to &quot;Company Name&quot; before importing.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-slate-100 bg-slate-50 rounded-b-lg shrink-0">
          <div className="text-sm text-slate-500">
            {mappings.filter(m => m.target).length} of {mappings.length} columns mapped
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-md font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={!hasCompanyName}
              className="flex items-center gap-2 px-6 py-2.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVColumnMapper;
