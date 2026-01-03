import React, { useState, useCallback } from 'react';
import { X, Clock, CalendarDays, ArrowRight, ChevronRight } from 'lucide-react';

interface RescheduleModalProps {
  isOpen: boolean;
  leadName: string;
  currentDate?: string;
  onClose: () => void;
  onReschedule: (newDate: Date) => void;
}

type PresetOption = {
  label: string;
  description: string;
  getDate: () => Date;
};

const PRESETS: PresetOption[] = [
  {
    label: 'Tomorrow',
    description: 'Same time tomorrow',
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    },
  },
  {
    label: 'In 3 Days',
    description: 'Push back a few days',
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      return date;
    },
  },
  {
    label: 'Next Week',
    description: 'Same day next week',
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    },
  },
  {
    label: 'In 2 Weeks',
    description: 'Two weeks from now',
    getDate: () => {
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date;
    },
  },
];

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  leadName,
  currentDate,
  onClose,
  onReschedule,
}) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');

  const handlePresetClick = useCallback(
    (preset: PresetOption) => {
      onReschedule(preset.getDate());
      onClose();
    },
    [onReschedule, onClose]
  );

  const handleCustomSubmit = useCallback(() => {
    if (!customDate) return;
    const dateParts = customDate.split('-').map(Number);
    const timeParts = customTime.split(':').map(Number);
    const year = dateParts[0] ?? 0;
    const month = dateParts[1] ?? 1;
    const day = dateParts[2] ?? 1;
    const hours = timeParts[0] ?? 9;
    const minutes = timeParts[1] ?? 0;
    const date = new Date(year, month - 1, day, hours, minutes);
    onReschedule(date);
    onClose();
    setShowCustom(false);
    setCustomDate('');
  }, [customDate, customTime, onReschedule, onClose]);

  const formatCurrentDate = (dateStr?: string) => {
    if (!dateStr) return 'No date set';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Set min date for custom picker to today
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg">Reschedule Task</h3>
              <p className="text-sm text-amber-100 truncate max-w-[200px]">{leadName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Date Info */}
        {currentDate && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <CalendarDays size={16} className="text-amber-600" />
            <span className="text-sm text-amber-800">
              Currently: <span className="font-semibold">{formatCurrentDate(currentDate)}</span>
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {!showCustom ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
                Quick Options
              </label>

              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <ArrowRight size={16} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-800">{preset.label}</p>
                      <p className="text-sm text-slate-500">{preset.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500" />
                </button>
              ))}

              <button
                onClick={() => setShowCustom(true)}
                className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-400 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-md bg-slate-100 text-slate-500">
                    <CalendarDays size={16} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-600">Custom Date</p>
                    <p className="text-sm text-slate-400">Pick a specific date & time</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowCustom(false)}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1"
              >
                <ChevronRight size={16} className="rotate-180" />
                Back to presets
              </button>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={customDate}
                  min={today}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <button
                onClick={handleCustomSubmit}
                disabled={!customDate}
                className="w-full px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reschedule to {customDate ? new Date(customDate + 'T' + customTime).toLocaleDateString() : '...'}
              </button>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            Rescheduling will preserve your current progress in the strategy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
