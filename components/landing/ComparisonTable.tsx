import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, Clock, Zap, Search, Mail, Phone, Share2, Users, Workflow } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  label: string;
  outboundPilot: string;
  enterpriseCRM: string;
  isPositive: boolean; // true = OutboundPilot wins
}

const features: Feature[] = [
  { icon: <Clock className="w-5 h-5" />, label: 'Setup time', outboundPilot: '10 minutes', enterpriseCRM: '2-4 weeks', isPositive: true },
  { icon: <Zap className="w-5 h-5" />, label: 'Learning curve', outboundPilot: 'Instant', enterpriseCRM: 'Requires training', isPositive: true },
  { icon: <Search className="w-5 h-5" />, label: 'Lead discovery', outboundPilot: 'Built-in', enterpriseCRM: 'Separate tool needed', isPositive: true },
  { icon: <Mail className="w-5 h-5" />, label: 'Email integration', outboundPilot: 'Gmail + Resend', enterpriseCRM: 'Available', isPositive: true },
  { icon: <Phone className="w-5 h-5" />, label: 'Phone integration', outboundPilot: 'Twilio WebRTC', enterpriseCRM: 'Separate tool needed', isPositive: true },
  { icon: <Share2 className="w-5 h-5" />, label: 'Social media', outboundPilot: 'Unified tracking', enterpriseCRM: 'Not included', isPositive: true },
  { icon: <Users className="w-5 h-5" />, label: 'In-person tracking', outboundPilot: 'Walk-ins supported', enterpriseCRM: 'Not included', isPositive: true },
  { icon: <Workflow className="w-5 h-5" />, label: 'Strategy automation', outboundPilot: 'Multi-step sequences', enterpriseCRM: 'Complex workflows', isPositive: true },
];

const AnimatedCounter: React.FC<{ value: number; suffix?: string; prefix?: string; duration?: number }> = ({
  value, suffix = '', prefix = '', duration = 2
}) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const incrementTime = (duration * 1000) / end;

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);

    return () => clearInterval(timer);
  }, [isInView, value, duration]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
};

const FeatureRow: React.FC<{ feature: Feature; index: number; isOutboundPilot: boolean }> = ({
  feature, index, isOutboundPilot
}) => {
  const value = isOutboundPilot ? feature.outboundPilot : feature.enterpriseCRM;
  const showCheck = isOutboundPilot && feature.isPositive;
  const showX = !isOutboundPilot && feature.isPositive && (feature.enterpriseCRM.includes('Not included') || feature.enterpriseCRM.includes('Separate'));

  return (
    <motion.div
      initial={{ opacity: 0, x: isOutboundPilot ? -20 : 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`flex items-center gap-3 py-3 ${
        isOutboundPilot
          ? 'text-slate-800'
          : 'text-slate-500'
      }`}
    >
      <div className={`p-2 rounded-lg ${
        isOutboundPilot
          ? 'bg-blue-100 text-blue-600'
          : 'bg-slate-100 text-slate-400'
      }`}>
        {feature.icon}
      </div>
      <div className="flex-1">
        <div className={`text-sm ${isOutboundPilot ? 'text-slate-500' : 'text-slate-400'}`}>
          {feature.label}
        </div>
        <div className={`font-semibold ${isOutboundPilot ? 'text-slate-900' : 'text-slate-600'}`}>
          {value}
        </div>
      </div>
      {showCheck && (
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08 + 0.2, type: 'spring', stiffness: 500 }}
          className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-green-600" />
        </motion.div>
      )}
      {showX && (
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08 + 0.2, type: 'spring', stiffness: 500 }}
          className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-red-500" />
        </motion.div>
      )}
    </motion.div>
  );
};

interface ComparisonTableProps {
  onSignIn?: () => void;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ onSignIn }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" ref={containerRef}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Why choose <span className="text-gradient-blue">OutboundPilot</span>?
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            All the power of enterprise tools, none of the complexity or cost.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* OutboundPilot Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -4 }}
            className="relative group"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-lg opacity-25 group-hover:opacity-40 transition duration-500" />

            <div className="relative bg-white rounded-3xl p-8 border border-blue-100 shadow-xl">
              {/* Header */}
              <div className="mb-8">
                <div className="text-sm font-medium text-blue-600 mb-1">RECOMMENDED</div>
                <h3 className="text-2xl font-bold text-slate-900">OutboundPilot</h3>
              </div>

              {/* Stats highlight */}
              <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    <AnimatedCounter value={10} suffix=" min" />
                  </div>
                  <div className="text-sm text-slate-600">Setup time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">Instant</div>
                  <div className="text-sm text-slate-600">Learning curve</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1">
                {features.map((feature, index) => (
                  <FeatureRow key={feature.label} feature={feature} index={index} isOutboundPilot={true} />
                ))}
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSignIn}
                className="w-full mt-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/50 transition-shadow"
              >
                Start For Free
              </motion.button>
              <p className="text-center text-sm text-slate-500 mt-3">No credit card required</p>
            </div>
          </motion.div>

          {/* Enterprise CRM Card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 h-full">
              {/* Header */}
              <div className="mb-8">
                <div className="text-sm font-medium text-slate-400 mb-1">TRADITIONAL</div>
                <h3 className="text-2xl font-bold text-slate-600">Enterprise CRM</h3>
              </div>

              {/* Stats highlight */}
              <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-slate-100 rounded-2xl">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-500">2-4 weeks</div>
                  <div className="text-sm text-slate-400">Setup time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-500">Training</div>
                  <div className="text-sm text-slate-400">Required</div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1">
                {features.map((feature, index) => (
                  <FeatureRow key={feature.label} feature={feature} index={index} isOutboundPilot={false} />
                ))}
              </div>

              {/* CTA placeholder */}
              <div className="w-full mt-8 bg-slate-200 text-slate-500 py-4 rounded-2xl font-bold text-lg text-center">
                Complex Setup Required
              </div>
              <p className="text-center text-sm text-slate-400 mt-3">Implementation fees extra</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
