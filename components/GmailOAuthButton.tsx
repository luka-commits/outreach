import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Mail, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUpdateGmailCredentials } from '../hooks/queries/useEmailSettingsQuery';
import { supabase } from '../services/supabase';

// Gmail OAuth Configuration
const GMAIL_CLIENT_ID = import.meta.env.VITE_GMAIL_CLIENT_ID;
const GMAIL_REDIRECT_URI = import.meta.env.VITE_GMAIL_REDIRECT_URI || `${window.location.origin}/oauth/gmail/callback`;
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

// PKCE Helper Functions
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  buffer.forEach(byte => binary += String.fromCharCode(byte));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

interface GmailOAuthButtonProps {
  onSuccess?: (email: string) => void;
  onError?: (error: string) => void;
}

const GmailOAuthButton: React.FC<GmailOAuthButtonProps> = ({ onSuccess, onError }) => {
  const { user } = useAuth();
  const updateGmailCredentials = useUpdateGmailCredentials();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const exchangeCodeForTokens = useCallback(async (code: string, codeVerifier: string) => {
    try {
      // Try to get fresh session - first try refresh, then fall back to getSession
      let session = null;

      // First try refreshSession to get a completely fresh token
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

      if (!refreshError && refreshData.session) {
        session = refreshData.session;
      } else {
        // Fall back to getSession
        const { data: sessionData } = await supabase.auth.getSession();
        session = sessionData.session;
      }

      if (!session) {
        throw new Error('Session expired. Please sign in again.');
      }

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;

      if (expiresAt < now) {
        throw new Error('Session expired. Please sign in again.');
      }

      const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      const response = await fetch(`${supabaseUrl}/functions/v1/gmail-oauth-callback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          codeVerifier,
          redirectUri: GMAIL_REDIRECT_URI,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to exchange code for tokens');
      }

      // SECURITY: Tokens are stored server-side only
      // We only receive the email back from the edge function
      // Invalidate queries to refetch the updated profile
      await updateGmailCredentials.mutateAsync({
        email: result.email,
      });

      onSuccess?.(result.email);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete authentication';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  }, [updateGmailCredentials, onSuccess, onError]);

  const handleConnect = useCallback(async () => {
    if (!GMAIL_CLIENT_ID) {
      const errorMsg = 'Gmail OAuth not configured. Please set VITE_GMAIL_CLIENT_ID.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store verifier in sessionStorage for callback
      sessionStorage.setItem('gmail_code_verifier', codeVerifier);
      sessionStorage.setItem('gmail_oauth_state', crypto.randomUUID());

      // Build OAuth URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GMAIL_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GMAIL_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', GMAIL_SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent'); // Always prompt to get refresh token
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', sessionStorage.getItem('gmail_oauth_state')!);

      // Open popup window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl.toString(),
        'gmail-oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Poll for popup close and handle callback (stored in ref for cleanup)
      pollIntervalRef.current = setInterval(async () => {
        try {
          // Check if popup was closed
          if (popup.closed) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

            // Check if we got the auth code
            const authCode = sessionStorage.getItem('gmail_auth_code');
            const storedVerifier = sessionStorage.getItem('gmail_code_verifier');

            if (authCode && storedVerifier) {
              // Exchange code for tokens via Edge Function
              await exchangeCodeForTokens(authCode, storedVerifier);

              // Cleanup
              sessionStorage.removeItem('gmail_auth_code');
              sessionStorage.removeItem('gmail_code_verifier');
              sessionStorage.removeItem('gmail_oauth_state');
            } else {
              setIsConnecting(false);
              // User closed popup without completing auth
            }
          }
        } catch {
          // Cross-origin access to popup.location is expected to fail
        }
      }, 500);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start OAuth flow';
      setError(errorMsg);
      onError?.(errorMsg);
      setIsConnecting(false);
    }
  }, [onError, exchangeCodeForTokens]);

  // Listen for OAuth callback from popup
  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'GMAIL_OAUTH_CALLBACK') {
        const { code, error: oauthError, state } = event.data;

        // Verify state
        const storedState = sessionStorage.getItem('gmail_oauth_state');
        if (state !== storedState) {
          setError('Invalid OAuth state');
          setIsConnecting(false);
          return;
        }

        if (oauthError) {
          setError(oauthError);
          onError?.(oauthError);
          setIsConnecting(false);
          return;
        }

        if (code) {
          const codeVerifier = sessionStorage.getItem('gmail_code_verifier');
          if (codeVerifier) {
            await exchangeCodeForTokens(code, codeVerifier);
          }
        }

        // Cleanup
        sessionStorage.removeItem('gmail_auth_code');
        sessionStorage.removeItem('gmail_code_verifier');
        sessionStorage.removeItem('gmail_oauth_state');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError, exchangeCodeForTokens]);

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={isConnecting || !user}
        className="w-full py-3 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Mail size={18} />
            Connect Gmail
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500 text-center">
        Emails will be sent from your Gmail account and appear in your Sent folder.
      </p>
      <p className="text-xs text-amber-600 text-center">
        Note: Gmail integration requires approval. Contact{' '}
        <a href="mailto:luka@flouence.com" className="underline hover:text-amber-700">
          luka@flouence.com
        </a>{' '}
        to get access enabled for your account.
      </p>
    </div>
  );
};

export default GmailOAuthButton;
