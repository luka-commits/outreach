import React, { useState, useEffect } from 'react';
import { Mail, Building2, ExternalLink, Eye, EyeOff, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { radius, shadows } from '../../lib/designTokens';
import GmailOAuthButton from '../GmailOAuthButton';
import {
  useHasGmailConfigured,
  useClearGmailCredentials,
  useHasResendConfigured,
  useUpdateResendCredentials,
  useClearResendCredentials,
} from '../../hooks/queries/useEmailSettingsQuery';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

type EmailChoice = 'gmail' | 'resend' | null;

const EmailTab: React.FC = () => {
  const { showToast } = useToast();

  // Gmail state
  const {
    isConfigured: gmailConfigured,
    isLoading: gmailLoading,
    credentials: gmailCredentials,
  } = useHasGmailConfigured();
  const clearGmailCredentials = useClearGmailCredentials();

  // Resend state
  const {
    isConfigured: resendConfigured,
    isLoading: resendLoading,
    credentials: resendCredentials,
  } = useHasResendConfigured();
  const updateResendCredentials = useUpdateResendCredentials();
  const clearResendCredentials = useClearResendCredentials();

  // Local form state
  const [choice, setChoice] = useState<EmailChoice>(null);
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendFromAddress, setResendFromAddress] = useState('');
  const [showResendApiKey, setShowResendApiKey] = useState(false);
  const [resendSaving, setResendSaving] = useState(false);
  const [resendSaved, setResendSaved] = useState(false);

  // Load existing Resend credentials
  useEffect(() => {
    if (resendCredentials) {
      setResendApiKey(resendCredentials.apiKey);
      setResendFromAddress(resendCredentials.fromAddress);
    }
  }, [resendCredentials]);

  // Auto-select choice based on what's configured
  useEffect(() => {
    if (gmailConfigured) {
      setChoice('gmail');
    } else if (resendConfigured) {
      setChoice('resend');
    }
  }, [gmailConfigured, resendConfigured]);

  const handleSaveResendCredentials = async () => {
    if (!resendApiKey || !resendFromAddress) {
      showToast('Please fill in both API Key and From Address', 'error');
      return;
    }

    setResendSaving(true);
    try {
      await updateResendCredentials.mutateAsync({
        apiKey: resendApiKey,
        fromAddress: resendFromAddress,
      });
      setResendSaved(true);
      showToast('Resend credentials saved', 'success');
      setTimeout(() => setResendSaved(false), 2000);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setResendSaving(false);
    }
  };

  const handleDisconnectGmail = () => {
    clearGmailCredentials.mutate(undefined, {
      onSuccess: () => {
        showToast('Gmail disconnected', 'success');
        setChoice(null);
      },
      onError: (error) => showToast(getErrorMessage(error), 'error'),
    });
  };

  const handleDisconnectResend = () => {
    clearResendCredentials.mutate(undefined, {
      onSuccess: () => {
        showToast('Resend disconnected', 'success');
        setChoice(null);
        setResendApiKey('');
        setResendFromAddress('');
      },
      onError: (error) => showToast(getErrorMessage(error), 'error'),
    });
  };

  const isLoading = gmailLoading || resendLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  // If something is already connected, show that
  if (gmailConfigured && gmailCredentials) {
    return (
      <div className="space-y-6">
        <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Email Connected</h2>
              <p className="text-slate-500 text-sm">Sending from your Gmail account</p>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-purple-600" size={20} />
              <span className="font-medium text-purple-800">Gmail Connected</span>
            </div>
            <div className="text-sm text-purple-700 space-y-1">
              <p><strong>Email:</strong> {gmailCredentials.email}</p>
              {gmailCredentials.expiresAt && (
                <p><strong>Expires:</strong> {new Date(gmailCredentials.expiresAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={handleDisconnectGmail}
              loading={clearGmailCredentials.isPending}
              className="text-red-600 hover:bg-red-50"
              fullWidth
            >
              Disconnect Gmail
            </Button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setChoice('resend')}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Switch to business email instead
          </button>
        </div>
      </div>
    );
  }

  if (resendConfigured && resendCredentials) {
    return (
      <div className="space-y-6">
        <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Email Connected</h2>
              <p className="text-slate-500 text-sm">Sending from your business domain</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-blue-600" size={20} />
              <span className="font-medium text-blue-800">Resend Connected</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>From:</strong> {resendCredentials.fromAddress}</p>
              <p><strong>API Key:</strong> {resendCredentials.apiKey.slice(0, 10)}...</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={handleDisconnectResend}
              loading={clearResendCredentials.isPending}
              className="text-red-600 hover:bg-red-50"
              fullWidth
            >
              Disconnect Resend
            </Button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setChoice('gmail')}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Switch to Gmail instead
          </button>
        </div>
      </div>
    );
  }

  // Nothing connected - show choice UI
  return (
    <div className="space-y-6">
      {/* Choice cards */}
      {!choice && (
        <>
          <p className="text-slate-600">
            Choose how you want to send emails from Outbound Pilot:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Gmail option */}
            <button
              onClick={() => setChoice('gmail')}
              className={`p-6 ${radius.md} border-2 border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all text-left`}
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 mb-4">
                <Mail size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Personal Gmail</h3>
              <p className="text-sm text-slate-500">
                Use your Gmail account. Emails appear in your sent folder.
              </p>
              <p className="text-xs text-purple-600 mt-2 font-medium">
                Recommended for most users
              </p>
            </button>

            {/* Resend option */}
            <button
              onClick={() => setChoice('resend')}
              className={`p-6 ${radius.md} border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left`}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                <Building2 size={24} />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Business Domain</h3>
              <p className="text-sm text-slate-500">
                Send from your company domain via Resend.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Requires domain setup
              </p>
            </button>
          </div>
        </>
      )}

      {/* Gmail setup */}
      {choice === 'gmail' && (
        <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Connect Gmail</h2>
              <p className="text-slate-500 text-sm">Send emails from your Gmail account</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <p className="text-sm text-slate-600">
              Connect your Gmail account to send emails. Emails will appear in your Gmail Sent folder.
            </p>

            <GmailOAuthButton
              onSuccess={() => {}}
              onError={(error) => console.error('Gmail error:', error)}
            />
          </div>

          <button
            onClick={() => setChoice(null)}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700"
          >
            Choose a different option
          </button>
        </div>
      )}

      {/* Resend setup */}
      {choice === 'resend' && (
        <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Business Email Setup</h2>
              <p className="text-slate-500 text-sm">Send from your company domain via Resend</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Resend API Key
              </label>
              <div className="relative">
                <input
                  type={showResendApiKey ? 'text' : 'password'}
                  value={resendApiKey}
                  onChange={(e) => setResendApiKey(e.target.value)}
                  placeholder="re_..."
                  className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
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
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  Resend Dashboard <ExternalLink size={10} />
                </a>
              </p>
            </div>

            {/* From Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                From Address
              </label>
              <input
                type="email"
                value={resendFromAddress}
                onChange={(e) => setResendFromAddress(e.target.value)}
                placeholder="hello@yourcompany.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
              />
              <p className="mt-2 text-xs text-slate-500">
                Must be a verified domain in your Resend account
              </p>
            </div>

            {/* Save Button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleSaveResendCredentials}
              loading={resendSaving}
              disabled={!resendApiKey || !resendFromAddress}
              fullWidth
            >
              {resendSaved ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : (
                'Save Resend Settings'
              )}
            </Button>

            {/* Setup steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Setup Steps:</strong>
              </p>
              <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                <li>Create account at <a href="https://resend.com" target="_blank" className="underline">resend.com</a></li>
                <li>Add & verify your domain (DNS records)</li>
                <li>Create an API key and paste above</li>
              </ol>
            </div>
          </div>

          <button
            onClick={() => setChoice(null)}
            className="mt-4 text-sm text-slate-500 hover:text-slate-700"
          >
            Choose a different option
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailTab;
