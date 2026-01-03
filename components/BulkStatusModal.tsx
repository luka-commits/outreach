import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Lead } from '../types';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: Lead['status']) => void;
  selectedCount: number;
  isLoading?: boolean;
}

const STATUS_OPTIONS: { value: Lead['status']; label: string; description: string }[] = [
  { value: 'not_contacted', label: 'New Lead', description: 'Reset to initial state' },
  { value: 'in_progress', label: 'In Progress', description: 'Actively being contacted' },
  { value: 'replied', label: 'Responded', description: 'Lead has replied' },
  { value: 'qualified', label: 'Qualified', description: 'Ready for next steps' },
  { value: 'disqualified', label: 'Not a Fit', description: 'No longer pursuing' },
];

const TERMINAL_STATUSES: Lead['status'][] = ['replied', 'qualified', 'disqualified'];

const BulkStatusModal: React.FC<BulkStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<Lead['status'] | null>(null);

  if (!isOpen) return null;

  const isTerminal = selectedStatus && TERMINAL_STATUSES.includes(selectedStatus);

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Change Status</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 mb-6">
            Select a new status for <span className="font-medium text-slate-900">{selectedCount}</span> lead{selectedCount !== 1 ? 's' : ''}.
          </p>

          <div className="space-y-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedStatus === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={selectedStatus === option.value}
                  onChange={() => setSelectedStatus(option.value)}
                  className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{option.label}</p>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Terminal status warning */}
          {isTerminal && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-amber-800 text-sm">Auto-Stop Active</p>
                <p className="text-amber-700 text-sm">
                  This status will clear scheduled tasks for these leads.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5 border-t border-slate-100 bg-slate-50 rounded-b-lg">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-md font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedStatus || isLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkStatusModal;
