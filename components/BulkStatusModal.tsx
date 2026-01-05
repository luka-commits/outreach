import React, { useState } from 'react';
import { X, AlertTriangle, Loader2, DollarSign, Clock, Users, ThumbsDown, UserX, MessageCircleOff, HelpCircle } from 'lucide-react';
import { Lead, LostReason, LOST_REASON_LABELS } from '../types';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (status: Lead['status'], lostReason?: LostReason, lostReasonNote?: string) => void;
  selectedCount: number;
  isLoading?: boolean;
}

const LOST_REASONS: { value: LostReason; label: string; icon: React.ReactNode }[] = [
  { value: 'no_budget', label: LOST_REASON_LABELS.no_budget, icon: <DollarSign size={14} /> },
  { value: 'bad_timing', label: LOST_REASON_LABELS.bad_timing, icon: <Clock size={14} /> },
  { value: 'went_with_competitor', label: LOST_REASON_LABELS.went_with_competitor, icon: <Users size={14} /> },
  { value: 'not_interested', label: LOST_REASON_LABELS.not_interested, icon: <ThumbsDown size={14} /> },
  { value: 'wrong_contact', label: LOST_REASON_LABELS.wrong_contact, icon: <UserX size={14} /> },
  { value: 'no_response_after_outreach', label: LOST_REASON_LABELS.no_response_after_outreach, icon: <MessageCircleOff size={14} /> },
  { value: 'other', label: LOST_REASON_LABELS.other, icon: <HelpCircle size={14} /> },
];

const STATUS_OPTIONS: { value: Lead['status']; label: string; description: string }[] = [
  { value: 'not_contacted', label: 'New Lead', description: 'Reset to initial state' },
  { value: 'in_progress', label: 'In Progress', description: 'Actively being contacted' },
  { value: 'replied', label: 'Responded', description: 'Lead has replied' },
  { value: 'qualified', label: 'Qualified', description: 'Ready for next steps' },
  { value: 'disqualified', label: 'Not a Fit', description: 'No longer pursuing' },
  { value: 'no_reply', label: 'No Reply', description: 'Strategy finished, no response' },
];

const TERMINAL_STATUSES: Lead['status'][] = ['replied', 'qualified', 'disqualified', 'no_reply'];

const BulkStatusModal: React.FC<BulkStatusModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading = false,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<Lead['status'] | null>(null);
  const [selectedReason, setSelectedReason] = useState<LostReason | null>(null);
  const [reasonNote, setReasonNote] = useState('');

  if (!isOpen) return null;

  const isTerminal = selectedStatus && TERMINAL_STATUSES.includes(selectedStatus);
  const isDisqualified = selectedStatus === 'disqualified';
  const canConfirm = selectedStatus && (!isDisqualified || (selectedReason && (selectedReason !== 'other' || reasonNote.trim())));

  const handleConfirm = () => {
    if (selectedStatus) {
      if (isDisqualified && selectedReason) {
        onConfirm(selectedStatus, selectedReason, reasonNote.trim() || undefined);
      } else {
        onConfirm(selectedStatus);
      }
    }
  };

  const handleClose = () => {
    setSelectedStatus(null);
    setSelectedReason(null);
    setReasonNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Change Status</h3>
          <button
            onClick={handleClose}
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

          {/* Lost Reason Selector - shown when disqualified is selected */}
          {isDisqualified && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <label className="block text-xs font-medium text-rose-700 uppercase tracking-widest mb-3">
                Lost Reason
              </label>
              <div className="grid grid-cols-2 gap-2">
                {LOST_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedReason(r.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left text-sm ${
                      selectedReason === r.value
                        ? 'border-rose-500 bg-white'
                        : 'border-rose-200 bg-white/50 hover:border-rose-300'
                    }`}
                  >
                    <div className={`p-1 rounded ${
                      selectedReason === r.value
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-100 text-rose-500'
                    }`}>
                      {r.icon}
                    </div>
                    <span className={`font-medium ${
                      selectedReason === r.value ? 'text-rose-700' : 'text-slate-600'
                    }`}>
                      {r.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Note field for "Other" reason */}
              {selectedReason === 'other' && (
                <div className="mt-3">
                  <textarea
                    value={reasonNote}
                    onChange={(e) => setReasonNote(e.target.value)}
                    placeholder="Please describe the reason..."
                    className="w-full px-3 py-2 bg-white border border-rose-200 rounded-md text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none"
                    rows={2}
                  />
                  {!reasonNote.trim() && (
                    <p className="mt-1 text-xs text-rose-600">
                      Please provide details when selecting "Other"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Terminal status warning */}
          {isTerminal && !isDisqualified && (
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
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-md font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              isDisqualified
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
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
