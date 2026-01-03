
import React from 'react';
import { Check, Shield, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';

const PricingPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { user } = useAuth();
    const { isPro, isTrial, trialDaysLeft, hasUsedTrial } = useSubscription();

    const handleUpgrade = () => {
        // STRIPE PAYMENT LINK INTEGRATION
        // This is the simplest way to accept payments without a backend server.
        // 1. Create a Payment Link in Stripe Dashboard.
        // 2. Paste the URL below.
        const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/5kQbJ1aug0Z1agt4uudwc02";

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
                            disabled={true}
                            className="w-full py-4 rounded-md bg-slate-100 text-slate-400 font-bold mb-8 cursor-default"
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

                        {isPro ? (
                            isTrial ? (
                                // User is in trial - show countdown and upgrade CTA
                                <div className="space-y-3 mb-8">
                                    <div className="text-center text-white/80 text-sm">
                                        {trialDaysLeft === 0
                                            ? 'Your trial ends today!'
                                            : trialDaysLeft === 1
                                            ? '1 day left in your trial'
                                            : `${trialDaysLeft} days left in your trial`}
                                    </div>
                                    <button
                                        onClick={handleManage}
                                        className="w-full py-4 rounded-md bg-white text-slate-900 font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-sm relative z-10 flex items-center justify-center gap-2"
                                    >
                                        <Zap size={18} className="text-blue-600 fill-blue-600" />
                                        Upgrade Now - Keep Pro Access
                                    </button>
                                    <p className="text-center text-slate-400 text-xs">
                                        You won't be charged until your trial ends
                                    </p>
                                </div>
                            ) : (
                                // User is paid Pro
                                <button
                                    onClick={handleManage}
                                    className="w-full py-4 rounded-md bg-white/10 text-white font-bold mb-8 hover:bg-white/20 transition-all"
                                >
                                    Manage Subscription
                                </button>
                            )
                        ) : (
                            // User is on free plan
                            <div className="space-y-2 mb-8">
                                <button
                                    onClick={handleUpgrade}
                                    className="w-full py-4 rounded-md bg-white text-slate-900 font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-sm relative z-10 flex items-center justify-center gap-2"
                                >
                                    <Zap size={18} className="text-blue-600 fill-blue-600" />
                                    {hasUsedTrial ? 'Upgrade to Pro' : 'Start 14-Day Free Trial'}
                                </button>
                                {!hasUsedTrial && (
                                    <p className="text-center text-slate-400 text-xs">
                                        No charge for 14 days. Cancel anytime.
                                    </p>
                                )}
                            </div>
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
        <div className={`rounded-full p-1 ${dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
            <Check size={12} strokeWidth={4} />
        </div>
        <span className="font-medium text-sm">{text}</span>
    </div>
);

export default PricingPage;
