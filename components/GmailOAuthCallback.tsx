import React, { useEffect } from 'react';

/**
 * This component handles the OAuth callback redirect from Google.
 * It extracts the authorization code from the URL and posts it back to the parent window.
 */
const GmailOAuthCallback: React.FC = () => {
  useEffect(() => {
    // Parse the URL parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const state = params.get('state');

    // Post message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'GMAIL_OAUTH_CALLBACK',
          code,
          error,
          state,
        },
        window.location.origin
      );

      // Also store in sessionStorage as backup
      if (code) {
        sessionStorage.setItem('gmail_auth_code', code);
      }

      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 100);
    } else {
      // If opened directly (not as popup), redirect to main app
      if (code) {
        sessionStorage.setItem('gmail_auth_code', code);
      }
      window.location.href = '/';
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default GmailOAuthCallback;
