import React from 'react';
import { Check, Shield, Zap, ArrowLeft } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LandingPricingProps {
  onBack: () => void;
  onSignIn: () => void;
}

export const LandingPricing: React.FC<LandingPricingProps> = ({ onBack, onSignIn }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar onSignIn={onSignIn} onNavigate={() => onBack()} />
      <main className="flex-1 bg-slate-50 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to home
          </button>

          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
            <p className="text-xl text-slate-500 font-medium">Invest in your growth engine.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-lg p-10 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-200" />
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Starter</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-slate-900">$0</span>
                <span className="text-slate-400 font-medium">/month</span>
              </div>
              <p className="text-slate-500 mb-8 font-medium">Perfect for trying out the engine.</p>

              <button
                onClick={onSignIn}
                className="w-full py-4 rounded-md bg-slate-100 text-slate-700 font-bold mb-8 hover:bg-slate-200 transition-all"
              >
                Get Started Free
              </button>

              <ul className="space-y-4">
                <FeatureItem text="50 Leads Limit" />
                <FeatureItem text="Basic Dashboard" />
                <FeatureItem text="Manual Tracking" />
              </ul>
            </div>

            {/* Pro Plan */}
            <div className="bg-slate-900 rounded-lg p-10 shadow-md relative overflow-hidden group transform hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-sky-500" />
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-all" />

              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-bold text-white">Pro Pilot</h3>
                <div className="bg-gradient-to-r from-blue-500 to-sky-500 text-white text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider">
                  Recommended
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-6 relative z-10">
                <span className="text-4xl font-bold text-white">$29</span>
                <span className="text-slate-400 font-medium">/month</span>
              </div>
              <p className="text-slate-400 mb-8 font-medium relative z-10">Maximize your outreach velocity.</p>

              <button
                onClick={onSignIn}
                className="w-full py-4 rounded-md bg-white text-slate-900 font-bold mb-8 hover:scale-[1.02] active:scale-95 transition-all shadow-sm relative z-10 flex items-center justify-center gap-2"
              >
                <Zap size={18} className="text-blue-600 fill-blue-600" />
                Start Free Trial
              </button>

              <ul className="space-y-4 relative z-10">
                <FeatureItem text="Unlimited Leads" dark />
                <FeatureItem text="Advanced Analytics" dark />
                <FeatureItem text="Multiple Strategies" dark />
                <FeatureItem text="Priority Support" dark />
              </ul>
            </div>
          </div>

          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-2 text-slate-400 font-medium text-sm">
              <Shield size={16} />
              <span>Secure payments processed by Stripe</span>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

const FeatureItem: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => (
  <div className={`flex items-center gap-3 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
    <div className={`rounded-full p-1 ${dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
      <Check size={12} strokeWidth={4} />
    </div>
    <span className="font-medium text-sm">{text}</span>
  </div>
);
