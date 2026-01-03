import React from 'react';
import WelcomeHeader from './WelcomeHeader';
import QuickStartChecklist from './QuickStartChecklist';
import VideoSection from './VideoSection';
import ProTips from './ProTips';
import HelpResources from './HelpResources';

const StartHere: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <WelcomeHeader />
      <QuickStartChecklist />
      <VideoSection />
      <ProTips />
      <HelpResources />
    </div>
  );
};

export default StartHere;
