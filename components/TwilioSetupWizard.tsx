import React, { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  ExternalLink,
  Phone,
  Key,
  Settings,
  Copy,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { TwilioCredentials } from '../types';
import { useUpdateTwilioCredentials } from '../hooks/queries/useTwilioCredentialsQuery';
import { useToast } from './Toast';
import { getSession } from '../services/supabase';

interface TwilioSetupWizardProps {
  onClose: () => void;
  onComplete: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

const TwilioSetupWizard: React.FC<TwilioSetupWizardProps> = ({ onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [twimlAppSid, setTwimlAppSid] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState('');
  const [copied, setCopied] = useState(false);

  const updateCredentials = useUpdateTwilioCredentials();
  const { showToast } = useToast();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

  const voiceUrl = `${supabaseUrl}/functions/v1/twilio-voice`;
  const statusCallbackUrl = `${supabaseUrl}/functions/v1/call-status`;

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyCredentials = async () => {
    if (!accountSid.trim() || !authToken.trim()) {
      setVerificationError('Please enter both Account SID and Auth Token');
      setVerificationStatus('error');
      return;
    }

    setVerifying(true);
    setVerificationStatus('idle');
    setVerificationError('');

    try {
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-twilio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          step: 'credentials',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify credentials');
      }

      setVerificationStatus('success');
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Verification failed');
      setVerificationStatus('error');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyTwimlApp = async () => {
    if (!twimlAppSid.trim()) {
      setVerificationError('Please enter the TwiML App SID');
      setVerificationStatus('error');
      return;
    }

    setVerifying(true);
    setVerificationStatus('idle');
    setVerificationError('');

    try {
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-twilio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          twimlAppSid: twimlAppSid.trim(),
          step: 'twiml_app',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify TwiML App');
      }

      setVerificationStatus('success');
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Verification failed');
      setVerificationStatus('error');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyPhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      setVerificationError('Please enter your Twilio phone number');
      setVerificationStatus('error');
      return;
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber.trim())) {
      setVerificationError('Phone number must be in E.164 format (e.g., +15551234567)');
      setVerificationStatus('error');
      return;
    }

    setVerifying(true);
    setVerificationStatus('idle');
    setVerificationError('');

    try {
      const session = await getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-twilio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          accountSid: accountSid.trim(),
          authToken: authToken.trim(),
          phoneNumber: phoneNumber.trim(),
          step: 'phone_number',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to verify phone number');
      }

      setVerificationStatus('success');
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Verification failed');
      setVerificationStatus('error');
    } finally {
      setVerifying(false);
    }
  };

  const handleComplete = async () => {
    const credentials: TwilioCredentials = {
      accountSid: accountSid.trim(),
      authToken: authToken.trim(),
      twimlAppSid: twimlAppSid.trim(),
      phoneNumber: phoneNumber.trim(),
    };

    try {
      await updateCredentials.mutateAsync(credentials);
      showToast('Twilio setup complete! You can now make calls.', 'success');
      onComplete();
    } catch {
      showToast('Failed to save credentials. Please try again.', 'error');
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return accountCreated;
      case 2:
        return verificationStatus === 'success' && !!accountSid && !!authToken;
      case 3:
        return verificationStatus === 'success' && !!twimlAppSid;
      case 4:
        return verificationStatus === 'success' && !!phoneNumber;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as WizardStep);
      setVerificationStatus('idle');
      setVerificationError('');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
      setVerificationStatus('idle');
      setVerificationError('');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="text-red-600" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Create a Twilio Account</h2>
              <p className="text-slate-500">
                Twilio powers the phone calls in Outbound Pilot. Create a free account to get started.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-slate-900">What is Twilio?</h3>
              <p className="text-sm text-slate-600">
                Twilio is a trusted cloud communications platform used by millions of businesses.
                You&apos;ll pay Twilio directly for your calls (typically $0.014/min for outbound).
              </p>
              <a
                href="https://www.twilio.com/try-twilio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
              >
                Create Twilio Account
                <ExternalLink size={16} />
              </a>
            </div>

            <label className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                checked={accountCreated}
                onChange={(e) => setAccountCreated(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-medium text-slate-700">I&apos;ve created my Twilio account</span>
            </label>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="text-amber-600" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Enter API Credentials</h2>
              <p className="text-slate-500">
                Find these in your Twilio Console dashboard.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-sm text-slate-600 mb-2">
                <strong>Where to find:</strong> Log into{' '}
                <a
                  href="https://console.twilio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                >
                  console.twilio.com <ExternalLink size={12} />
                </a>
                {' '}and look for Account SID and Auth Token on the main dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Account SID
                </label>
                <input
                  type="text"
                  value={accountSid}
                  onChange={(e) => {
                    setAccountSid(e.target.value);
                    setVerificationStatus('idle');
                  }}
                  placeholder="AC..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Auth Token
                </label>
                <input
                  type="password"
                  value={authToken}
                  onChange={(e) => {
                    setAuthToken(e.target.value);
                    setVerificationStatus('idle');
                  }}
                  placeholder="Your auth token"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                />
              </div>

              <button
                onClick={handleVerifyCredentials}
                disabled={verifying || !accountSid || !authToken}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Verifying...
                  </>
                ) : verificationStatus === 'success' ? (
                  <>
                    <CheckCircle2 size={18} className="text-green-400" />
                    Verified!
                  </>
                ) : (
                  'Verify Credentials'
                )}
              </button>

              {verificationStatus === 'error' && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{verificationError}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Settings className="text-indigo-600" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Create TwiML App</h2>
              <p className="text-slate-500">
                A TwiML App tells Twilio how to route your calls.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
              <p className="text-sm text-slate-600">
                <strong>Steps:</strong>
              </p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.twilio.com/us1/develop/voice/manage/twiml-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    TwiML Apps <ExternalLink size={12} />
                  </a>
                </li>
                <li>Click &quot;Create new TwiML App&quot;</li>
                <li>Name it &quot;Outbound Pilot Calling&quot;</li>
                <li>Set the Voice Request URL (copy below):</li>
              </ol>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={voiceUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                  <button
                    onClick={() => handleCopyUrl(voiceUrl)}
                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Voice Request URL (POST)</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={statusCallbackUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                  />
                  <button
                    onClick={() => handleCopyUrl(statusCallbackUrl)}
                    className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Status Callback URL (POST)</p>
              </div>

              <ol start={5} className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                <li>Save and copy the TwiML App SID</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                TwiML App SID
              </label>
              <input
                type="text"
                value={twimlAppSid}
                onChange={(e) => {
                  setTwimlAppSid(e.target.value);
                  setVerificationStatus('idle');
                }}
                placeholder="AP..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
              />
            </div>

            <button
              onClick={handleVerifyTwimlApp}
              disabled={verifying || !twimlAppSid}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : verificationStatus === 'success' ? (
                <>
                  <CheckCircle2 size={18} className="text-green-400" />
                  Verified!
                </>
              ) : (
                'Verify TwiML App'
              )}
            </button>

            {verificationStatus === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{verificationError}</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Phone className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Buy a Phone Number</h2>
              <p className="text-slate-500">
                Get a local phone number for your outbound calls.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-slate-600">
                <strong>Steps:</strong>
              </p>
              <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Go to{' '}
                  <a
                    href="https://console.twilio.com/us1/develop/phone-numbers/manage/search"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Buy a Number <ExternalLink size={12} />
                  </a>
                </li>
                <li>Search for a local number in your area</li>
                <li>Purchase the number (~$1/month)</li>
                <li>Copy the phone number below (include country code)</li>
              </ol>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Your Twilio Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setVerificationStatus('idle');
                }}
                placeholder="+15551234567"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                E.164 format: +[country code][number] (e.g., +15551234567)
              </p>
            </div>

            <button
              onClick={handleVerifyPhoneNumber}
              disabled={verifying || !phoneNumber}
              className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verifying...
                </>
              ) : verificationStatus === 'success' ? (
                <>
                  <CheckCircle2 size={18} className="text-green-400" />
                  Verified!
                </>
              ) : (
                'Verify Phone Number'
              )}
            </button>

            {verificationStatus === 'error' && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{verificationError}</p>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">All Set!</h2>
              <p className="text-slate-500">
                Your Twilio integration is ready. Click below to start making calls.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-green-800">Configuration Summary</h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li className="flex items-center gap-2">
                  <Check size={16} />
                  <span>Account SID: {accountSid.slice(0, 10)}...</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} />
                  <span>Auth Token: ********</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} />
                  <span>TwiML App: {twimlAppSid.slice(0, 10)}...</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={16} />
                  <span>Phone Number: {phoneNumber}</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleComplete}
              disabled={updateCredentials.isPending}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-lg"
            >
              {updateCredentials.isPending ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Phone size={20} />
                  Start Making Calls
                </>
              )}
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step === currentStep
                      ? 'bg-indigo-600'
                      : step < currentStep
                      ? 'bg-green-500'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-500">
              Step {currentStep} of 5
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {currentStep < 5 && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwilioSetupWizard;
