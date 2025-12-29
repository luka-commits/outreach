import React, { useState } from 'react';
import { Mail, Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import { Lead } from '../types';
import { getSession } from '../services/supabase';
import { useHasEmailConfigured } from '../hooks/queries/useEmailSettingsQuery';

interface EmailSendPanelProps {
  lead: Lead;
  message: string;
  subject: string;
  onSend: () => void;
  onComplete: () => void;
}

const EmailSendPanel: React.FC<EmailSendPanelProps> = ({
  lead,
  message,
  subject,
  onSend,
  onComplete,
}) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { isConfigured, isLoading: configLoading, provider, gmailConfigured, resendConfigured } = useHasEmailConfigured();

  const handleSendEmail = async () => {
    if (!lead.email) return;

    setSending(true);
    setError(null);

    try {
      const session = await getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          subject,
          bodyHtml: message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      setSent(true);
      onSend();

      // Auto-complete after a short delay
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const getMailtoLink = () => {
    if (!lead.email) return '#';
    return `mailto:${lead.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message.replace(/<[^>]*>/g, ''))}`;
  };

  // Loading state
  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  // No email on lead
  if (!lead.email) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle size={18} />
            <span className="font-bold">No email address</span>
          </div>
          <p className="text-sm text-amber-700 mt-1">
            This lead doesn't have an email address. Add one to send emails.
          </p>
        </div>
      </div>
    );
  }

  // Email not configured
  if (!isConfigured) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <Mail size={18} />
            <span className="font-bold">Email not set up</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Connect Gmail or Resend in Settings to send emails directly.
          </p>
        </div>

        {/* Fallback: mailto link */}
        <a
          href={getMailtoLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700
                     transition-colors flex items-center justify-center gap-2"
        >
          <ExternalLink size={18} />
          Open in Email App
        </a>

        <button
          onClick={handleCopyToClipboard}
          className="w-full py-3 text-slate-500 text-sm hover:bg-slate-100 rounded-xl transition-colors
                     flex items-center justify-center gap-2"
        >
          {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy message to clipboard'}
        </button>
      </div>
    );
  }

  // Success state
  if (sent) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="text-green-600 mx-auto mb-3" size={48} />
          <p className="font-bold text-green-800 text-lg">Email Sent!</p>
          <p className="text-sm text-green-700 mt-1">
            Sent to {lead.email}
            {provider === 'gmail' && ' (check your Gmail Sent folder)'}
          </p>
        </div>
      </div>
    );
  }

  // Main send UI
  return (
    <div className="space-y-4">
      {/* Email preview */}
      <div className="bg-slate-50 rounded-2xl p-4 text-sm">
        <div className="flex justify-between text-slate-600 mb-2">
          <span className="font-medium">To:</span>
          <span className="font-mono text-slate-800">{lead.email}</span>
        </div>
        <div className="flex justify-between text-slate-600 mb-2">
          <span className="font-medium">Subject:</span>
          <span className="text-slate-800 truncate max-w-[200px]">{subject}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span className="font-medium">Via:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
            provider === 'gmail'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            {provider === 'gmail' ? 'Gmail' : 'Resend'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSendEmail}
        disabled={sending || !lead.email}
        className="w-full py-5 rounded-[1.5rem] bg-purple-600 text-white font-bold text-lg
                   hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-200"
      >
        {sending ? (
          <>
            <Loader2 size={22} className="animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail size={22} />
            Send Email
          </>
        )}
      </button>

      {/* Fallback options */}
      <div className="flex gap-2">
        <a
          href={getMailtoLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 text-slate-500 text-sm hover:bg-slate-100 rounded-xl transition-colors
                     flex items-center justify-center gap-2"
        >
          <ExternalLink size={14} />
          Open in app
        </a>
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 py-3 text-slate-500 text-sm hover:bg-slate-100 rounded-xl transition-colors
                     flex items-center justify-center gap-2"
        >
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
};

export default EmailSendPanel;
