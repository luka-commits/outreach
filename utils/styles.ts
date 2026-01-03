import { LeadStatus, TaskAction, StrategyColor } from '../types';
import { statusColors, channelColors, strategyColors } from '../lib/designTokens';

/**
 * Style utilities aligned with design tokens
 * - Status badges use brand palette
 * - All channels have distinct colors for visual clarity
 */

export const getLeadStatusStyle = (status: LeadStatus): string => {
  const colors = statusColors[status] || statusColors.not_contacted;
  return `${colors.text} ${colors.bg} ${colors.border}`;
};

export const getPlatformColor = (action?: TaskAction | string): string => {
  if (!action) return 'bg-gray-50 text-gray-400 border-gray-100';

  // Map actions to channel keys
  switch (action) {
    case 'send_dm':
      return `${channelColors.instagram.bg} ${channelColors.instagram.text} ${channelColors.instagram.border}`;
    case 'fb_message':
      return `${channelColors.facebook.bg} ${channelColors.facebook.text} ${channelColors.facebook.border}`;
    case 'linkedin_dm':
      return `${channelColors.linkedin.bg} ${channelColors.linkedin.text} ${channelColors.linkedin.border}`;
    case 'send_email':
      return `${channelColors.email.bg} ${channelColors.email.text} ${channelColors.email.border}`;
    case 'call':
      return `${channelColors.call.bg} ${channelColors.call.text} ${channelColors.call.border}`;
    case 'walk_in':
      return `${channelColors.walk_in.bg} ${channelColors.walk_in.text} ${channelColors.walk_in.border}`;
    default:
      return 'bg-gray-50 text-gray-500 border-gray-100';
  }
};

export const getHistoryColor = (platform?: string): string => {
  switch (platform) {
    case 'instagram':
      return `${channelColors.instagram.bg} ${channelColors.instagram.text}`;
    case 'facebook':
      return `${channelColors.facebook.bg} ${channelColors.facebook.text}`;
    case 'linkedin':
      return `${channelColors.linkedin.bg} ${channelColors.linkedin.text}`;
    case 'email':
      return `${channelColors.email.bg} ${channelColors.email.text}`;
    case 'call':
      return `${channelColors.call.bg} ${channelColors.call.text}`;
    case 'walkIn':
      return `${channelColors.walk_in.bg} ${channelColors.walk_in.text}`;
    default:
      return 'bg-gray-50 text-gray-500';
  }
};

export const getRatingColor = (rating?: number): string => {
  if (!rating) return 'text-gray-300';
  if (rating >= 4.5) return 'text-pilot-blue';
  if (rating >= 3.5) return 'text-amber-500';
  return 'text-rose-500';
};

/**
 * Get strategy color styles from the strategy's color field.
 * Returns the color object with bg, text, border, and solid variants.
 * Defaults to indigo if color is undefined or invalid.
 */
export const getStrategyColor = (color?: StrategyColor | string) => {
  if (!color || !(color in strategyColors)) {
    return strategyColors.indigo;
  }
  return strategyColors[color as StrategyColor];
};
