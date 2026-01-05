import React, { useState, useEffect } from 'react';
import { X, XCircle, DollarSign, Clock, Users, ThumbsDown, UserX, MessageCircleOff, HelpCircle } from 'lucide-react';
import { LostReason, LOST_REASON_LABELS } from '../types';

interface DisqualifyModalProps {
  isOpen: boolean;
  leadName: string;
  currentReason?: LostReason;
  currentNote?: string;
  onClose: () => void;
  onDisqualify: (reason: LostReason, note?: string) => void;
}

const LOST_REASONS: { value: LostReason; label: string; icon: React.ReactNode }[] = [
  { value: 'no_budget', label: LOST_REASON_LABELS.no_budget, icon: <DollarSign size={18} /> },
  { value: 'bad_timing', label: LOST_REASON_LABELS.bad_timing, icon: <Clock size={18} /> },
  { value: 'went_with_competitor', label: LOST_REASON_LABELS.went_with_competitor, icon: <Users size={18} /> },
  { value: 'not_interested', label: LOST_REASON_LABELS.not_interested, icon: <ThumbsDown size={18} /> },
  { value: 'wrong_contact', label: LOST_REASON_LABELS.wrong_contact, icon: <UserX size={18} /> },
  { value: 'no_response_after_outreach', label: LOST_REASON_LABELS.no_response_after_outreach, icon: <MessageCircleOff size={18} /> },
  { value: 'other', label: LOST_REASON_LABELS.other, icon: <HelpCircle size={18} /> },
];

const DisqualifyModal: React.FC<DisqualifyModalProps> = ({
  isOpen,
  leadName,
  currentReason,
  currentNote,
  onClose,
  onDisqualify,
}) => {
  const [reason, setReason] = useState<LostReason | null>(currentReason || null);
  const [note, setNote] = useState(currentNote || '');

  // Reset form when modal opens with new values
  useEffect(() => {
    if (isOpen) {
      setReason(currentReason || null);
      setNote(currentNote || '');
    }
  }, [isOpen, currentReason, currentNote]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason) return;
    onDisqualify(reason, note.trim() || undefined);
    // Reset form
    setReason(null);
    setNote('');
    onClose();
  };

  const handleClose = () => {
    setReason(null);
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-rose-500 to-rose-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <XCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Disqualify Lead</h3>
              <p className="text-sm text-rose-100 truncate max-w-[200px]">
                {leadName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              Lost Reason
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LOST_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                    reason === r.value
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-md ${
                    reason === r.value
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {r.icon}
                  </div>
                  <span className={`text-sm font-medium ${
                    reason === r.value ? 'text-rose-700' : 'text-slate-600'
                  }`}>
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Note - always visible but especially relevant for "Other" */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
              {reason === 'other' ? 'Reason Details' : 'Additional Notes (Optional)'}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                reason === 'other'
                  ? 'Please describe why this lead was disqualified...'
                  : 'Any additional context about this lead...'
              }
              className={`w-full px-4 py-3 bg-slate-50 border rounded-md text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none resize-none ${
                reason === 'other' && !note.trim()
                  ? 'border-rose-300'
                  : 'border-slate-200'
              }`}
              rows={3}
            />
            {reason === 'other' && !note.trim() && (
              <p className="mt-1 text-xs text-rose-500">
                Please provide details when selecting "Other"
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason || (reason === 'other' && !note.trim())}
            className="flex-1 px-4 py-2.5 bg-rose-500 text-white text-sm font-medium rounded-md hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Disqualify
          </button>
        </div>
      </div>
    </div>
  );
};

export default DisqualifyModal;
