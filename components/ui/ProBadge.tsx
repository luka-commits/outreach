import { Sparkles } from 'lucide-react';

interface ProBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Small "PRO" badge to indicate premium features.
 * Use next to nav items, buttons, or feature labels.
 */
export function ProBadge({ size = 'sm', className = '' }: ProBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-0.5 gap-1',
  };

  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 ${sizeClasses[size]} ${className}`}
    >
      <Sparkles size={iconSize} />
      PRO
    </span>
  );
}
