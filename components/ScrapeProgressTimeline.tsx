import React from 'react';
import { Search, Database, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ScrapeJob, ScrapeJobStage } from '../types';

interface ScrapeProgressTimelineProps {
  job: ScrapeJob;
}

interface StageConfig {
  key: ScrapeJobStage;
  label: string;
  description: string;
  icon: React.ReactNode;
  activeColor: string;
  completedColor: string;
}

const stages: StageConfig[] = [
  {
    key: 'scraping',
    label: 'Scraping',
    description: 'Searching Google Maps',
    icon: <Search size={20} />,
    activeColor: 'from-amber-500 to-orange-500',
    completedColor: 'bg-amber-500',
  },
  {
    key: 'enriching',
    label: 'Enriching',
    description: 'Extracting contact data',
    icon: <Database size={20} />,
    activeColor: 'from-blue-500 to-indigo-500',
    completedColor: 'bg-blue-500',
  },
  {
    key: 'finalizing',
    label: 'Finalizing',
    description: 'Importing leads',
    icon: <Sparkles size={20} />,
    activeColor: 'from-emerald-500 to-teal-500',
    completedColor: 'bg-emerald-500',
  },
];

const stageOrder: ScrapeJobStage[] = ['queued', 'scraping', 'enriching', 'finalizing', 'completed', 'failed'];

function getStageIndex(stage: ScrapeJobStage | undefined): number {
  if (!stage) return 0;
  return stageOrder.indexOf(stage);
}

const ScrapeProgressTimeline: React.FC<ScrapeProgressTimelineProps> = ({ job }) => {
  const currentStageIndex = getStageIndex(job.stage);
  const isFailed = job.stage === 'failed' || job.status === 'failed';
  const isCompleted = job.stage === 'completed' || job.status === 'completed';

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Mission Status</h4>
          <h3 className={`text-xl font-black tracking-tight ${isFailed ? 'text-red-500' : isCompleted ? 'text-emerald-500' : 'text-slate-800'}`}>
            {isFailed ? 'Protocol Failed' : isCompleted ? 'Mission Complete' : 'Active Scan'}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target</p>
          <p className="text-sm font-bold text-slate-700">{job.niche}</p>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative mb-8">
        {/* Background Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 rounded-full -translate-y-1/2" />

        {/* Active Progress Line */}
        <div
          className={`absolute top-1/2 left-0 h-1 rounded-full -translate-y-1/2 transition-all duration-1000 ease-out ${isFailed ? 'bg-red-400' : 'bg-gradient-to-r from-blue-400 to-amber-400'
            }`}
          style={{
            width: isCompleted
              ? '100%'
              : isFailed
                ? `${Math.min(((currentStageIndex) / (stages.length - 1)) * 100, 100)}%`
                : `${Math.min(((currentStageIndex) / (stages.length - 1)) * 100 + (job.progress || 0) / stages.length, 100)}%`,
          }}
        />

        {/* Nodes */}
        <div className="relative flex justify-between">
          {stages.map((stage) => {
            const stageIdx = getStageIndex(stage.key);
            const isActive = job.stage === stage.key;
            const isPast = currentStageIndex > stageIdx;

            return (
              <div key={stage.key} className="flex flex-col items-center group">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 z-10 ${isActive
                      ? 'bg-white border-amber-400 shadow-xl shadow-amber-200 scale-110'
                      : isPast || isCompleted
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-300'
                    }`}
                >
                  {isActive && !isFailed ? (
                    <Loader2 size={16} className="animate-spin text-amber-500" />
                  ) : isPast || isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : isFailed && currentStageIndex === stageIdx ? (
                    <AlertCircle size={16} className="text-red-500" />
                  ) : (
                    React.cloneElement(stage.icon as React.ReactElement<{ size?: number }>, { size: 16 })
                  )}
                </div>

                <div className="absolute mt-12 text-center w-24">
                  <p className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-amber-600' : isPast || isCompleted ? 'text-blue-600' : 'text-slate-300'
                    }`}>
                    {stage.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal Output / Messages */}
      <div className="mt-12 bg-slate-900 rounded-xl p-4 font-mono text-xs border-l-4 border-amber-500 shadow-lg">
        <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
          <span className="text-slate-500 ml-2">Live Feed</span>
        </div>
        <div className="space-y-1">
          {job.leadsFound !== undefined && job.leadsFound > 0 && (
            <p className="text-emerald-400 flex items-center gap-2">
              <span className="text-slate-600">&gt;</span> Established contact with {job.leadsFound} entities
            </p>
          )}
          <p className="text-blue-300 flex items-center gap-2">
            <span className="text-slate-600">&gt;</span> {job.stageMessage || 'Initializing sequence...'}
            <span className="inline-block w-1.5 h-3 bg-blue-300 animate-pulse ml-1" />
          </p>
          {isFailed && (
            <p className="text-red-400 mt-2">
              <span className="text-slate-600">&gt;</span> CRITICAL ERROR: {job.errorMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScrapeProgressTimeline;
