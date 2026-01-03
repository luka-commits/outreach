import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'outboundpilot_cookie_consent';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900 border-t border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-sm text-slate-300">
          <p>
            We use cookies to improve your experience and analyze site usage. By continuing to use
            this site, you agree to our use of cookies as described in our{' '}
            <a href="#" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={handleDecline}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
