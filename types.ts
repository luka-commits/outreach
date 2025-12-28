
export type LeadStatus = 'not_contacted' | 'in_progress' | 'replied' | 'qualified' | 'disqualified';

export type TaskAction = 'send_dm' | 'send_email' | 'call' | 'fb_message' | 'linkedin_dm' | 'manual' | 'walk_in';

export interface StrategyStep {
  dayOffset: number;
  action: TaskAction;
  template: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  steps: StrategyStep[];
}

export interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  address?: string;

  // Location Fields
  location?: string;
  zipCode?: string;
  country?: string;

  // Business Info
  niche?: string;
  category?: string;
  googleRating?: number;
  googleReviewCount?: number;

  // Enrichment Fields
  ownerTitle?: string;
  executiveSummary?: string;
  searchQuery?: string;

  // Strategy State
  strategyId?: string;
  currentStepIndex: number;
  nextTaskDate?: string; // ISO string
  nextTaskNote?: string;
  status: LeadStatus;

  createdAt: string;
}

export interface Activity {
  id: string;
  leadId: string;
  action: string;
  platform?: 'instagram' | 'facebook' | 'linkedin' | 'email' | 'call' | 'walkIn';
  timestamp: string;
  note?: string;
  isFirstOutreach?: boolean;
}

export interface OutreachGoals {
  instagram: number;
  facebook: number;
  linkedin: number;
  email: number;
  call: number;
  walkIn: number;
}

export type ScrapeJobStage = 'queued' | 'scraping' | 'enriching' | 'finalizing' | 'completed' | 'failed';

export interface ScrapeJob {
  id: string;
  niche: string;
  location: string;
  leadCount: number;
  expandedRadius: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  // Result tracking fields
  leadsFound?: number;
  leadsImported?: number;
  leadsSkipped?: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  // Progress tracking fields
  stage?: ScrapeJobStage;
  progress?: number;
  stageMessage?: string;
}
