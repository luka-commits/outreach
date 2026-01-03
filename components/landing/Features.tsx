import React from 'react';
import { motion } from 'framer-motion';

interface FeatureItemProps {
  headline: string;
  body: string;
  cta: string;
  imageSrc: string;
  reverse?: boolean;
  index: number;
  onSignIn?: () => void;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ headline, body, cta, imageSrc, reverse, onSignIn }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={`flex flex-col ${reverse ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-24 py-20`}
    >
      <motion.div
        initial={{ opacity: 0, x: reverse ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
        className="flex-1 w-full"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-2xl">
            <img src={imageSrc} alt={headline} loading="lazy" className="w-full object-cover" />
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: reverse ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        className="flex-1 space-y-6"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
          {headline}
        </h2>
        <p className="text-lg text-slate-600 leading-relaxed">
          {body}
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSignIn}
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-full text-base font-semibold hover:bg-slate-800 transition-all"
        >
          {cta}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

interface FeaturesProps {
  onSignIn?: () => void;
}

export const Features: React.FC<FeaturesProps> = ({ onSignIn }) => {
  const features = [
    {
      headline: "Execute across every channel, from one platform",
      body: "Make calls in-browser with Twilio WebRTC. Send emails directly through Gmail or Resend. Track LinkedIn, Instagram, and Facebook outreach. Log in-person meetings. Every conversation across every channel unified in one timeline.",
      cta: "See How It Works",
      imageSrc: "/gem1.png"
    },
    {
      headline: "Find your ideal prospects without leaving the platform",
      body: "Built-in lead finder based on niche, location, and criteria. Get company names, contact info, social profiles, then immediately start outreach. No need for separate lead gen tools.",
      cta: "Discover Leads",
      imageSrc: "/gem2.png",
      reverse: true
    },
    {
      headline: "Wake up knowing exactly what to do today",
      body: "Auto-generated daily priorities based on your strategies and timelines. No more wondering 'what's next?' Just open OutboundPilot and execute. One click from task to action.",
      cta: "See Your Daily Queue",
      imageSrc: "/gem3.png"
    },
    {
      headline: "Build your outreach sequence once, execute it automatically",
      body: "Create multi-step strategies: initial contact, 3-day follow-up, 7-day check-in. Assign to leads, and OutboundPilot handles all the scheduling. Never miss a touchpoint. Works across all channels.",
      cta: "Build Your Strategy",
      imageSrc: "/gem4.png",
      reverse: true
    },
    {
      headline: "Every conversation across every channel in one place",
      body: "Complete history per lead: emails, calls, DMs, in-person visits. All unified. Know exactly what you've discussed and what's next. No more switching between tools to piece together the story.",
      cta: "See the Timeline",
      imageSrc: "/gem5.png"
    }
  ];

  return (
    <section className="py-12">
      {features.map((feature, index) => (
        <div
          key={index}
          className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FeatureItem {...feature} index={index} onSignIn={onSignIn} />
          </div>
        </div>
      ))}
    </section>
  );
};
