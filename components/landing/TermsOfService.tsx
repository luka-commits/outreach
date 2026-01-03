import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ArrowLeft } from 'lucide-react';

interface TermsOfServiceProps {
  onBack: () => void;
  onSignIn: () => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({ onBack, onSignIn }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar onSignIn={onSignIn} />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to home
        </button>

        <h1 className="text-4xl font-bold text-slate-900 mb-8">Terms of Service</h1>
        <p className="text-slate-500 mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using OutboundPilot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
            <p className="text-slate-600 leading-relaxed">
              OutboundPilot is a sales outreach platform that helps users manage leads, execute multi-channel outreach campaigns, and track sales activities. The Service includes features for email sending, calling, and lead management.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. User Accounts</h2>
            <p className="text-slate-600 leading-relaxed mb-4">To use the Service, you must:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Create an account with accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly notify us of any unauthorized use of your account</li>
              <li>Be at least 18 years of age</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Acceptable Use</h2>
            <p className="text-slate-600 leading-relaxed mb-4">You agree not to use the Service to:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Send spam or unsolicited communications in violation of applicable laws</li>
              <li>Violate any applicable laws, including CAN-SPAM, GDPR, TCPA, or similar regulations</li>
              <li>Harass, abuse, or harm others</li>
              <li>Upload or transmit malicious code or content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Email and Communication Compliance</h2>
            <p className="text-slate-600 leading-relaxed">
              You are solely responsible for ensuring your outreach activities comply with all applicable laws and regulations, including but not limited to CAN-SPAM Act, GDPR, CCPA, and TCPA. You must have proper consent or legal basis for contacting individuals and must honor opt-out requests promptly.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Intellectual Property</h2>
            <p className="text-slate-600 leading-relaxed">
              The Service and its original content, features, and functionality are owned by OutboundPilot and are protected by international copyright, trademark, and other intellectual property laws. You retain ownership of any data you upload to the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              To the maximum extent permitted by law, OutboundPilot shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Disclaimer of Warranties</h2>
            <p className="text-slate-600 leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for any reason, including breach of these Terms. Upon termination, your right to use the Service will cease immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Changes to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:luka@flouence.com" className="text-blue-600 hover:text-blue-700 underline">
                luka@flouence.com
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};
