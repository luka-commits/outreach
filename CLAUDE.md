# CLAUDE.md - OutreachPilot

> **IMPORTANT**: Keep this file up-to-date! When making changes to the codebase, update the relevant sections immediately:
> - **New component** → Add to "Project Structure" and "Component Views" table
> - **New hook** → Add to "Project Structure" under `hooks/queries/`
> - **New API function** → Add to "Key API Functions" table
> - **New database table/migration** → Add to "Database Schema" and "Database Migrations" list
> - **New feature** → Add to "Recent Feature Updates" checklist
> - **Bug fix** → Add to "Recent Feature Updates" if significant

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
/ (root)
├── services/                    # API layer
│   ├── supabase.ts              # All Supabase CRUD operations (~750 lines)
│   └── geminiService.ts         # AI message personalization
├── hooks/
│   ├── queries/                 # React Query hooks
│   │   ├── index.ts             # Barrel exports for all query hooks
│   │   ├── useLeadsPaginated.ts # Paginated lead list with filters & sorting
│   │   ├── useLeadQuery.ts      # Single lead by ID
│   │   ├── useLeadsInfinite.ts  # Infinite scroll (50/page)
│   │   ├── useLeadsQuery.ts     # Legacy all-leads hook (avoid)
│   │   ├── useTasksQuery.ts     # Today's due tasks
│   │   ├── useActivitiesQuery.ts# Activity log with pagination
│   │   ├── useLeadActivitiesQuery.ts # Per-lead activity history
│   │   ├── useStrategiesQuery.ts# Outreach strategies
│   │   ├── useGoalsQuery.ts     # Daily outreach goals
│   │   ├── useLeadCountQuery.ts # Lead count for subscription limits
│   │   └── useScrapeJobsQuery.ts# Scrape job management & progress
│   ├── useAuth.tsx              # Authentication context & provider
│   └── useSubscription.ts       # Subscription tier & limits
├── components/
│   ├── layout/                  # Layout wrapper components
│   ├── Dashboard.tsx            # Overview & analytics with goal rings
│   ├── LeadList.tsx             # Pipeline view with Excel-style filters & multi-sort
│   ├── ColumnFilterDropdown.tsx # Excel-style column filter dropdowns
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
│   ├── LeadFinder.tsx           # Lead discovery with real-time progress
│   ├── ScrapeProgressTimeline.tsx # Scrape job progress visualization
│   ├── LeadAddForm.tsx          # Manual lead creation form
│   ├── Reporting.tsx            # Analytics & metrics
│   ├── SettingsView.tsx         # User settings & API keys
│   ├── ViewRouter.tsx           # View routing logic
│   ├── LandingPage.tsx          # Marketing/login page
│   ├── PricingPage.tsx          # Subscription pricing display
│   ├── Toast.tsx                # ToastProvider context
│   ├── ConfirmModal.tsx         # Reusable confirmation dialog
│   ├── LoadingSpinner.tsx       # Loading state component
│   └── ErrorBoundary.tsx        # React error boundary
├── lib/
│   └── queryClient.ts           # React Query config & query keys
├── utils/
│   └── styles.ts                # Status colors, platform colors
├── types.ts                     # Type definitions
├── App.tsx                      # Root orchestration
├── index.tsx                    # Entry point
└── main.tsx                     # Vite entry

/supabase
├── functions/
│   ├── start-scrape/            # Initiates lead scraping jobs
│   ├── scrape-callback/         # Webhook for scrape results
│   ├── cancel-job/              # Cancels in-progress scrape jobs
│   └── import-leads/            # Edge function for CSV processing
└── migrations/                  # SQL migrations (7 migration files)
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

### Terminal Statuses (Auto-Stop)

When a lead reaches a **terminal status**, the system automatically clears `next_task_date` to prevent further tasks from appearing in the TaskQueue. This is the "Auto-Stop" safety feature.

**Terminal statuses:** `replied`, `qualified`, `disqualified`

**Behavior:**
- `next_task_date` is set to `null` → Lead disappears from TaskQueue
- `strategyId` is **kept** → For reporting ("this lead came from Campaign X")
- `currentStepIndex` is **kept** → For progress tracking

**Implementation:** Located in `services/supabase.ts` in the `updateLead()` function.

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
| LeadList | Pipeline view | Excel-style filters, multi-column sorting, pagination, CSV export |
| LeadDetail | Single lead | Editable fields, strategy progress, activity composer |
| TaskQueue | Daily tasks | List/calendar/processing modes, message personalization |
| StrategyManager | Strategy CRUD | Create/edit multi-step sequences |
| CSVUpload | Bulk import | Duplicate detection, field mapping |
| LeadFinder | Lead discovery | Scrape job management with real-time progress |
| Reporting | Analytics | Metrics and trends |
| SettingsView | User settings | API key management, preferences |
| LandingPage | Marketing/Auth | Login page with Google OAuth |
| PricingPage | Subscriptions | Tier comparison, upgrade flow |

---

## Pipeline Features (LeadList)

The Pipeline view includes advanced filtering and sorting capabilities:

### Multi-Column Sorting
- Click column headers to sort (ascending → descending → remove)
- Hold to add secondary/tertiary sort columns
- Visual badges show sort priority (1, 2, 3...)

### Excel-Style Column Filters
- **Status**: Multi-select checkboxes (not_contacted, in_progress, replied, etc.)
- **Sequence**: Filter by assigned strategy or unassigned leads
- **Channels**: Filter by available contact methods (Instagram, Facebook, etc.)
- **Trust/Rating**: Range slider filter (0-5 stars)

### Filter State
```typescript
// Array-based filters for multi-select
status?: string[];           // Multiple statuses
strategyId?: string[];       // Multiple strategies ('none' for unassigned)
location?: string[];         // Multiple locations
niche?: string[];            // Multiple industries
channels?: ChannelFilter[];  // has_instagram, has_facebook, etc.
ratingMin?: number;          // Minimum rating
ratingMax?: number;          // Maximum rating

// Multi-column sorting
sortBy?: SortField[];        // Array of fields to sort by
sortDirection?: SortDirection[]; // Corresponding directions
```

---

## AI Integration

`services/geminiService.ts` uses Google Gemini to personalize outreach messages:

```typescript
generatePersonalizedMessage(companyName, contactName, baseTemplate)
// Returns personalized version of template
```

Used in TaskQueue's processing mode to customize messages before sending.

---

## Lead Finder (Scrape Jobs)

The Lead Finder feature allows users to discover new leads by scraping Google Maps data.

### Architecture
1. **Frontend** (`LeadFinder.tsx`) - Job creation UI, progress display
2. **Edge Functions**:
   - `start-scrape/` - Validates input, creates job record, triggers Modal
   - `scrape-callback/` - Receives results webhook, inserts leads
   - `cancel-job/` - Updates job status to cancelled
3. **External Service** - Modal.com runs the actual scraping
4. **Progress Tracking** - Real-time updates via `ScrapeProgressTimeline.tsx`

### Scrape Job States
```
pending → processing → completed
                    ↘ failed
        ↘ cancelled
```

### Database Fields (scrape_jobs)
```sql
id, user_id, niche, location, lead_count, expanded_radius,
status, created_at, progress_current, progress_total, error_message
```

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
| `getLeadsPaginated()` | Paginated leads with multi-filters & multi-sort |
| `getLeadById()` | Single lead by ID |
| `getDueTasks()` | Leads with tasks due today |
| `createLead()` / `updateLead()` / `deleteLead()` | Lead CRUD |
| `createActivity()` | Log outreach activity |
| `getActivitiesPaginated()` | Paginated activities with date range |
| `getActivitiesByLead()` | Activities for a specific lead |
| `getStrategies()` | User's strategies |
| `getLeadCountsByStatus()` | Dashboard status counts |
| `checkDuplicateCompanies()` | CSV import duplicate check |
| `getUniqueColumnValues()` | Distinct values for filter dropdowns |
| `getScrapeJobs()` | User's scrape job history |
| `getScrapeJobById()` | Single scrape job with progress |
| `createScrapeJob()` / `cancelScrapeJob()` | Scrape job management |

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

---

## Launch Status & Production Readiness

**Current Version**: 1.1.0
**Last Updated**: December 2024
**Last Security Audit**: December 2024
**Readiness Score**: 10/10 (production ready)

### Recent Feature Updates (Dec 2024)

- [x] Excel-style column filters with multi-select checkboxes
- [x] Multi-column sorting with priority badges
- [x] Lead Finder with real-time scrape progress tracking
- [x] Settings view with API key management
- [x] Auto-Stop: Terminal statuses (replied/qualified/disqualified) clear next_task_date
- [x] Fixed strategy selection sync issues
- [x] Fixed lead position jumping in Pipeline
- [x] Portal-based dropdowns to avoid z-index issues

### Completed Security Improvements (Dec 2024)

- [x] Created initial database schema migration with complete table definitions
- [x] Added Row Level Security (RLS) policies to all tables (leads, activities, strategies, outreach_goals, profiles)
- [x] Added database indexes for common query patterns (9 indexes for performance)
- [x] Manual JWT verification in Edge Functions (compatible with Lead Finder workflow)
- [x] Implemented CORS origin restrictions (configurable via ALLOWED_ORIGINS env var)
- [x] Added papaparse dependency for CSV parsing
- [x] Removed debug logging that exposed token previews
- [x] Updated Gemini AI to use stable model (gemini-1.5-flash)
- [x] Added input validation and sanitization to webhook callback
- [x] Fixed TypeScript type safety in React Query hooks
- [x] Added runtime environment variable validation
- [x] Added production build optimizations (source maps, chunk splitting)
- [x] Added meta tags for SEO and security headers

### Database Migrations

Run migrations in order:
1. `20231201_initial_schema.sql` - Core tables, RLS policies, indexes, triggers
2. `20240101_add_subscriptions.sql` - Subscription fields
3. `20251227_create_scrape_jobs.sql` - Scrape job tracking
4. `20251228_add_api_keys_to_profiles.sql` - API key storage
5. `20251229_fix_enhance_scrape_jobs.sql` - Scrape job enhancements
6. `20251230_add_enrichment_fields_to_leads.sql` - Lead enrichment
7. `20251231_add_scrape_job_progress.sql` - Progress tracking

### Edge Function Configuration

Set these environment variables in Supabase:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
SCRAPE_WEBHOOK_SECRET=your-secure-webhook-secret
MODAL_WEBHOOK_URL=your-modal-endpoint
```

### Security Architecture

- **Authentication**: Manual JWT verification via `supabase.auth.getUser()` in Edge Functions
- **Authorization**: Row Level Security (RLS) on all tables ensures data isolation
- **Input Validation**: All webhook inputs validated and sanitized before database insertion
- **CORS**: Configurable origin restrictions via environment variable

### Known Limitations

- CSV export limited to current page (by design for performance)
- No offline support (requires network connectivity)
- Single-user accounts only (no team/organization support)
- API keys stored in profiles table (use Supabase Vault for enterprise deployments)
- Tailwind CSS loaded via CDN (works but adds external dependency)

### Optional Future Enhancements

**For Enterprise Deployments:**
- Error monitoring service (Sentry/LogRocket)
- API rate limiting for external services
- Encrypted API key storage via Supabase Vault
- Session timeout / idle logout

**Feature Additions:**
- Team/organization support
- Webhook integrations (Zapier, Make.com)
- Lead deduplication/merge
- A/B testing for message templates
- Bundle Tailwind CSS locally

---

## Development Guidelines

### Critical Rules (NEVER Break These)

1. **User Isolation**: Every Supabase query MUST filter by `user_id`
   - Check: Does the query include `.eq('user_id', userId)` or equivalent?
   - RLS is backup, not primary defense - always filter explicitly
   - Applies to: SELECT, UPDATE, DELETE operations

2. **Authentication**: Never bypass AuthGuard or remove auth checks
   - All routes must be wrapped in AuthGuard (App.tsx)
   - Edge Functions must verify JWT via `supabase.auth.getUser()`
   - Never expose user data without authentication

3. **Input Validation**: Validate all external input
   - Edge Functions: Use `sanitizeString()`, `sanitizeUrl()`, etc.
   - Forms: Validate before mutation (email format, URL format, required fields)
   - CSVs: Check file type, row counts, field formats

4. **Error Handling**: Never swallow errors silently
   - Always show user feedback via `showToast()`
   - Log errors to console for debugging
   - Throw errors from services layer, catch in components

5. **Optimistic Updates**: Always implement rollback
   - Use `onMutate` → `onError` → `onSettled` pattern
   - Snapshot previous state before optimistic update
   - Rollback on error using snapshot

### Before Deploying Checklist

- [ ] Run `npm run build` - must complete without errors
- [ ] Run `npm run lint` - check for code quality issues
- [ ] Test authentication flow (sign in, sign out, refresh)
- [ ] Test core CRUD operations (create lead, update, delete)
- [ ] Verify RLS by checking Network tab - no cross-user data leaks
- [ ] Check browser console for errors
- [ ] Test on mobile viewport

### NPM Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Check for ESLint issues
npm run lint:fix     # Auto-fix ESLint issues
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
npm run format:check # Verify formatting
```

### Code Quality Standards

**TypeScript:**
- Strict mode is enabled - avoid `any` types
- Use proper typing or `unknown` for dynamic data
- Define interfaces for all data structures
- Use optional chaining (`?.`) for nullable access

**React Query:**
- Use query keys from `lib/queryClient.ts` (never raw strings)
- Invalidate related queries after mutations
- Use `enabled: !!userId` to prevent queries without auth

**Components:**
- Keep components focused - extract logic to hooks
- Use React.memo() for list items to prevent re-renders
- Handle loading and error states explicitly

### File Modification Safety

**High-Risk Files (Extra Caution Required):**

| File | Risk | Why |
|------|------|-----|
| `services/supabase.ts` | Critical | All data access - breaking this breaks everything |
| `hooks/useAuth.tsx` | Critical | Authentication - breaking this locks out users |
| `lib/queryClient.ts` | High | Query keys - wrong keys = stale data |
| `supabase/migrations/*` | Critical | Database schema - can cause data loss |
| `App.tsx` | High | Route guards, context providers |

**Safe to Modify:**
- Individual view components (Dashboard, LeadList, Reporting, etc.)
- Styling changes (Tailwind classes)
- Adding new components
- Adding new hooks (following existing patterns)

### Adding New Features

**1. New Database Table:**
```sql
-- Create migration in supabase/migrations/YYYYMMDD_description.sql
CREATE TABLE new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- other columns...
  created_at timestamptz DEFAULT now()
);

-- ALWAYS add RLS policies
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON new_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON new_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Add UPDATE/DELETE policies as needed
```

**2. New API Function:**
```typescript
// In services/supabase.ts
export async function getNewData(userId: string): Promise<NewData[]> {
  const { data, error } = await supabase
    .from('new_table')
    .select('*')
    .eq('user_id', userId);  // ALWAYS filter by user_id

  if (error) throw error;
  return data.map(transformFromDb);
}
```

**3. New React Query Hook:**
```typescript
// In hooks/queries/useNewDataQuery.ts
export function useNewData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.newData(user?.id),
    queryFn: () => getNewData(user!.id),
    enabled: !!user?.id,  // Prevent query without auth
  });
}
```

**4. New Component:**
- Add to `components/`
- Document in CLAUDE.md project structure
- Handle loading/error states
- Use existing patterns (see similar components)

### Prohibited Actions

- Do NOT disable RLS policies
- Do NOT remove `user_id` filters from queries
- Do NOT store secrets in client-side code
- Do NOT use `dangerouslySetInnerHTML` without sanitization
- Do NOT bypass AuthGuard for protected routes
- Do NOT delete migration files (they're history)
- Do NOT commit `.env.local` or any secrets

### Multi-Tenant Considerations

This app serves multiple users with thousands of leads each:

1. **Query Performance:**
   - All lead queries have `user_id` index
   - Use pagination (never load all leads at once)
   - Use `limit` and `offset` for large datasets

2. **Data Isolation:**
   - RLS policies prevent cross-user access at DB level
   - Frontend always filters by `user_id` as defense-in-depth
   - Never trust client-provided user IDs for other users

3. **Rate Limiting:**
   - Edge Functions have built-in Supabase rate limits
   - Consider adding custom limits for expensive operations

### Testing Changes Manually

Since no automated tests exist, manually verify:

1. **Auth Flow:**
   - Sign out → Sign in with Google
   - Refresh page → Still logged in
   - Check no console errors

2. **Data Isolation:**
   - Create test lead
   - Check Network tab → user_id in response matches your ID
   - No other users' data visible

3. **CRUD Operations:**
   - Create → Shows in list
   - Update → Changes persist after refresh
   - Delete → Removed from list and database

4. **Error Handling:**
   - Turn off network → See error toast
   - Invalid input → See validation message
