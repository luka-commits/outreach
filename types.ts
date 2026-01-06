
export type LeadStatus = 'not_contacted' | 'in_progress' | 'replied' | 'qualified' | 'disqualified' | 'no_reply';

export type LostReason =
  | 'no_budget'
  | 'bad_timing'
  | 'went_with_competitor'
  | 'not_interested'
  | 'wrong_contact'
  | 'no_response_after_outreach'
  | 'other';

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  no_budget: 'No Budget',
  bad_timing: 'Bad Timing',
  went_with_competitor: 'Went with Competitor',
  not_interested: 'Not Interested',
  wrong_contact: 'Wrong Contact',
  no_response_after_outreach: 'No Response After Outreach',
  other: 'Other',
};

export type TaskAction = 'send_dm' | 'send_email' | 'call' | 'fb_message' | 'linkedin_dm' | 'manual' | 'walk_in';

export interface StrategyStep {
  dayOffset: number;
  action: TaskAction;
  template: string;
  script?: string; // Full call script/talking points for call tasks
}

export type StrategyColor = 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber' | 'violet' | 'pink' | 'sky';

export interface ReplyFollowUp {
  enabled: boolean;
  delayHours: number;
  template: string;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  steps: StrategyStep[];
  color: StrategyColor;
  // Reply sequence: multi-step follow-up triggered when lead replies
  // Uses same StrategyStep structure, first step (dayOffset: 0) is immediate
  replySequence?: StrategyStep[];
  noReplyDelayDays?: number;  // Days after strategy completion before marking as no_reply
  // Legacy reply follow-up (single task after reply)
  replyFollowUp?: ReplyFollowUp;
  position?: number;  // User-controlled ordering
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
  loomUrl?: string;
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
  completedStepIndexes?: number[]; // Completed step indexes for current day group
  nextTaskDate?: string; // ISO string
  nextTaskNote?: string;
  status: LeadStatus;

  // Lost Reason (only set when status = 'disqualified')
  lostReason?: LostReason;
  lostReasonNote?: string; // Custom note, primarily for 'other' reason

  // Activity Tracking
  lastActivityAt?: string; // ISO timestamp - denormalized from activities table

  // Reply Sequence State (parallel to main strategy, triggered by reply)
  replySequenceActive?: boolean;           // Is a reply sequence in progress?
  replySequenceChannel?: TaskAction;       // Channel from original reply (all tasks use this)
  replySequenceStepIndex?: number;         // Current step index in reply sequence
  replySequenceCompletedIndexes?: number[]; // Completed step indexes for current day group
  replySequenceNextDate?: string;          // Date when next reply sequence task should appear

  // No-Reply Tracking
  strategyCompletedAt?: string;          // ISO timestamp when strategy was completed

  // Reply Follow-Up Task (legacy single follow-up after reply)
  hasReplyFollowUp?: boolean;
  replyFollowUpAction?: TaskAction;
  replyFollowUpDate?: string;
  replyFollowUpTemplate?: string;

  // Tags (denormalized for display in list view)
  tags?: Array<{ id: string; name: string; color: string }>;

  createdAt: string;
}

export type ActivityDirection = 'outbound' | 'inbound';

export interface Activity {
  id: string;
  leadId: string;
  action: string;
  platform?: 'instagram' | 'facebook' | 'linkedin' | 'email' | 'call' | 'walkIn';
  timestamp: string;
  note?: string;
  isFirstOutreach?: boolean;
  direction?: ActivityDirection;
}

export interface OutreachGoals {
  instagram: number;
  facebook: number;
  linkedin: number;
  email: number;
  call: number;
  walkIn: number;
}

// Cold Calling Types
export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number';
export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'reconnecting';

export interface CallRecord {
  id: string;
  userId: string;
  leadId: string;
  twilioCallSid?: string;
  fromNumber: string;
  toNumber: string;
  outcome?: CallOutcome;
  status: CallStatus;
  durationSeconds?: number;
  recordingUrl?: string;
  recordingSaved: boolean;
  transcription?: string;
  aiSummary?: string;
  notes?: string;
  startedAt: string;
  endedAt?: string;
}

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  twimlAppSid: string;
  phoneNumber: string;
}

export interface CallMetrics {
  totalCalls: number;
  connected: number;
  voicemail: number;
  noAnswer: number;
  busy: number;
  wrongNumber: number;
  totalTalkTimeSeconds: number;
  connectRate: number;
}

// Strategy Performance Analytics
export interface StrategyPerformance {
  strategyId: string;
  strategyName: string;
  leadsAssigned: number;
  leadsContacted: number;
  leadsReplied: number;
  leadsQualified: number;
  responseRate: number;
  qualificationRate: number;
}

// Email Automation Types
export type EmailProvider = 'gmail' | 'resend' | null;

export interface GmailCredentials {
  // SECURITY: Tokens are stored server-side only and never exposed to client
  // These fields are optional for backwards compatibility during updates
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string; // ISO timestamp
  email: string;
}

export interface ResendCredentials {
  apiKey: string;
  fromAddress: string;
}

export interface EmailSettings {
  provider: EmailProvider;
  gmail?: GmailCredentials;
  resend?: ResendCredentials;
}

// Lead Tags Types
export interface LeadTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

// Lead Notes Types
export interface LeadNote {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Saved Filters / Smart Lists Types
export interface SavedFilter {
  id: string;
  name: string;
  icon: string;
  color: string;
  filters: Record<string, unknown>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// Duplicate Detection Types
export type DuplicateType = 'company_name' | 'email' | 'phone';

export interface DuplicateGroup {
  key: string;
  type: DuplicateType;
  leads: Lead[];
  count: number;
}

export interface MergeConfig {
  primaryLeadId: string;
  duplicateLeadIds: string[];
  deleteAfterMerge: boolean;
}

// Reporting Analytics Types
export interface ChannelPerformance {
  channel: string;
  leadsContacted: number;
  leadsReplied: number;
  replyRate: number;
}

export interface WeeklyTrend {
  weekStart: string;
  activitiesCount: number;
  repliesCount: number;
  qualifiedCount: number;
  responseRate: number;
}

export interface ReportingDashboard {
  staleLeadsCount: number;
  avgDaysOverdue: number;
  channelPerformance: ChannelPerformance[];
  weeklyTrends: WeeklyTrend[];
}

// ============================================
// Networking / Leaderboard Types
// ============================================

export interface UserPublicProfile {
  id: string;
  userId: string;
  isVisible: boolean;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  showActivityCount: boolean;
  showWeeklyActivity: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivityMetrics {
  id: string;
  userId: string;
  weeklyActivityCount: number;
  weeklyEmailsSent: number;
  weeklyCallsMade: number;
  weeklyDmsSent: number;
  monthlyActivityCount: number;
  totalActivityCount: number;
  lastCalculatedAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  activityCount: number;
  isCurrentUser: boolean;
}

export interface UserRankInfo {
  rank: number;
  activityCount: number;
  totalParticipants: number;
}

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'all_time';

// ============================================
// Custom Fields Types
// ============================================

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'single_select'
  | 'multi_select'
  | 'checkbox'
  | 'url';

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  isRequired: boolean;
  options: SelectOption[];
  defaultValue?: string;
  position: number;
  showInList: boolean;
  showInFilters: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  id: string;
  leadId: string;
  fieldId: string;
  valueText?: string;
  valueNumber?: number;
  valueDate?: string;
  valueBoolean?: boolean;
  valueArray?: string[];
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldFormValue = string | number | boolean | string[] | null;

export interface CustomFieldFilter {
  fieldId: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in';
  value: string;
}

// ============================================
// Pipeline Preferences Types
// ============================================

export interface PipelinePreferences {
  id: string;
  visibleColumns: string[];
  visibleCustomFields: string[];
  columnOrder?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BuiltInColumn {
  key: string;
  label: string;
  width: string;
  defaultVisible: boolean;
  required?: boolean;
}

// ============================================
// CSV Column Mapping Types
// ============================================

export type LeadField =
  | 'company_name'
  | 'contact_name'
  | 'email'
  | 'phone'
  | 'website_url'
  | 'instagram_url'
  | 'facebook_url'
  | 'linkedin_url'
  | 'twitter_url'
  | 'youtube_url'
  | 'tiktok_url'
  | 'address'
  | 'location'
  | 'zip_code'
  | 'country'
  | 'niche'
  | 'category'
  | 'google_rating'
  | 'google_review_count'
  | 'owner_title'
  | 'executive_summary'
  | 'search_query';

export const LEAD_FIELD_LABELS: Record<LeadField, string> = {
  company_name: 'Company Name',
  contact_name: 'Contact Name',
  email: 'Email',
  phone: 'Phone',
  website_url: 'Website',
  instagram_url: 'Instagram',
  facebook_url: 'Facebook',
  linkedin_url: 'LinkedIn',
  twitter_url: 'Twitter',
  youtube_url: 'YouTube',
  tiktok_url: 'TikTok',
  address: 'Address',
  location: 'City/Location',
  zip_code: 'ZIP Code',
  country: 'Country',
  niche: 'Niche/Industry',
  category: 'Category',
  google_rating: 'Google Rating',
  google_review_count: 'Review Count',
  owner_title: 'Owner Title',
  executive_summary: 'Executive Summary',
  search_query: 'Search Query',
};

// Target for column mapping - either a built-in field or a custom field
export type ColumnMappingTarget =
  | { type: 'builtin'; field: LeadField }
  | { type: 'custom'; fieldId: string; fieldType: CustomFieldType };

export interface ColumnMapping {
  csvColumn: string;
  csvIndex: number;
  target: ColumnMappingTarget | null;
  source: 'alias' | 'ai' | 'manual';
}

// ============================================
// URL Scraping Types
// ============================================

export interface ExtractedLeadData {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  websiteUrl: string;
  instagramUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  address?: string;
  location?: string;
  niche?: string;
}

export interface ScrapeUrlResponse {
  success: boolean;
  data?: ExtractedLeadData;
  error?: string;
  partialData?: boolean;
}
