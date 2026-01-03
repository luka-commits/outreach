import React from 'react';
import { motion } from 'framer-motion';

export const MissionStatement: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-slate-50 to-white py-24 sm:py-32 border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-2xl sm:text-3xl md:text-4xl font-medium text-slate-700 leading-relaxed"
        >
          "We believe professional outbound sales should be simple:{' '}
          <span className="text-gradient-blue font-semibold">one platform</span>,{' '}
          <span className="text-gradient-blue font-semibold">every channel</span>,{' '}
          <span className="text-gradient-blue font-semibold">zero chaos</span>."
        </motion.p>
      </div>
    </section>
  );
};
