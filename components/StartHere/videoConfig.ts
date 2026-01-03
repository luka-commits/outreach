export interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  description: string;
  duration: string;
}

export interface VideoCategory {
  id: string;
  title: string;
  description: string;
  videos: VideoItem[];
}

export const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Quick overview to get you up and running',
    videos: [
      {
        id: 'welcome',
        youtubeId: 'PLACEHOLDER',
        title: 'Welcome to Outbound Pilot',
        description: 'A quick tour of the main features and how to get started',
        duration: '3:00',
      },
      {
        id: 'first-setup',
        youtubeId: 'PLACEHOLDER',
        title: 'First-Time Setup',
        description: 'Configure your account and connect your email',
        duration: '4:30',
      },
    ],
  },
  {
    id: 'managing-leads',
    title: 'Managing Leads',
    description: 'Learn how to import, organize, and manage your leads',
    videos: [
      {
        id: 'pipeline-overview',
        youtubeId: 'PLACEHOLDER',
        title: 'Pipeline Overview',
        description: 'Understanding your lead pipeline and status workflow',
        duration: '3:45',
      },
      {
        id: 'lead-finder',
        youtubeId: 'PLACEHOLDER',
        title: 'Using Lead Finder',
        description: 'Find and import leads from Google Maps and other sources',
        duration: '5:00',
      },
      {
        id: 'csv-import',
        youtubeId: 'PLACEHOLDER',
        title: 'Importing from CSV',
        description: 'Bulk import leads from spreadsheets',
        duration: '2:30',
      },
    ],
  },
  {
    id: 'outreach-workflow',
    title: 'Outreach Workflow',
    description: 'Master the daily outreach process',
    videos: [
      {
        id: 'task-queue',
        youtubeId: 'PLACEHOLDER',
        title: 'Daily Task Queue',
        description: 'Work through your daily outreach tasks efficiently',
        duration: '4:00',
      },
      {
        id: 'strategies',
        youtubeId: 'PLACEHOLDER',
        title: 'Creating Strategies',
        description: 'Build multi-step outreach sequences',
        duration: '6:00',
      },
      {
        id: 'calling',
        youtubeId: 'PLACEHOLDER',
        title: 'Making Calls',
        description: 'Use the built-in calling feature with Twilio',
        duration: '3:30',
      },
    ],
  },
  {
    id: 'tracking-results',
    title: 'Tracking Results',
    description: 'Monitor your outreach performance',
    videos: [
      {
        id: 'dashboard',
        youtubeId: 'PLACEHOLDER',
        title: 'Dashboard Overview',
        description: 'Track daily and weekly progress toward your goals',
        duration: '2:45',
      },
      {
        id: 'reporting',
        youtubeId: 'PLACEHOLDER',
        title: 'Reporting & Analytics',
        description: 'Analyze your outreach performance and trends',
        duration: '4:15',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Integrations',
    description: 'Configure your account and connect tools',
    videos: [
      {
        id: 'email-setup',
        youtubeId: 'PLACEHOLDER',
        title: 'Email Setup',
        description: 'Connect Gmail or Resend for sending emails',
        duration: '3:00',
      },
      {
        id: 'twilio-setup',
        youtubeId: 'PLACEHOLDER',
        title: 'Twilio Setup',
        description: 'Configure Twilio for phone calling',
        duration: '4:00',
      },
    ],
  },
];
