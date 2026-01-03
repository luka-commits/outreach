import React, { useState, useEffect } from 'react';
import { ContainerScroll } from './ui/container-scroll-animation';
import { FloatingIcons } from './ui/floating-icons';
import { ShimmerButton } from './ui/shimmer-button';

interface HeroProps {
  onSignIn: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSignIn }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      {!isMobile && <FloatingIcons />}
      <div className="relative z-10">
      <ContainerScroll
        titleComponent={
          <div className="flex flex-col items-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Your copilot for <span className="text-gradient-blue">outbound sales</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-500 mb-10 leading-relaxed">
              Find leads, execute multi-channel outreach, and never miss a follow-up. All in one simple platform built for solo salespeople.
            </p>

            <div className="flex justify-center mb-16">
              <ShimmerButton onClick={onSignIn} className="px-10 py-4 text-lg font-bold shadow-xl">
                Start For Free
              </ShimmerButton>
            </div>
          </div>
        }
      >
        <img
          src="/sc.png"
          alt="Outbound Pilot Dashboard"
          className="mx-auto rounded-2xl object-cover h-full object-left-top w-full"
          draggable={false}
        />
      </ContainerScroll>
      </div>
    </section>
  );
};
