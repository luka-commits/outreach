import React from 'react';
import { Loader2, Rocket } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullScreen = false
}) => {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-soft-slate flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-pilot-blue rounded-xl flex items-center justify-center mx-auto">
              <Rocket size={36} className="text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 border border-gray-100">
              <Loader2 size={18} className="text-pilot-blue animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-navy tracking-tight">OutboundPilot</h2>
            <p className="text-gray-400 text-sm mt-1">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-4">
        <Loader2 size={32} className="text-pilot-blue animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
