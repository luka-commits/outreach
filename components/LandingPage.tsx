import React, { useState } from 'react';
import { Navbar } from './landing/Navbar';
import { Hero } from './landing/Hero';
import { MissionStatement } from './landing/MissionStatement';
import { Features } from './landing/Features';
import { ComparisonTable } from './landing/ComparisonTable';
import { CTASection } from './landing/ui/cta-with-glow';
import { Footer } from './landing/Footer';
import { InfiniteGridBackground } from './landing/ui/infinite-grid-background';
import { AuthModal } from './AuthModal';
import { PrivacyPolicy } from './landing/PrivacyPolicy';
import { TermsOfService } from './landing/TermsOfService';
import { Imprint } from './landing/Imprint';
import { LandingPricing } from './landing/LandingPricing';
import { FAQ } from './landing/FAQ';
import { CookieConsent } from './CookieConsent';

type LandingView = 'home' | 'privacy' | 'terms' | 'imprint' | 'pricing' | 'faq';

const LandingPage: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState<LandingView>('home');

  const handleSignIn = () => {
    setShowAuthModal(true);
  };

  if (currentView === 'privacy') {
    return (
      <>
        <PrivacyPolicy onBack={() => setCurrentView('home')} onSignIn={handleSignIn} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <CookieConsent />
      </>
    );
  }

  if (currentView === 'terms') {
    return (
      <>
        <TermsOfService onBack={() => setCurrentView('home')} onSignIn={handleSignIn} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <CookieConsent />
      </>
    );
  }

  if (currentView === 'imprint') {
    return (
      <>
        <Imprint onBack={() => setCurrentView('home')} onSignIn={handleSignIn} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <CookieConsent />
      </>
    );
  }

  if (currentView === 'pricing') {
    return (
      <>
        <LandingPricing onBack={() => setCurrentView('home')} onSignIn={handleSignIn} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <CookieConsent />
      </>
    );
  }

  if (currentView === 'faq') {
    return (
      <>
        <FAQ onBack={() => setCurrentView('home')} onSignIn={handleSignIn} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
        <CookieConsent />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <InfiniteGridBackground />
      <div className="relative z-10">
        <Navbar onSignIn={handleSignIn} onNavigate={setCurrentView} />
        <main>
          <Hero onSignIn={handleSignIn} />
          <MissionStatement />
          <Features onSignIn={handleSignIn} />
          <ComparisonTable onSignIn={handleSignIn} />
          <CTASection
            title="Ready to supercharge your outbound?"
            action={{ text: "Start For Free" }}
            onAction={handleSignIn}
            className="bg-slate-900 text-white"
          />
        </main>
        <Footer onNavigate={setCurrentView} />
      </div>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <CookieConsent />
    </div>
  );
};

export default LandingPage;
