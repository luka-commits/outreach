import React, { useState } from 'react';
import { X, AlertCircle, Target, Loader2 } from 'lucide-react';
import { Strategy } from '../types';
import { getStrategyColor } from '../utils/styles';

interface BulkStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (strategyId: string | null) => void;
  selectedCount: number;
  strategies: Strategy[];
  isLoading?: boolean;
}

const BulkStrategyModal: React.FC<BulkStrategyModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  strategies,
  isLoading = false,
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedStrategyId);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Assign Sequence</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-slate-600 mb-6">
            Assign a sequence to <span className="font-bold text-slate-900">{selectedCount}</span> lead{selectedCount !== 1 ? 's' : ''}.
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {/* No Strategy Option */}
            <label
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedStrategyId === null
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="strategy"
                value=""
                checked={selectedStrategyId === null}
                onChange={() => setSelectedStrategyId(null)}
                className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="font-bold text-slate-900">No Sequence</p>
                <p className="text-sm text-slate-500">Remove sequence assignment</p>
              </div>
            </label>

            {/* Strategy Options */}
            {strategies.map((strategy) => {
              const stratColor = getStrategyColor(strategy.color);
              return (
                <label
                  key={strategy.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedStrategyId === strategy.id
                      ? `${stratColor.border} ${stratColor.bg}`
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={strategy.id}
                    checked={selectedStrategyId === strategy.id}
                    onChange={() => setSelectedStrategyId(strategy.id)}
                    className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${stratColor.solid}`} />
                      <p className="font-medium text-slate-900">{strategy.name}</p>
                    </div>
                    {strategy.description && (
                      <p className="text-sm text-slate-500 mt-1">{strategy.description}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {strategy.steps.length} step{strategy.steps.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </label>
              );
            })}

            {strategies.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Target size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-medium">No sequences created yet</p>
                <p className="text-sm">Create a sequence in the Sequences tab first.</p>
              </div>
            )}
          </div>

          {/* Info notice */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium text-blue-800 text-sm">Progress Reset</p>
              <p className="text-blue-700 text-sm">
                This will reset progress to Step 1 for all selected leads.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-md font-medium text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Sequence'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkStrategyModal;
