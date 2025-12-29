
import React, { useState, useEffect } from 'react';
import { User, CreditCard, LogOut, Shield, Key, Eye, EyeOff, Check, Loader2, ExternalLink, Phone, CheckCircle2, Settings, Mail, Building2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../hooks/useSubscription';
import { getUserApiKeys, updateUserApiKeys } from '../services/supabase';
import { useHasTwilioConfigured, useClearTwilioCredentials } from '../hooks/queries/useTwilioCredentialsQuery';
import { useHasGmailConfigured, useClearGmailCredentials, useHasResendConfigured, useUpdateResendCredentials, useClearResendCredentials } from '../hooks/queries/useEmailSettingsQuery';
import TwilioSetupWizard from './TwilioSetupWizard';
import GmailOAuthButton from './GmailOAuthButton';

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

    // Twilio state
    const [showTwilioWizard, setShowTwilioWizard] = useState(false);
    const { isConfigured: twilioConfigured, isLoading: twilioLoading, credentials: twilioCredentials } = useHasTwilioConfigured();
    const clearTwilioCredentials = useClearTwilioCredentials();

    // Email state - Gmail
    const { isConfigured: gmailConfigured, isLoading: gmailLoading, credentials: gmailCredentials } = useHasGmailConfigured();
    const clearGmailCredentials = useClearGmailCredentials();

    // Email state - Resend
    const { isConfigured: resendConfigured, isLoading: resendLoading, credentials: resendCredentials } = useHasResendConfigured();
    const updateResendCredentials = useUpdateResendCredentials();
    const clearResendCredentials = useClearResendCredentials();
    const [resendApiKey, setResendApiKey] = useState('');
    const [resendFromAddress, setResendFromAddress] = useState('');
    const [showResendApiKey, setShowResendApiKey] = useState(false);
    const [resendSaving, setResendSaving] = useState(false);
    const [resendSaved, setResendSaved] = useState(false);

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

    // Load existing Resend credentials
    useEffect(() => {
        if (resendCredentials) {
            setResendApiKey(resendCredentials.apiKey);
            setResendFromAddress(resendCredentials.fromAddress);
        }
    }, [resendCredentials]);

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

    const handleSaveResendCredentials = async () => {
        if (!resendApiKey || !resendFromAddress) {
            alert('Please fill in both API Key and From Address.');
            return;
        }

        setResendSaving(true);
        try {
            await updateResendCredentials.mutateAsync({
                apiKey: resendApiKey,
                fromAddress: resendFromAddress,
            });
            setResendSaved(true);
            setTimeout(() => setResendSaved(false), 2000);
        } catch (error) {
            console.error('Failed to save Resend credentials:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setResendSaving(false);
        }
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

                {/* Twilio Calling Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Cold Calling</h2>
                            <p className="text-slate-500 text-sm">Make calls directly from your browser</p>
                        </div>
                    </div>

                    {twilioLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-slate-400" size={24} />
                        </div>
                    ) : twilioConfigured && twilioCredentials ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle2 className="text-green-600" size={24} />
                                    <span className="font-bold text-green-800">Twilio Connected</span>
                                </div>
                                <div className="space-y-2 text-sm text-green-700">
                                    <p><strong>Phone Number:</strong> {twilioCredentials.phoneNumber}</p>
                                    <p><strong>Account:</strong> {twilioCredentials.accountSid.slice(0, 10)}...</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowTwilioWizard(true)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Settings size={18} />
                                    Reconfigure
                                </button>
                                <button
                                    onClick={() => clearTwilioCredentials.mutate()}
                                    disabled={clearTwilioCredentials.isPending}
                                    className="px-4 py-3 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                                >
                                    {clearTwilioCredentials.isPending ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'Disconnect'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-2xl p-6">
                                <p className="text-sm text-slate-600 mb-4">
                                    Connect your Twilio account to make calls directly from OutreachPilot.
                                    Calls cost ~$0.014/min and are billed directly to your Twilio account.
                                </p>
                                <button
                                    onClick={() => setShowTwilioWizard(true)}
                                    className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Phone size={18} />
                                    Set Up Calling
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Email - Personal Gmail Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Email - Personal Gmail</h2>
                            <p className="text-slate-500 text-sm">Send from your Gmail, appears in your Sent folder</p>
                        </div>
                    </div>

                    {gmailLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-slate-400" size={24} />
                        </div>
                    ) : gmailConfigured && gmailCredentials ? (
                        <div className="space-y-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle2 className="text-purple-600" size={24} />
                                    <span className="font-bold text-purple-800">Gmail Connected</span>
                                </div>
                                <div className="space-y-2 text-sm text-purple-700">
                                    <p><strong>Email:</strong> {gmailCredentials.email}</p>
                                    <p><strong>Expires:</strong> {new Date(gmailCredentials.expiresAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => clearGmailCredentials.mutate()}
                                    disabled={clearGmailCredentials.isPending}
                                    className="w-full py-3 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {clearGmailCredentials.isPending ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'Disconnect Gmail'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-2xl p-6">
                                <p className="text-sm text-slate-600 mb-4">
                                    Connect your Gmail account to send emails directly from OutreachPilot.
                                    Emails will appear in your Gmail Sent folder.
                                </p>
                                <GmailOAuthButton
                                    onSuccess={(email) => console.log('Gmail connected:', email)}
                                    onError={(error) => console.error('Gmail error:', error)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Email - Business Domain Card */}
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Email - Business Domain</h2>
                            <p className="text-slate-500 text-sm">Send from your company domain via Resend</p>
                        </div>
                    </div>

                    {resendLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-slate-400" size={24} />
                        </div>
                    ) : resendConfigured && resendCredentials ? (
                        <div className="space-y-4">
                            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle2 className="text-indigo-600" size={24} />
                                    <span className="font-bold text-indigo-800">Resend Connected</span>
                                </div>
                                <div className="space-y-2 text-sm text-indigo-700">
                                    <p><strong>From Address:</strong> {resendCredentials.fromAddress}</p>
                                    <p><strong>API Key:</strong> {resendCredentials.apiKey.slice(0, 10)}...</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => clearResendCredentials.mutate()}
                                    disabled={clearResendCredentials.isPending}
                                    className="w-full py-3 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {clearResendCredentials.isPending ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        'Disconnect Resend'
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Resend API Key */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    Resend API Key
                                </label>
                                <div className="relative">
                                    <input
                                        type={showResendApiKey ? 'text' : 'password'}
                                        value={resendApiKey}
                                        onChange={(e) => setResendApiKey(e.target.value)}
                                        placeholder="re_..."
                                        className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowResendApiKey(!showResendApiKey)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showResendApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                    Get your API key at{' '}
                                    <a
                                        href="https://resend.com/api-keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                                    >
                                        Resend Dashboard <ExternalLink size={10} />
                                    </a>
                                </p>
                            </div>

                            {/* From Address */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    From Address
                                </label>
                                <input
                                    type="email"
                                    value={resendFromAddress}
                                    onChange={(e) => setResendFromAddress(e.target.value)}
                                    placeholder="hello@yourcompany.com"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Must be a verified domain in your Resend account
                                </p>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveResendCredentials}
                                disabled={resendSaving || !resendApiKey || !resendFromAddress}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {resendSaving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : resendSaved ? (
                                    <>
                                        <Check size={18} />
                                        Saved!
                                    </>
                                ) : (
                                    'Save Resend Settings'
                                )}
                            </button>

                            {/* Info box */}
                            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                                <p className="text-sm text-indigo-800">
                                    <strong>Setup Steps:</strong><br />
                                    1. Create account at <a href="https://resend.com" target="_blank" className="underline">resend.com</a><br />
                                    2. Add & verify your domain (DNS records)<br />
                                    3. Create an API key and paste above
                                </p>
                            </div>
                        </div>
                    )}
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

            {/* Twilio Setup Wizard Modal */}
            {showTwilioWizard && (
                <TwilioSetupWizard
                    onClose={() => setShowTwilioWizard(false)}
                    onComplete={() => setShowTwilioWizard(false)}
                />
            )}
        </div>
    );
};

export default SettingsView;
