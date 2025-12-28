import React, { memo, useState } from 'react';
import { Calendar, Clock, CheckCircle2, Bell } from 'lucide-react';

interface SchedulePanelProps {
  initialDate?: string;
  onSchedule: (hours: number | null, customDate?: string, note?: string) => void;
}

const SchedulePanel: React.FC<SchedulePanelProps> = memo(({ initialDate, onSchedule }) => {
  const [schedulingDate, setSchedulingDate] = useState(
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
    <section className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <Calendar className="text-indigo-600" size={24} />
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
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
            icon={<CheckCircle2 size={16} className="text-indigo-500" />}
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
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
            Add Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="E.g., Follow up on the pricing proposal..."
            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all h-24 resize-none"
          />
        </div>

        <button
          onClick={() => onSchedule(null, schedulingDate, note)}
          disabled={!schedulingDate}
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 disabled:bg-slate-200 shadow-xl shadow-indigo-100 transition-all"
        >
          Set Appointment
        </button>
      </div >
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
    className="p-4 md:p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center hover:bg-indigo-50 hover:border-indigo-200 transition-all group flex flex-col items-center justify-center gap-3"
  >
    <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-indigo-700">
      {label}
    </span>
  </button>
);

export default SchedulePanel;
