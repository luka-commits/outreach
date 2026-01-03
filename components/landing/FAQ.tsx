import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Mail, Phone, MessageCircle } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface FAQProps {
  onBack: () => void;
  onSignIn: () => void;
}

const faqs = [
  {
    question: 'What is OutboundPilot?',
    answer:
      'OutboundPilot is a sales outreach platform designed for agencies, freelancers, and sales teams. It helps you manage leads, run multi-step outreach sequences, and execute campaigns across multiple channels including email, calls, and direct messages.',
  },
  {
    question: 'How does the free plan work?',
    answer:
      'The free Starter plan lets you manage up to 50 leads with access to the basic dashboard and manual tracking. It\'s perfect for testing the platform before upgrading to Pro.',
  },
  {
    question: 'What\'s included in the Pro plan?',
    answer:
      'Pro Pilot ($29/month) includes unlimited leads, advanced analytics, multiple outreach strategies, Gmail integration for sending emails, Twilio integration for calls, and priority support.',
  },
  {
    question: 'Can I connect my Gmail account?',
    answer:
      'Yes! OutboundPilot integrates with Gmail so you can send emails directly from your account. Emails appear in your Sent folder just like regular emails. Note: Gmail integration requires approval - contact us to get access enabled.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use industry-standard encryption for data in transit and at rest. All sensitive credentials like email tokens are encrypted. Each user\'s data is isolated and protected by row-level security policies.',
  },
  {
    question: 'Can I import my existing leads?',
    answer:
      'Yes! You can easily import leads via CSV upload. The import wizard helps you map your columns to the right fields and handles duplicates intelligently.',
  },
  {
    question: 'How do outreach sequences work?',
    answer:
      'You create strategies that define your outreach steps (e.g., email → wait 3 days → follow-up call → wait 2 days → LinkedIn message). OutboundPilot tracks where each lead is in the sequence and prompts you with daily tasks.',
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer:
      'Yes, you can cancel your Pro subscription at any time. Your account will remain active until the end of your billing period, then revert to the free Starter plan.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'We offer a full refund within 7 days of your first Pro payment if you\'re not satisfied. Just contact us at luka@flouence.com.',
  },
  {
    question: 'How do I get support?',
    answer:
      'You can reach us anytime at luka@flouence.com or call +49 176 8330 0657. Pro users get priority support with faster response times.',
  },
];

export const FAQ: React.FC<FAQProps> = ({ onBack, onSignIn }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar onSignIn={onSignIn} onNavigate={handleNavigate} />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              Got Questions?
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Everything you need to know about OutboundPilot. Can't find what you're looking for? Reach out to our team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <main className="flex-1 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group"
              >
                <div
                  className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                    openIndex === index
                      ? 'border-blue-200 bg-blue-50/50 shadow-lg shadow-blue-100/50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4"
                  >
                    <span className={`font-semibold text-lg ${openIndex === index ? 'text-blue-900' : 'text-slate-900'}`}>
                      {faq.question}
                    </span>
                    <motion.div
                      animate={{ rotate: openIndex === index ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`flex-shrink-0 p-1 rounded-full ${
                        openIndex === index ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <ChevronDown size={20} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 text-slate-600 leading-relaxed text-base">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Contact Section */}
      <section className="py-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
        <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <MessageCircle className="w-12 h-12 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Still have questions?
            </h2>
            <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
              Can't find the answer you're looking for? Our team is here to help.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.a
                href="mailto:luka@flouence.com"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 font-semibold rounded-full hover:bg-slate-100 transition-colors shadow-lg"
              >
                <Mail size={20} />
                Email Us
              </motion.a>
              <motion.a
                href="tel:+4917683300657"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors border border-white/20"
              >
                <Phone size={20} />
                +49 176 8330 0657
              </motion.a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
};
