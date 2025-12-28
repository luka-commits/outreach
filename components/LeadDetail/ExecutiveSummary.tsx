import React, { memo } from 'react';
import { FileText, Search, Sparkles } from 'lucide-react';

interface ExecutiveSummaryProps {
  summary: string;
  searchQuery?: string;
}

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = memo(({ summary, searchQuery }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 rounded-3xl border border-indigo-100 shadow-lg shadow-indigo-50/50">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-200">
          <Sparkles size={24} className="text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
              <FileText size={14} />
              Executive Summary
            </h3>
            {searchQuery && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                <Search size={12} />
                Found via: "{searchQuery}"
              </span>
            )}
          </div>

          <p className="text-slate-700 leading-relaxed text-[15px]">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
});

ExecutiveSummary.displayName = 'ExecutiveSummary';

export default ExecutiveSummary;
