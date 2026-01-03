import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, ExternalLink, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { radius, shadows } from '../../lib/designTokens';
import { useAuth } from '../../hooks/useAuth';
import { getUserApiKeys, updateUserApiKeys } from '../../services/supabase';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

const LeadFinderTab: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [apifyToken, setApifyToken] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showApifyToken, setShowApifyToken] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load existing API keys
  useEffect(() => {
    if (user?.id) {
      getUserApiKeys(user.id)
        .then((keys) => {
          setApifyToken(keys.apifyToken || '');
          setAnthropicKey(keys.anthropicKey || '');
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      await updateUserApiKeys(user.id, {
        apifyToken: apifyToken || null,
        anthropicKey: anthropicKey || null,
      });
      setSaved(true);
      showToast('API keys saved', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  const hasKeys = apifyToken && anthropicKey;

  return (
    <div className="space-y-6">
      <div className={`bg-white ${radius.md} p-6 ${shadows.sm} border border-slate-200`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <Key size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lead Finder API Keys</h2>
            <p className="text-slate-500 text-sm">Required for scraping leads from Google Maps</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Apify Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Apify API Token
            </label>
            <div className="relative">
              <input
                type={showApifyToken ? 'text' : 'password'}
                value={apifyToken}
                onChange={(e) => setApifyToken(e.target.value)}
                placeholder="apify_api_..."
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-md font-mono text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Anthropic API Key
            </label>
            <div className="relative">
              <input
                type={showAnthropicKey ? 'text' : 'password'}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-md font-mono text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 outline-none"
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
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            loading={saving}
            fullWidth
          >
            {saved ? (
              <>
                <Check size={18} />
                Saved!
              </>
            ) : (
              'Save API Keys'
            )}
          </Button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-medium text-amber-800 mb-2">
          Why do I need these?
        </h4>
        <p className="text-sm text-amber-700">
          The Lead Finder uses Apify to scrape Google Maps and Anthropic's Claude to extract
          contact information from websites. You pay for your own usage directly to these services.
        </p>
      </div>

      {/* Status indicator */}
      {hasKeys && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="text-emerald-600" size={20} />
          <p className="text-sm text-emerald-700 font-medium">
            Lead Finder is ready to use
          </p>
        </div>
      )}
    </div>
  );
};

export default LeadFinderTab;
