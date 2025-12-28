import { LeadStatus, TaskAction } from '../types';

export const getLeadStatusStyle = (status: LeadStatus): string => {
  switch (status) {
    case 'not_contacted':
      return 'text-slate-500 bg-slate-100 border-slate-200';
    case 'in_progress':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'replied':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'qualified':
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'disqualified':
      return 'text-rose-600 bg-rose-50 border-rose-200';
    default:
      return 'text-slate-400 bg-slate-50 border-slate-100';
  }
};

export const getPlatformColor = (action?: TaskAction | string): string => {
  if (!action) return 'bg-slate-50 text-slate-300 border-slate-100';

  switch (action) {
    case 'send_dm':
      return 'bg-pink-50 text-pink-500 border-pink-100';
    case 'fb_message':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'linkedin_dm':
      return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'send_email':
      return 'bg-rose-50 text-rose-500 border-rose-100';
    case 'call':
      return 'bg-emerald-50 text-emerald-500 border-emerald-100';
    case 'walk_in':
      return 'bg-indigo-50 text-indigo-500 border-indigo-100';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-100';
  }
};

export const getHistoryColor = (platform?: string): string => {
  switch (platform) {
    case 'instagram':
      return 'bg-pink-50 text-pink-500';
    case 'facebook':
      return 'bg-blue-50 text-blue-700';
    case 'linkedin':
      return 'bg-blue-50 text-blue-600';
    case 'email':
      return 'bg-rose-50 text-rose-500';
    case 'call':
      return 'bg-emerald-50 text-emerald-500';
    case 'walkIn':
      return 'bg-indigo-50 text-indigo-500';
    default:
      return 'bg-indigo-50 text-indigo-600';
  }
};

export const getRatingColor = (rating?: number): string => {
  if (!rating) return 'text-slate-200';
  if (rating >= 4.5) return 'text-emerald-500';
  if (rating >= 3.5) return 'text-amber-500';
  return 'text-rose-500';
};
