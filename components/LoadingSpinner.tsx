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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
              <Rocket size={36} className="text-white fill-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-lg">
              <Loader2 size={20} className="text-indigo-600 animate-spin" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">OutreachPilot</h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center space-y-4">
        <Loader2 size={40} className="text-indigo-600 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
