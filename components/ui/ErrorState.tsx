import React from 'react';
import { AlertCircle, RefreshCw, type LucideIcon } from 'lucide-react';
import { Button } from './Button';
import { getErrorMessage } from '../../utils/errorMessages';

export interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  icon: Icon = AlertCircle,
  title = 'Something went wrong',
  error,
  message,
  onRetry,
  className = '',
}) => {
  const errorMessage = message || (error ? getErrorMessage(error) : 'An unexpected error occurred.');

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
        <Icon size={32} className="text-rose-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 max-w-sm mb-6">{errorMessage}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
};

ErrorState.displayName = 'ErrorState';
