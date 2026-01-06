import React from 'react';
import { AlertTriangle, X, Calendar, CheckCircle, Loader2 } from 'lucide-react';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  periodEnd: Date | null;
}

const CancelSubscriptionModal: React.FC<CancelSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  periodEnd,
}) => {
  if (!isOpen) return null;

  const formattedDate = periodEnd?.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 animate-in zoom-in duration-200 relative shadow-2xl">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50 disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-50 text-amber-500">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Cancel Subscription?
            </h3>
            <p className="text-slate-500 font-medium">
              We're sad to see you go. Here's what happens next:
            </p>
          </div>

          {/* What happens section */}
          <div className="w-full bg-slate-50 rounded-2xl p-4 space-y-3 text-left">
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                You'll keep Pro access until{' '}
                <span className="font-semibold">
                  {formattedDate || 'your billing period ends'}
                </span>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Calendar size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                After that, you'll revert to the free Starter plan (50 leads, 1 strategy)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-slate-600">
                Your data stays safe — you can upgrade anytime to restore full access
              </p>
            </div>
          </div>

          <div className="flex gap-4 w-full pt-4">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-4 px-6 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest text-xs disabled:opacity-50"
            >
              Keep Pro
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex-1 py-4 px-6 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl transition-all shadow-xl shadow-rose-100 uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelSubscriptionModal;
