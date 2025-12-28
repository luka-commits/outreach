import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'bg-rose-50 text-rose-500',
      button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-100',
    },
    warning: {
      icon: 'bg-amber-50 text-amber-500',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100',
    },
    info: {
      icon: 'bg-blue-50 text-blue-500',
      button: 'bg-blue-500 hover:bg-blue-600 shadow-blue-100',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 animate-in zoom-in duration-200 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${styles.icon}`}>
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
            <p className="text-slate-500 font-medium">{message}</p>
          </div>

          <div className="flex gap-4 w-full pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-slate-100 transition-all uppercase tracking-widest text-xs"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 py-4 px-6 text-white font-black rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs ${styles.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
