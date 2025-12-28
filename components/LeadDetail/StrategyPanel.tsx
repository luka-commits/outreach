import React, { memo } from 'react';
import { Zap, Check } from 'lucide-react';
import { Lead, Strategy } from '../../types';

interface StrategyPanelProps {
  lead: Lead;
  strategies: Strategy[];
  onSelectStrategy: (strategy: Strategy) => void;
  onCompleteStep: () => void;
  onSwitchStrategy: () => void;
}

const StrategyPanel: React.FC<StrategyPanelProps> = memo(({
  lead,
  strategies,
  onSelectStrategy,
  onCompleteStep,
  onSwitchStrategy,
}) => {
  const activeStrategy = lead.strategyId
    ? strategies.find((s) => s.id === lead.strategyId)
    : null;
  const currentStep = activeStrategy?.steps[lead.currentStepIndex];

  return (
    <section className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-8 min-h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <Zap className="text-indigo-600" size={24} /> Strategy Plan
        </h3>
        {lead.strategyId && (
          <button
            onClick={onSwitchStrategy}
            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
          >
            Switch Strategy
          </button>
        )}
      </div>

      {!lead.strategyId ? (
        <StrategySelector strategies={strategies} onSelect={onSelectStrategy} />
      ) : (
        <ActiveStrategyView
          lead={lead}
          activeStrategy={activeStrategy!}
          currentStep={currentStep}
          onCompleteStep={onCompleteStep}
        />
      )}
    </section>
  );
});

StrategyPanel.displayName = 'StrategyPanel';

// Sub-components
const StrategySelector: React.FC<{
  strategies: Strategy[];
  onSelect: (strategy: Strategy) => void;
}> = ({ strategies, onSelect }) => (
  <div className="space-y-4 flex-1">
    <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100 border-dashed text-center">
      <p className="text-indigo-600 text-sm font-bold">
        No active sequence for this lead.
      </p>
      <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest mt-1">
        Select an automated path below
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-2 scrollbar-hide">
      {strategies.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s)}
          className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-left hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group active:scale-[0.98]"
        >
          <h4 className="font-black text-slate-900 group-hover:text-indigo-600 mb-1">
            {s.name}
          </h4>
          <p className="text-xs text-slate-500 font-medium line-clamp-2">
            {s.description}
          </p>
        </button>
      ))}
    </div>
  </div>
);

const ActiveStrategyView: React.FC<{
  lead: Lead;
  activeStrategy: Strategy;
  currentStep: Strategy['steps'][0] | undefined;
  onCompleteStep: () => void;
}> = ({ lead, activeStrategy, currentStep, onCompleteStep }) => (
  <div className="flex-1 flex flex-col space-y-8">
    {/* Message Preview */}
    <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">
            Live Message Preview
          </span>
          <span className="bg-white/10 text-[10px] font-bold px-3 py-1 rounded-full">
            Step {lead.currentStepIndex + 1}
          </span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <p className="text-sm font-medium leading-relaxed italic text-slate-200">
            "
            {currentStep?.template
              .replace('{companyName}', lead.companyName)
              .replace('{contactName}', lead.contactName || 'there') ||
              'No message drafted for this step.'}
            "
          </p>
        </div>
        {currentStep && (
          <button
            onClick={onCompleteStep}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            <Check size={18} strokeWidth={3} /> Mark Step as Done
          </button>
        )}
      </div>
    </div>

    {/* Sequence Progress */}
    <div className="space-y-6">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        Sequence Progress
      </h4>
      <div className="relative pl-10 space-y-8">
        <div className="absolute left-4 top-0 bottom-0 w-1 bg-slate-50 rounded-full" />
        {activeStrategy.steps.map((step, idx) => {
          const isCompleted = idx < lead.currentStepIndex;
          const isCurrent = idx === lead.currentStepIndex;
          return (
            <div key={idx} className="relative group">
              <div
                className={`absolute -left-8 top-0 w-5 h-5 rounded-full z-10 border-4 transition-all ${
                  isCompleted
                    ? 'bg-indigo-500 border-indigo-100'
                    : isCurrent
                      ? 'bg-white border-indigo-500'
                      : 'bg-slate-100 border-white'
                }`}
              />
              <div
                className={`p-5 rounded-[1.5rem] border transition-all ${
                  isCurrent
                    ? 'bg-indigo-50/50 border-indigo-100'
                    : 'bg-white border-slate-100 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h5
                    className={`text-xs font-black uppercase tracking-widest ${
                      isCurrent ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    {step.action.replace('_', ' ')}
                  </h5>
                  <span className="text-[10px] font-bold text-slate-300">
                    Day {step.dayOffset}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-slate-500 truncate">
                  {step.template}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

export default StrategyPanel;
