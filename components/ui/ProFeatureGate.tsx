import { Lock, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { cardStyles } from '../../lib/designTokens';

interface ProFeatureGateProps {
  feature: string;
  description: string;
  icon?: React.ReactNode;
  onUpgrade: () => void;
  compact?: boolean;
}

/**
 * Full-screen or inline gate for Pro-only features.
 * Shows a lock overlay with upgrade CTA.
 */
export function ProFeatureGate({
  feature,
  description,
  icon,
  onUpgrade,
  compact = false,
}: ProFeatureGateProps) {
  if (compact) {
    return (
      <div className={`${cardStyles.base} p-6 text-center`}>
        <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-4">
          <Lock size={24} className="text-amber-600" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{feature}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        <Button variant="primary" size="sm" onClick={onUpgrade}>
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className={`${cardStyles.base} max-w-md w-full p-8 text-center`}>
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-6">
          {icon || <Lock size={32} className="text-amber-600" />}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full mb-4">
          <Sparkles size={12} />
          Pro Feature
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">{feature}</h2>
        <p className="text-gray-500 mb-6">{description}</p>

        <Button variant="primary" size="lg" onClick={onUpgrade} icon={<ArrowRight size={18} />} iconPosition="right">
          Upgrade to Pro
        </Button>

        <p className="text-xs text-gray-400 mt-4">
          Unlock {feature.toLowerCase()} and all premium features
        </p>
      </div>
    </div>
  );
}
