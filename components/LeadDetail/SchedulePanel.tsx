import React, { memo, useState } from 'react';
import { Calendar, Clock, CheckCircle2, Bell } from 'lucide-react';

interface SchedulePanelProps {
  initialDate?: string;
  onSchedule: (hours: number | null, customDate?: string, note?: string) => void;
}

const SchedulePanel: React.FC<SchedulePanelProps> = memo(({ initialDate, onSchedule }) => {
  const [schedulingDate] = useState(
    initialDate ? initialDate.substring(0, 16) : ''
  );
  const [note, setNote] = useState('');

  const setNextMorning = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    onSchedule(null, date.toISOString(), note);
  };

  const setEndOfDay = () => {
    const date = new Date();
    date.setHours(17, 0, 0, 0);
    onSchedule(null, date.toISOString(), note);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Calendar className="text-blue-600" size={20} />
        <h3 className="text-lg font-bold text-slate-900">
          Set Manual Task
        </h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SchedulePreset
            icon={<Clock size={16} />}
            label="In 1 Hr"
            onClick={() => onSchedule(1, undefined, note)}
          />
          <SchedulePreset
            icon={<Calendar size={16} />}
            label="Tomorrow"
            onClick={() => onSchedule(24, undefined, note)}
          />
          <SchedulePreset
            icon={<CheckCircle2 size={16} className="text-blue-500" />}
            label="End of Day"
            onClick={setEndOfDay}
          />
          <SchedulePreset
            icon={<Bell size={16} className="text-amber-500" />}
            label="Next Morning"
            onClick={setNextMorning}
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest ml-1 block">
          Add Note (Optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="E.g., Follow up on the pricing proposal..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md font-medium text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all h-24 resize-none"
        />
      </div>

      <button
        onClick={() => onSchedule(null, schedulingDate, note)}
        disabled={!schedulingDate}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-slate-200 transition-all"
      >
        Set Appointment
      </button>

    </section >
  );
});

SchedulePanel.displayName = 'SchedulePanel';

const SchedulePreset: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="p-4 md:p-5 bg-slate-50 border border-slate-100 rounded-lg text-center hover:bg-blue-50 hover:border-blue-200 transition-all group flex flex-col items-center justify-center gap-2"
  >
    <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
      {icon}
    </div>
    <span className="text-[10px] font-medium text-slate-600 uppercase tracking-widest group-hover:text-blue-700">
      {label}
    </span>
  </button>
);

export default SchedulePanel;
