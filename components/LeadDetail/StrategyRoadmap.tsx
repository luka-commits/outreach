import React, { memo, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Lead, Strategy } from '../../types';
import { getStrategyColor } from '../../utils/styles';

interface StrategyRoadmapProps {
  lead: Lead;
  strategy: Strategy | null;
  strategies: Strategy[];
  onSelectStrategy: (strategy: Strategy) => void;
  onSwitchStrategy: () => void;
}

const StrategyRoadmap: React.FC<StrategyRoadmapProps> = memo(({
  lead,
  strategy,
  strategies,
  onSelectStrategy,
  onSwitchStrategy,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  if (!strategy) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">No strategy selected</span>
          <StrategyDropdown
            strategies={strategies}
            currentStrategy={null}
            onSelect={onSelectStrategy}
            showDropdown={showDropdown}
            setShowDropdown={setShowDropdown}
          />
        </div>
      </div>
    );
  }

  const steps = strategy.steps;
  const currentIndex = lead.currentStepIndex;
  const isComplete = currentIndex >= steps.length;
  const strategyColor = getStrategyColor(strategy.color);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      {/* Header with strategy name and dropdown */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${strategyColor.solid}`} />
          <span className={`text-xs font-medium ${strategyColor.text} uppercase tracking-wider`}>
            {strategy.name}
          </span>
          {isComplete && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase">
              Complete
            </span>
          )}
        </div>
        <StrategyDropdown
          strategies={strategies}
          currentStrategy={strategy}
          onSelect={onSelectStrategy}
          onSwitch={onSwitchStrategy}
          showDropdown={showDropdown}
          setShowDropdown={setShowDropdown}
        />
      </div>

      {/* Horizontal Roadmap */}
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 rounded-full" />
        <div
          className={`absolute top-3 left-0 h-0.5 ${strategyColor.solid} rounded-full transition-all duration-500`}
          style={{
            width: isComplete
              ? '100%'
              : `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <div
                key={idx}
                className="flex flex-col items-center"
                style={{ width: `${100 / steps.length}%` }}
              >
                {/* Circle */}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isCompleted
                      ? `${strategyColor.solid} text-white`
                      : isCurrent
                        ? `bg-white border-2 ${strategyColor.border} ${strategyColor.text}`
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <p className={`text-[10px] font-bold uppercase tracking-tight ${
                    isCurrent ? strategyColor.text : isCompleted ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    Day {step.dayOffset}
                  </p>
                  <p className={`text-[9px] capitalize ${
                    isCurrent ? strategyColor.text : 'text-slate-400'
                  }`}>
                    {formatAction(step.action)}
                  </p>
                </div>

                {/* Current indicator */}
                {isCurrent && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                    <span className={`text-[8px] font-bold ${strategyColor.text} uppercase tracking-widest whitespace-nowrap`}>
                      You are here
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

StrategyRoadmap.displayName = 'StrategyRoadmap';

// Strategy dropdown component
interface StrategyDropdownProps {
  strategies: Strategy[];
  currentStrategy: Strategy | null;
  onSelect: (strategy: Strategy) => void;
  onSwitch?: () => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
}

const StrategyDropdown: React.FC<StrategyDropdownProps> = ({
  strategies,
  currentStrategy,
  onSelect,
  onSwitch,
  showDropdown,
  setShowDropdown,
}) => {
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        {currentStrategy ? 'Change' : 'Select'}
        <ChevronDown size={14} />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
            {currentStrategy && onSwitch && (
              <>
                <button
                  onClick={() => {
                    onSwitch();
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Remove Strategy
                </button>
                <div className="border-t border-slate-100 my-1" />
              </>
            )}
            {strategies.map((s) => {
              const sColor = getStrategyColor(s.color);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelect(s);
                    setShowDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                    currentStrategy?.id === s.id
                      ? `${sColor.bg} ${sColor.text}`
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${sColor.solid}`} />
                    <p className="font-bold">{s.name}</p>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5 ml-4.5 line-clamp-1">
                    {s.steps.length} steps • {s.description}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Format action for display
function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default StrategyRoadmap;
