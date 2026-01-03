import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Edit3, MapPin, Target, Briefcase, Loader2, Check } from 'lucide-react';
import { Lead } from '../types';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (updates: Partial<Lead>) => Promise<void>;
  selectedCount: number;
}

type EditableField = 'location' | 'niche' | 'category';

const EDITABLE_FIELDS: { key: EditableField; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { key: 'location', label: 'Location', icon: <MapPin size={16} />, placeholder: 'e.g., New York, NY' },
  { key: 'niche', label: 'Industry/Niche', icon: <Target size={16} />, placeholder: 'e.g., Restaurant, Fitness Studio' },
  { key: 'category', label: 'Category', icon: <Briefcase size={16} />, placeholder: 'e.g., B2B, Local Business' },
];

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}) => {
  const [selectedFields, setSelectedFields] = useState<Set<EditableField>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<EditableField, string>>({
    location: '',
    niche: '',
    category: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const toggleField = useCallback((field: EditableField) => {
    setSelectedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  }, []);

  const handleValueChange = useCallback((field: EditableField, value: string) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedFields.size === 0) return;

    setIsSubmitting(true);
    try {
      const updates: Partial<Lead> = {};
      selectedFields.forEach(field => {
        const value = fieldValues[field].trim();
        if (value) {
          updates[field] = value;
        } else {
          // Empty string means clear the field
          updates[field] = undefined;
        }
      });

      await onConfirm(updates);
      setSuccess(true);

      // Reset and close after success (with cleanup)
      successTimerRef.current = setTimeout(() => {
        onClose();
        setSelectedFields(new Set());
        setFieldValues({ location: '', niche: '', category: '' });
        setSuccess(false);
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedFields, fieldValues, onConfirm, onClose]);

  if (!isOpen) return null;

  const hasSelectedFields = selectedFields.size > 0;

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
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Bulk Edit</h3>
              <p className="text-sm text-slate-300">
                Update {selectedCount} lead{selectedCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            Select the fields you want to update. Empty values will clear the field.
          </p>

          {EDITABLE_FIELDS.map(field => {
            const isSelected = selectedFields.has(field.key);
            return (
              <div key={field.key} className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => toggleField(field.key)}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    {field.icon}
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-slate-800' : 'text-slate-600'}`}>
                    {field.label}
                  </span>
                </label>

                {isSelected && (
                  <input
                    type="text"
                    value={fieldValues[field.key]}
                    onChange={(e) => handleValueChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none ml-8"
                    autoFocus={selectedFields.size === 1}
                  />
                )}
              </div>
            );
          })}

          {/* Preview */}
          {hasSelectedFields && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                Preview
              </p>
              <div className="text-sm text-slate-600 space-y-1">
                {Array.from(selectedFields).map(field => {
                  const value = fieldValues[field].trim();
                  const fieldConfig = EDITABLE_FIELDS.find(f => f.key === field);
                  return (
                    <p key={field}>
                      <span className="font-medium">{fieldConfig?.label}:</span>{' '}
                      {value ? (
                        <span className="text-blue-600">"{value}"</span>
                      ) : (
                        <span className="text-rose-500 italic">will be cleared</span>
                      )}
                    </p>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                This will update {selectedCount} lead{selectedCount !== 1 ? 's' : ''}.
              </p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <Check size={18} />
              <p className="text-sm font-medium">Successfully updated {selectedCount} leads!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!hasSelectedFields || isSubmitting || success}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : success ? (
              <>
                <Check size={16} />
                Done!
              </>
            ) : (
              <>
                <Edit3 size={16} />
                Update Leads
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal;
