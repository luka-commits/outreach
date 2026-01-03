import React from 'react';
import { Rocket } from 'lucide-react';
import { ShimmerButton } from './ui/shimmer-button';

type LandingView = 'home' | 'privacy' | 'terms' | 'imprint' | 'pricing' | 'faq';

interface NavbarProps {
  onSignIn: () => void;
  onNavigate?: (view: LandingView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignIn, onNavigate }) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate?.('home')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">OutboundPilot</span>
            </button>

            <div className="hidden sm:flex items-center gap-6">
              <button
                onClick={() => onNavigate?.('home')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => onNavigate?.('pricing')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Pricing
              </button>
              <button
                onClick={() => onNavigate?.('faq')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                FAQ
              </button>
            </div>
          </div>

          <ShimmerButton onClick={onSignIn} className="px-5 py-2.5 text-sm font-semibold">
            Get started
          </ShimmerButton>
        </div>
      </div>
    </nav>
  );
};
