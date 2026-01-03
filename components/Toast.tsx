import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, X, Info, Undo2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  /** Optional undo callback - shows an Undo button if provided */
  onUndo?: () => void;
  /** Duration in ms before auto-dismiss (default 4000, 6000 if has undo) */
  duration?: number;
}

interface ToastOptions {
  type?: ToastType;
  /** Callback for undo action - shows Undo button if provided */
  onUndo?: () => void;
  /** Custom duration in ms (default 4000, 6000 if onUndo provided) */
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, typeOrOptions?: ToastType | ToastOptions) => {
    const id = crypto.randomUUID();

    // Handle both old API (string type) and new API (options object)
    let type: ToastType = 'success';
    let onUndo: (() => void) | undefined;
    let duration: number | undefined;

    if (typeof typeOrOptions === 'string') {
      type = typeOrOptions;
    } else if (typeOrOptions) {
      type = typeOrOptions.type || 'success';
      onUndo = typeOrOptions.onUndo;
      duration = typeOrOptions.duration;
    }

    // Default duration: 4s normally, 6s if has undo action
    if (duration === undefined) {
      duration = onUndo ? 6000 : 4000;
    }

    setToasts(prev => [...prev, { id, message, type, onUndo, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleUndo = useCallback((toast: Toast) => {
    if (toast.onUndo) {
      toast.onUndo();
    }
    removeToast(toast.id);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[200] space-y-3 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
            onUndo={handleUndo}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
  onUndo: (toast: Toast) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove, onUndo }) => {
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());
  const duration = toast.duration || 4000;

  useEffect(() => {
    const startTime = startTimeRef.current;

    // Update progress bar
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
    }, 50);

    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => onRemove(toast.id), duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, duration, onRemove]);

  const styles = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-rose-600 text-white',
    info: 'bg-gray-800 text-white',
  };

  const progressStyles = {
    success: 'bg-emerald-400',
    error: 'bg-rose-400',
    info: 'bg-gray-500',
  };

  const icons = {
    success: <CheckCircle2 size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div
      className={`pointer-events-auto flex flex-col rounded-xl shadow-lg animate-in slide-in-from-right-4 duration-150 overflow-hidden ${styles[toast.type]}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {icons[toast.type]}
        <span className="font-medium text-sm flex-1">{toast.message}</span>

        {toast.onUndo && (
          <button
            onClick={() => onUndo(toast)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-150 text-sm font-medium"
          >
            <Undo2 size={14} />
            Undo
          </button>
        )}

        <button
          onClick={() => onRemove(toast.id)}
          className="p-1.5 hover:bg-white/20 rounded-lg transition-colors duration-150"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-black/10">
        <div
          className={`h-full transition-all duration-50 ${progressStyles[toast.type]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ToastProvider;
