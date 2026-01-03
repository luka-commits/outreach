import React, { memo } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallRecordsByLead } from '../../hooks/queries/useCallRecordsQuery';
import CallRecordCard from './CallRecordCard';

interface CallHistoryPanelProps {
  leadId: string;
}

const CallHistoryPanel: React.FC<CallHistoryPanelProps> = memo(({ leadId }) => {
  const { data: callRecords = [], isLoading } = useCallRecordsByLead(leadId);

  // Filter to only show completed calls with some useful data
  const completedCalls = callRecords.filter(
    (record) => record.status === 'completed' || record.outcome
  );

  if (isLoading) {
    return (
      <section className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
        <header className="flex items-center gap-2 mb-6">
          <Phone className="text-emerald-600" size={20} />
          <h3 className="text-xl font-black text-slate-900">Call History</h3>
        </header>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-2 text-slate-400">
            <div className="w-4 h-4 bg-slate-200 rounded-full animate-bounce" />
            <span className="text-sm font-medium">Loading calls...</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Phone className="text-emerald-600" size={20} />
          <h3 className="text-xl font-black text-slate-900">Call History</h3>
        </div>
        {completedCalls.length > 0 && (
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            {completedCalls.length} {completedCalls.length === 1 ? 'call' : 'calls'}
          </span>
        )}
      </header>

      {completedCalls.length > 0 ? (
        <div className="space-y-3">
          {completedCalls.map((record) => (
            <CallRecordCard key={record.id} record={record} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-12 opacity-50">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <PhoneOff size={32} className="text-slate-300" />
          </div>
          <p className="text-slate-500 font-black text-sm">No calls recorded yet.</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Call history will appear here.
          </p>
        </div>
      )}
    </section>
  );
});

CallHistoryPanel.displayName = 'CallHistoryPanel';

export default CallHistoryPanel;
