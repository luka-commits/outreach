# CLAUDE.md - OutreachPilot

## What is OutreachPilot?

OutreachPilot is a sales outreach management SPA for tracking leads, scheduling follow-ups, and executing multi-step outreach strategies. It helps sales teams:

- Import and organize leads from CSV or manual entry
- Create reusable outreach strategies with timed follow-up sequences
- Track all outreach activities across channels (Instagram, Facebook, LinkedIn, email, calls, walk-ins)
- Schedule and process daily tasks based on strategy timelines
- Monitor outreach goals and progress with visual analytics
- Personalize messages using AI (Google Gemini)

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19.2.3 | UI framework |
| TypeScript 5.8 | Type safety |
| Vite 6.2 | Bundler & dev server |
| Supabase | PostgreSQL database, Auth, Edge Functions |
| @tanstack/react-query 5.x | Server state management |
| @tanstack/react-virtual 3.x | Virtual scrolling (available) |
| Google Gemini AI | Message personalization |
| Tailwind CSS | Styling |
| Lucide React | Icons |

---

## Quick Start

```bash
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Environment Setup

Create `.env.local` with:
```
VITE_GEMINI_API_KEY=your_gemini_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Project Structure

```
/src
├── services/                    # API layer
│   ├── supabase.ts              # All Supabase CRUD operations (~600 lines)
│   └── geminiService.ts         # AI message personalization
├── hooks/
│   ├── queries/                 # React Query hooks
│   │   ├── useLeadsPaginated.ts # Paginated lead list with filters
│   │   ├── useLeadsInfinite.ts  # Infinite scroll (50/page)
│   │   ├── useLeadsQuery.ts     # Legacy all-leads hook (avoid)
│   │   ├── useTasksQuery.ts     # Today's due tasks
│   │   ├── useActivitiesQuery.ts# Activity log
│   │   ├── useStrategiesQuery.ts# Outreach strategies
│   │   ├── useGoalsQuery.ts     # Daily outreach goals
│   │   └── useLeadCountQuery.ts # Lead count for limits
│   ├── useAuth.tsx              # Authentication context & provider
│   └── useSubscription.ts       # Subscription tier & limits
├── components/
│   ├── Dashboard.tsx            # Overview & analytics with goal rings
│   ├── LeadList.tsx             # Paginated pipeline view
│   ├── LeadDetail/              # Single lead view (folder)
│   │   ├── index.tsx            # Main component
│   │   ├── LeadHeader.tsx       # Editable lead info
│   │   ├── StrategyPanel.tsx    # Strategy selection & progress
│   │   ├── SchedulePanel.tsx    # Task scheduling
│   │   ├── ActivityComposer.tsx # Log new activities
│   │   └── ActivityFeed.tsx     # Activity history
│   ├── TaskQueue.tsx            # Daily task scheduler (list/calendar/processing)
│   ├── StrategyManager.tsx      # Strategy CRUD
│   ├── CSVUpload.tsx            # Bulk import with duplicate detection
│   ├── LeadFinder.tsx           # Lead discovery (scrape jobs)
│   ├── Reporting.tsx            # Analytics & metrics
│   ├── Toast.tsx                # ToastProvider context
│   ├── ConfirmModal.tsx         # Reusable confirmation dialog
│   └── ErrorBoundary.tsx        # React error boundary
├── lib/
│   └── queryClient.ts           # React Query config & query keys
├── utils/
│   └── styles.ts                # Status colors, platform colors
├── types.ts                     # Type definitions
├── App.tsx                      # Root orchestration
└── main.tsx                     # Entry point

/supabase
├── functions/
│   └── import-leads/            # Edge function for CSV processing
└── migrations/                  # SQL migrations
```

---

## Data Flow Architecture

```
Supabase (PostgreSQL)
    ↓
services/supabase.ts (CRUD operations, snake_case ↔ camelCase transforms)
    ↓
hooks/queries/* (React Query hooks with caching & optimistic updates)
    ↓
App.tsx (orchestrates state, provides context)
    ↓
Components (LeadList, LeadDetail, TaskQueue, Dashboard, etc.)
```

---

## Database Schema

### leads
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
company_name    text NOT NULL
contact_name    text
email           text
phone           text
website_url     text
instagram_url   text
facebook_url    text
linkedin_url    text
address         text
location        text
niche           text
google_rating   decimal
google_review_count integer
strategy_id     uuid REFERENCES strategies
current_step_index integer DEFAULT 0
next_task_date  date
status          text DEFAULT 'not_contacted'
created_at      timestamp DEFAULT now()
```

### activities
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
lead_id         uuid REFERENCES leads
action          text NOT NULL
platform        text
timestamp       timestamp DEFAULT now()
note            text
is_first_outreach boolean DEFAULT false
```

### strategies
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
name            text NOT NULL
description     text
steps           jsonb  -- Array of {dayOffset, action, template}
```

### outreach_goals
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
instagram       integer DEFAULT 0
facebook        integer DEFAULT 0
linkedin        integer DEFAULT 0
email           integer DEFAULT 0
call            integer DEFAULT 0
walk_in         integer DEFAULT 0
```

### profiles
```sql
id                    uuid PRIMARY KEY REFERENCES auth.users
email                 text
subscription_status   text DEFAULT 'free'
subscription_plan     text DEFAULT 'basic'
current_period_end    timestamp
stripe_customer_id    text
```

### scrape_jobs
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users
niche           text
location        text
lead_count      integer
expanded_radius boolean
status          text DEFAULT 'pending'
created_at      timestamp DEFAULT now()
```

---

## Multi-Tenancy

- **Every query filters by `user_id`** - 27+ locations in supabase.ts
- **Row Level Security (RLS)** enforces data isolation at database level
- **Subscription tiers** limit lead count (Free: 1,000 leads, Pro: unlimited)

---

## React Query Configuration

Located in `lib/queryClient.ts`:

```typescript
staleTime: 5 minutes     // Data considered fresh
gcTime: 30 minutes       // Cache retention
retry: 2                 // Query retry attempts
refetchOnWindowFocus: false
```

### Query Key Structure
```typescript
queryKeys.leads(userId)                    // ['leads', userId]
queryKeys.lead(userId, leadId)             // ['leads', userId, leadId]
queryKeys.activities(userId)               // ['activities', userId]
queryKeys.activitiesByLead(userId, leadId) // ['activities', userId, 'byLead', leadId]
queryKeys.strategies(userId)               // ['strategies', userId]
queryKeys.goals(userId)                    // ['goals', userId]
```

---

## Lead Status Flow

```
not_contacted → in_progress → replied → qualified
                                      ↘ disqualified
```

---

## Strategy System

Strategies define multi-step outreach sequences:

```typescript
interface Strategy {
  id: string;
  name: string;
  description: string;
  steps: StrategyStep[];
}

interface StrategyStep {
  dayOffset: number;  // Days after previous step (0, 3, 7, 14...)
  action: TaskAction; // 'send_dm' | 'send_email' | 'call' | 'walk_in' | etc.
  template: string;   // Message template
}
```

When a lead is assigned a strategy:
1. `currentStepIndex` starts at 0
2. `nextTaskDate` is calculated from step's `dayOffset`
3. Completing a step advances to next step
4. Templates can be personalized via Gemini AI

---

## Component Views

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| Dashboard | Overview & analytics | Goal progress rings, quick actions, activity chart |
| LeadList | Pipeline view | Pagination, status/strategy/channel filters, CSV export |
| LeadDetail | Single lead | Editable fields, strategy progress, activity composer |
| TaskQueue | Daily tasks | List/calendar/processing modes, message personalization |
| StrategyManager | Strategy CRUD | Create/edit multi-step sequences |
| CSVUpload | Bulk import | Duplicate detection, field mapping |
| LeadFinder | Lead discovery | Scrape job management |
| Reporting | Analytics | Metrics and trends |

---

## AI Integration

`services/geminiService.ts` uses Google Gemini to personalize outreach messages:

```typescript
generatePersonalizedMessage(companyName, contactName, baseTemplate)
// Returns personalized version of template
```

Used in TaskQueue's processing mode to customize messages before sending.

---

## Subscription Tiers

| Tier | Lead Limit |
|------|------------|
| Free | 1,000 leads |
| Pro | Unlimited |

Checked via `useSubscription()` hook which reads `profiles.subscription_status`.

---

## Performance Patterns

1. **Pagination** - LeadList uses server-side pagination (10/25/50/100 per page)
2. **Optimistic Updates** - UI updates immediately, rolls back on error
3. **Debounced Search** - `useDeferredValue` prevents API hammering
4. **Memoization** - Helper components use `React.memo()`
5. **Query Invalidation** - Mutations invalidate related queries

---

## Key API Functions (services/supabase.ts)

| Function | Purpose |
|----------|---------|
| `getLeadsPaginated()` | Paginated leads with filters |
| `getDueTasks()` | Leads with tasks due today |
| `createLead()` / `updateLead()` / `deleteLead()` | Lead CRUD |
| `createActivity()` | Log outreach activity |
| `getActivitiesPaginated()` | Paginated activities with date range |
| `getStrategies()` | User's strategies |
| `getLeadCountsByStatus()` | Dashboard status counts |
| `checkDuplicateCompanies()` | CSV import duplicate check |

---

## Authentication

Uses Supabase Auth with Google OAuth:

```typescript
// hooks/useAuth.tsx
const { user, signInWithGoogle, signOut, loading } = useAuth();
```

AuthGuard component in App.tsx protects routes.

---

## Error Handling

- **ErrorBoundary** - Catches React render errors
- **React Query** - Retries failed requests, exposes error state
- **Toast notifications** - User feedback for actions
- **Optimistic rollback** - Reverts UI on mutation failure
