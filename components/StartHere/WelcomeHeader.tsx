import React from 'react';
import { Rocket } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const WelcomeHeader: React.FC = () => {
  const { profile } = useAuth();

  // Extract first name from email or use 'there' as fallback
  const firstName = profile?.email?.split('@')[0]?.split('.')[0] || 'there';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return (
    <header className="flex items-center gap-6">
      <div className="w-16 h-16 bg-pilot-blue/10 rounded-2xl flex items-center justify-center">
        <Rocket size={32} className="text-pilot-blue" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy">
          Welcome, {capitalizedName}!
        </h1>
        <p className="text-gray-500 mt-1">
          Your command center for outbound sales. Let's get you set up.
        </p>
      </div>
    </header>
  );
};

export default WelcomeHeader;
