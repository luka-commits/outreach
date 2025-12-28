
import React from 'react';
import { Check, Shield, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

const PricingPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { user } = useAuth();
    const { isPro, isLoading } = useSubscription();

    const handleUpgrade = () => {
        // STRIPE PAYMENT LINK INTEGRATION
        // This is the simplest way to accept payments without a backend server.
        // 1. Create a Payment Link in Stripe Dashboard.
        // 2. Paste the URL below.
        const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/aFa00j7i4gXZ4W97GGdwc01";

        // Append user details for tracking
        const checkoutUrl = `${STRIPE_PAYMENT_LINK}?client_reference_id=${user?.id}&prefilled_email=${encodeURIComponent(user?.email || '')}`;

        // Redirect
        window.open(checkoutUrl, '_blank');
    };

    const handleManage = () => {
        // Use the Customer Portal link from Stripe Dashboard
        alert("To enable Customer Portal, configure it in Stripe and add the link here.");
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6 animate-in fade-in zoom-in duration-300">
            <div className="max-w-5xl mx-auto">
                <button onClick={onBack} className="mb-8 text-slate-500 hover:text-slate-900 font-bold text-sm">
                    ← Back to App
                </button>

                <div className="text-center mb-16 space-y-4">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-slate-500 font-medium">Invest in your growth engine.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Free Plan */}
                    <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-slate-200" />
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Starter</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-black text-slate-900">$0</span>
                            <span className="text-slate-400 font-bold">/month</span>
                        </div>
                        <p className="text-slate-500 mb-8 font-medium">Perfect for trying out the engine.</p>

                        <button
                            disabled={true}
                            className="w-full py-4 rounded-xl bg-slate-100 text-slate-400 font-black mb-8 cursor-default"
                        >
                            Current Plan
                        </button>

                        <ul className="space-y-4">
                            <FeatureItem text="50 Leads Limit" />
                            <FeatureItem text="Basic Dashboard" />
                            <FeatureItem text="Manual Tracking" />
                        </ul>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-slate-900 rounded-[2rem] p-10 shadow-2xl shadow-indigo-500/20 relative overflow-hidden group transform hover:-translate-y-2 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] group-hover:bg-indigo-500/30 transition-all" />

                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-2xl font-black text-white">Pro Pilot</h3>
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                Recommended
                            </div>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6 relative z-10">
                            <span className="text-4xl font-black text-white">$29</span>
                            <span className="text-slate-400 font-bold">/month</span>
                        </div>
                        <p className="text-slate-400 mb-8 font-medium relative z-10">Maximize your outreach velocity.</p>

                        {isPro ? (
                            <button
                                onClick={handleManage}
                                className="w-full py-4 rounded-xl bg-white/10 text-white font-black mb-8 hover:bg-white/20 transition-all"
                            >
                                Manage Subscription
                            </button>
                        ) : (
                            <button
                                onClick={handleUpgrade}
                                className="w-full py-4 rounded-xl bg-white text-slate-900 font-black mb-8 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/10 relative z-10 flex items-center justify-center gap-2"
                            >
                                <Zap size={18} className="text-indigo-600 fill-indigo-600" />
                                Upgrade to Pro
                            </button>
                        )}

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
        </div>
    );
};

const FeatureItem: React.FC<{ text: string, dark?: boolean }> = ({ text, dark }) => (
    <div className={`flex items-center gap-3 ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
        <div className={`rounded-full p-1 ${dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
            <Check size={12} strokeWidth={4} />
        </div>
        <span className="font-bold text-sm">{text}</span>
    </div>
);

export default PricingPage;
