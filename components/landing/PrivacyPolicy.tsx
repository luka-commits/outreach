import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { ArrowLeft } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack: () => void;
  onSignIn: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack, onSignIn }) => {
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

        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        <p className="text-slate-500 mb-8">Last updated: January 2, 2026</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              OutboundPilot ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our sales outreach platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Information We Collect</h2>
            <p className="text-slate-600 leading-relaxed mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Account information (name, email address, password)</li>
              <li>Lead and contact data you upload or enter</li>
              <li>Communication preferences and settings</li>
              <li>Integration credentials (Gmail, Twilio) stored securely and encrypted</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your transactions and send related information</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information. All sensitive credentials (such as email and calling integration tokens) are encrypted at rest. We use industry-standard encryption for data in transit.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              Our service integrates with third-party services including Google (Gmail) and Twilio. When you connect these services, their respective privacy policies also apply. We only access the minimum permissions necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Data Retention</h2>
            <p className="text-slate-600 leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide you services. You may request deletion of your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Your Rights</h2>
            <p className="text-slate-600 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Access, update, or delete your personal information</li>
              <li>Export your data in a portable format</li>
              <li>Opt out of marketing communications</li>
              <li>Request information about how your data is processed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy, please contact us:
            </p>
            <div className="text-slate-600 leading-relaxed">
              <p className="font-medium text-slate-900">Luka Knieling</p>
              <p>Wiesmahdstrasse 4b</p>
              <p>82131 Gauting</p>
              <p>Germany</p>
              <p className="mt-4">
                Email:{' '}
                <a href="mailto:luka@flouence.com" className="text-blue-600 hover:text-blue-700 underline">
                  luka@flouence.com
                </a>
              </p>
              <p>
                Phone:{' '}
                <a href="tel:+4917683300657" className="text-blue-600 hover:text-blue-700">
                  +49 176 8330 0657
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};
