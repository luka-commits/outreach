
import React, { useState, useEffect } from 'react';
import { User, CreditCard, LogOut, Shield, Key, Eye, EyeOff, Check, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { getUserApiKeys, updateUserApiKeys } from '../services/supabase';

interface SettingsViewProps {
    onClose: () => void;
    onOpenPricing: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onClose, onOpenPricing }) => {
    const { user, signOut } = useAuth();
    const { subscription, isPro } = useSubscription();

    // API Keys state
    const [apifyToken, setApifyToken] = useState('');
    const [anthropicKey, setAnthropicKey] = useState('');
    const [showApifyToken, setShowApifyToken] = useState(false);
    const [showAnthropicKey, setShowAnthropicKey] = useState(false);
    const [apiKeysLoading, setApiKeysLoading] = useState(true);
    const [apiKeysSaving, setApiKeysSaving] = useState(false);
    const [apiKeysSaved, setApiKeysSaved] = useState(false);

    // Load existing API keys
    useEffect(() => {
        if (user?.id) {
            getUserApiKeys(user.id)
                .then((keys) => {
                    setApifyToken(keys.apifyToken || '');
                    setAnthropicKey(keys.anthropicKey || '');
                })
                .catch(console.error)
                .finally(() => setApiKeysLoading(false));
        }
    }, [user?.id]);

    const handleSaveApiKeys = async () => {
        if (!user?.id) return;

        setApiKeysSaving(true);
        try {
            await updateUserApiKeys(user.id, {
                apifyToken: apifyToken || null,
                anthropicKey: anthropicKey || null,
            });
            setApiKeysSaved(true);
            setTimeout(() => setApiKeysSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save API keys:', error);
            alert('Failed to save API keys. Please try again.');
        } finally {
            setApiKeysSaving(false);
        }
    };

    const handleManageBilling = () => {
        // Stripe Customer Portal
        const STRIPE_PORTAL_LINK = "https://billing.stripe.com/p/login/cNi8wP59W3790FT1iidwc00";
        window.open(STRIPE_PORTAL_LINK, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6 animate-in slide-in-from-bottom-8 duration-300">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onClose} className="bg-white p-2 rounded-xl text-slate-500 hover:text-slate-900 shadow-sm border border-slate-200">
                        ← Back
                    </button>
                    <h1 className="text-3xl font-black text-slate-900">Settings</h1>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{user?.email}</h2>
                            <p className="text-slate-500 text-sm">Account ID: {user?.id.slice(0, 8)}...</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <section>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Subscription</h3>
                            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <p className="font-black text-lg text-slate-900">
                                            {isPro ? 'Pro Pilot Plan' : 'Starter Plan'}
                                        </p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isPro ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-600'}`}>
                                            {subscription?.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 text-sm">
                                        {isPro ? 'Next billing date: Coming soon' : 'Upgrade to remove limits.'}
                                    </p>
                                </div>
                                {isPro ? (
                                    <button
                                        onClick={handleManageBilling}
                                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50"
                                    >
                                        Manage Billing
                                    </button>
                                ) : (
                                    <button
                                        onClick={onOpenPricing}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                                    >
                                        Upgrade Now
                                    </button>
                                )}
                            </div>
                        </section>

                        <div className="pt-4 border-t border-slate-100">
                            <button
                                onClick={() => signOut()}
                                className="w-full py-4 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* API Keys Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                            <Key size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">API Keys</h2>
                            <p className="text-slate-500 text-sm">Required for Lead Finder scraping</p>
                        </div>
                    </div>

                    {apiKeysLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-slate-400" size={24} />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Apify Token */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Apify API Token
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApifyToken ? 'text' : 'password'}
                                        value={apifyToken}
                                        onChange={(e) => setApifyToken(e.target.value)}
                                        placeholder="apify_api_..."
                                        className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowApifyToken(!showApifyToken)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showApifyToken ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                    Get your token at{' '}
                                    <a
                                        href="https://console.apify.com/account/integrations"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-600 hover:underline inline-flex items-center gap-0.5"
                                    >
                                        Apify Console <ExternalLink size={10} />
                                    </a>
                                </p>
                            </div>

                            {/* Anthropic Key */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Anthropic API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showAnthropicKey ? 'text' : 'password'}
                                        value={anthropicKey}
                                        onChange={(e) => setAnthropicKey(e.target.value)}
                                        placeholder="sk-ant-..."
                                        className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showAnthropicKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                    Get your key at{' '}
                                    <a
                                        href="https://console.anthropic.com/settings/keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-600 hover:underline inline-flex items-center gap-0.5"
                                    >
                                        Anthropic Console <ExternalLink size={10} />
                                    </a>
                                </p>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveApiKeys}
                                disabled={apiKeysSaving}
                                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {apiKeysSaving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : apiKeysSaved ? (
                                    <>
                                        <Check size={18} />
                                        Saved!
                                    </>
                                ) : (
                                    'Save API Keys'
                                )}
                            </button>

                            {/* Info box */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <p className="text-sm text-amber-800">
                                    <strong>Why do I need these?</strong><br />
                                    The Lead Finder uses Apify to scrape Google Maps and Anthropic's Claude to extract contact information from websites. You pay for your own usage directly to these services.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
