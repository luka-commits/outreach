import React from 'react';
import { Rocket } from 'lucide-react';

type LandingView = 'home' | 'privacy' | 'terms' | 'imprint' | 'pricing' | 'faq';

interface FooterProps {
  onNavigate?: (view: LandingView) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">OutboundPilot</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm">
            <button
              onClick={() => onNavigate?.('privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy
            </button>
            <button
              onClick={() => onNavigate?.('terms')}
              className="hover:text-white transition-colors"
            >
              Terms
            </button>
            <button
              onClick={() => onNavigate?.('imprint')}
              className="hover:text-white transition-colors"
            >
              Imprint
            </button>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href="mailto:luka@flouence.com"
              className="hover:text-white transition-colors"
            >
              luka@flouence.com
            </a>
            <a
              href="tel:+4917683300657"
              className="hover:text-white transition-colors"
            >
              +49 176 8330 0657
            </a>
          </div>

          {/* Copyright */}
          <div className="text-sm">
            © 2026 OutboundPilot
          </div>
        </div>
      </div>
    </footer>
  );
};
