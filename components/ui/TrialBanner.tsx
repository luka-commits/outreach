import { Clock, Zap } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription';
import { useNavigation } from '../../contexts/NavigationContext';

/**
 * Banner displayed at top of app for users on free trial.
 * Shows countdown and upgrade CTA. Becomes more urgent at ≤3 days.
 */
export function TrialBanner() {
  const { isTrial, trialDaysLeft, trialEndsAt } = useSubscription();
  const { navigate } = useNavigation();

  if (!isTrial) return null;

  const isUrgent = trialDaysLeft <= 3;
  const formattedDate = trialEndsAt?.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`px-4 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2 ${
        isUrgent
          ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
          : 'bg-blue-50 text-blue-800 border-b border-blue-200'
      }`}
    >
      <Clock size={16} className="flex-shrink-0" />
      <span>
        {trialDaysLeft === 0
          ? 'Your trial ends today!'
          : trialDaysLeft === 1
          ? '1 day left in your Pro trial'
          : `${trialDaysLeft} days left in your Pro trial`}
        {formattedDate && ` (ends ${formattedDate})`}
      </span>
      <button
        onClick={() => navigate('pricing')}
        className={`ml-2 px-3 py-1 rounded-md text-white text-xs font-bold flex items-center gap-1 transition-colors ${
          isUrgent
            ? 'bg-amber-600 hover:bg-amber-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <Zap size={12} />
        Upgrade Now
      </button>
    </div>
  );
}
