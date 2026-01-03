# ARCHITECTURE.md - Outbound Pilot

> **Last Updated**: 2026-01-03
> **Version**: 1.3.0

## How to Keep This File Current

| When you...                     | Update these sections                          |
|---------------------------------|------------------------------------------------|
| Add a component                 | Project Structure, Component Reference         |
| Add a hook                      | Project Structure (`hooks/queries/`)           |
| Add an API function             | API Functions table                            |
| Add/modify a database table     | Database Schema, add migration to list         |
| Add an Edge Function            | Project Structure (`supabase/functions/`)      |
| Complete a significant feature  | Recent Changes (with date)                     |

---

## Recent Changes

| Date       | Change                                                        |
|------------|---------------------------------------------------------------|
| 2026-01-04 | **Strategy Colors**: User-selectable colors for strategies. Removed redundant Zap icons in favor of colored indicators. Colors propagate consistently across TaskQueue, LeadList, LeadDetail, StrategyManager, and BulkStrategyModal. Added `color` field to strategies table, `strategyColors` in designTokens, `getStrategyColor()` helper. |
| 2026-01-04 | **CSV Column Mapping**: Added manual column mapping step to CSV import with AI-assisted detection. Users can now review/adjust auto-detected mappings before import. Added `CSVColumnMapper` component, `detectColumnMappings()` in geminiService, and `LeadField` type. |
| 2026-01-04 | **Custom Fields**: User-defined custom fields for leads with 7 field types (text, number, date, single/multi-select, checkbox, URL). Added `custom_field_definitions` and `custom_field_values` tables. Settings UI for field management, Lead Detail accordion with inline field creation/rename/delete. |
| 2026-01-03 | **Pro User Feature Gating**: Stripe webhook handler for subscription status. Free tier limits: 50 leads, 1 strategy, 100 scrapes/month. Pro-only: Reporting, CSV export. Added `stripe-webhook` edge function, `useScrapeUsageQuery`, `ProFeatureGate`, `ProBadge` components. Realtime subscription refresh. |
| 2026-01-03 | **Networking Tab**: Opt-in leaderboard with activity volume rankings, public profiles, weekly/monthly/all-time periods. Added `user_public_profiles` and `user_activity_metrics` tables with 3 new SQL RPCs. |
| 2026-01-01 | **Reporting Redesign**: Pipeline health funnel, strategy comparison, channel performance, weekly trends chart, task health section. Removed redundant "Today's Pulse" and duplicate strategy table. Added 4 new SQL RPCs for server-side analytics. |
| 2025-12-30 | **Security Hardening**: CORS strict mode, server-side OAuth tokens, Twilio webhook validation |
| 2025-12-30 | **Performance Optimization**: DB indexes, SQL stored procedures, query limits, N+1 fixes |
| 2025-12-30 | **Input Validation**: Email RFC 5322, MIME header sanitization, CSV size limits |
| 2025-12-30 | **Code Quality**: Removed `any` types, TypeScript strict compliance |
| 2024-12-29 | Sentry error monitoring, activity index optimization          |
| 2024-12-29 | Bulk actions: multi-select, delete, status change, strategy   |
| 2024-12-29 | Email automation: Gmail OAuth + Resend integration            |
| 2024-12-28 | Cold calling: Twilio WebRTC integration                       |
| 2024-12-27 | Lead Finder: scrape jobs with real-time progress              |
| 2024-12-26 | Excel-style filters, multi-column sorting                     |
| 2024-12-25 | Auto-Stop: terminal statuses clear next_task_date             |

---

## What is Outbound Pilot?

A sales outreach management SPA for tracking leads, scheduling follow-ups, and executing multi-step outreach strategies. Core capabilities:

- Import leads (CSV or manual) and organize by status/strategy
- Create reusable outreach sequences with timed follow-ups
- Track activities across channels (Instagram, Facebook, LinkedIn, email, calls, walk-ins)
- Schedule daily tasks based on strategy timelines
- Make cold calls directly from browser (Twilio WebRTC)
- Send emails from TaskQueue (Gmail OAuth or Resend)
- AI message personalization (Google Gemini)

---

## Tech Stack

| Technology              | Purpose                                    |
|-------------------------|--------------------------------------------|
| React 19 + TypeScript 5 | UI framework with type safety              |
| Vite 6                  | Bundler & dev server                       |
| Supabase                | PostgreSQL, Auth, Edge Functions           |
| @tanstack/react-query 5 | Server state, caching, optimistic updates  |
| Twilio Voice SDK        | Browser-based calling (WebRTC)             |
| Google Gemini AI        | Message personalization                    |
| Sentry                  | Production error monitoring                |
| Tailwind CSS            | Styling                                    |

---

## Project Structure

```
/
├── services/
│   ├── supabase.ts              # All database operations (~750 lines)
│   └── geminiService.ts         # AI: message personalization, CSV column detection
│
├── hooks/
│   ├── queries/                 # React Query hooks (barrel export in index.ts)
│   │   ├── useLeadsPaginated.ts # Paginated leads with filters & sorting
│   │   ├── useLeadQuery.ts      # Single lead by ID
│   │   ├── useLeadsInfinite.ts  # Infinite scroll variant
│   │   ├── useTasksQuery.ts     # Today's due tasks
│   │   ├── useActivitiesQuery.ts
│   │   ├── useLeadActivitiesQuery.ts
│   │   ├── useStrategiesQuery.ts
│   │   ├── useGoalsQuery.ts
│   │   ├── useLeadCountQuery.ts
│   │   ├── useScrapeJobsQuery.ts
│   │   ├── useCallRecordsQuery.ts
│   │   ├── useTwilioCredentialsQuery.ts
│   │   ├── useEmailSettingsQuery.ts
│   │   ├── useDuplicatesQuery.ts      # Server-side duplicate detection
│   │   ├── useStrategyPerformanceQuery.ts  # Server-side analytics
│   │   ├── useReportingQueries.ts     # Stale leads, channel stats, trends, overdue
│   │   ├── useNetworkingQuery.ts      # Public profiles, metrics, leaderboard
│   │   ├── useScrapeUsageQuery.ts     # Monthly scrape usage for free tier limits
│   │   └── useCustomFieldsQuery.ts    # Custom field definitions and values
│   ├── useAuth.tsx              # Auth context & provider
│   ├── useSubscription.ts       # Tier & limits, realtime refresh
│   └── useTwilioDevice.ts       # WebRTC device management
│
├── components/
│   ├── layout/                  # Layout wrappers
│   ├── LeadDetail/              # Single lead view (folder)
│   │   ├── index.tsx
│   │   ├── LeadDetailsPanel.tsx # Accordion sections for lead details
│   │   ├── CustomFieldsSection.tsx # Custom fields display/edit
│   │   ├── StrategyPanel.tsx
│   │   ├── SchedulePanel.tsx
│   │   ├── ActivityComposer.tsx
│   │   └── ActivityFeed.tsx
│   ├── settings/                # Settings page components (tabbed UI)
│   │   ├── SettingsTabs.tsx     # Tab navigation with status badges
│   │   ├── IntegrationCard.tsx  # Reusable integration status card
│   │   ├── SetupPromptBanner.tsx # First-time setup guidance
│   │   ├── AccountTab.tsx       # Profile, subscription, sign out
│   │   ├── CallingTab.tsx       # Twilio cold calling setup
│   │   ├── EmailTab.tsx         # Gmail/Resend email setup
│   │   ├── LeadFinderTab.tsx    # API keys for scraping
│   │   └── CustomFieldsTab.tsx  # Custom field management
│   ├── Dashboard.tsx            # Overview, goal rings, analytics
│   ├── LeadList.tsx             # Pipeline with filters & sorting
│   ├── ColumnFilterDropdown.tsx # Excel-style filter dropdowns
│   ├── TaskQueue.tsx            # Daily tasks (list/calendar/processing)
│   ├── StrategyManager.tsx      # Strategy CRUD
│   ├── CSVUpload.tsx            # Bulk import (multi-step: upload → mapping → confirm)
│   ├── CSVColumnMapper.tsx      # Column mapping UI with AI detection
│   ├── LeadFinder.tsx           # Lead discovery UI
│   ├── ScrapeProgressTimeline.tsx
│   ├── LeadAddForm.tsx          # Manual lead creation
│   ├── Reporting.tsx            # Analytics
│   ├── Networking.tsx           # Social leaderboard & public profiles
│   ├── networking/              # Networking tab components
│   │   ├── ProfileCard.tsx      # User's public profile editor
│   │   └── Leaderboard.tsx      # Activity rankings
│   ├── SettingsView.tsx         # User settings container (tabbed, uses settings/*)
│   ├── TwilioSetupWizard.tsx    # Guided Twilio setup (5 steps)
│   ├── CallProcessingPanel.tsx  # In-browser calling UI
│   ├── GmailOAuthButton.tsx     # Gmail connect button
│   ├── GmailOAuthCallback.tsx   # OAuth popup handler
│   ├── EmailSendPanel.tsx       # Email sending UI
│   ├── ViewRouter.tsx           # View routing
│   ├── LandingPage.tsx          # Marketing/login
│   ├── PricingPage.tsx          # Subscription tiers
│   ├── Toast.tsx                # Toast notifications
│   ├── ConfirmModal.tsx
│   ├── BulkStatusModal.tsx
│   ├── BulkStrategyModal.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
│
├── lib/
│   └── queryClient.ts           # React Query config & query keys
│
├── utils/
│   ├── styles.ts                # Status/platform color mappings
│   ├── errorMessages.ts         # User-friendly error mapping
│   ├── dateFormat.ts            # Date formatting utilities
│   └── leadScoring.ts           # Lead scoring algorithms
│
├── types.ts                     # Shared type definitions
├── App.tsx                      # Root: auth guard, context providers, routing
├── index.tsx
└── main.tsx

/supabase
├── functions/
│   ├── _shared/                 # Shared utilities for edge functions
│   │   ├── cors.ts              # CORS configuration (strict origin validation)
│   │   ├── encryption.ts        # AES-256-GCM encryption for credentials
│   │   └── validation.ts        # Email/phone validation, MIME sanitization
│   ├── start-scrape/            # Initiate scrape jobs
│   ├── scrape-callback/         # Webhook for scrape results
│   ├── cancel-job/              # Cancel in-progress scrapes
│   ├── import-leads/            # CSV processing
│   ├── verify-twilio/           # Validate Twilio credentials
│   ├── twilio-token/            # WebRTC access token
│   ├── twilio-voice/            # TwiML for outbound calls
│   ├── call-status/             # Call status webhook
│   ├── recording-ready/         # Recording webhook + transcription (validates Twilio signature)
│   ├── gmail-oauth-callback/    # Gmail token exchange (encrypts tokens)
│   ├── send-email/              # Email sending (Gmail + Resend, validates email format)
│   └── stripe-webhook/          # Stripe subscription updates (validates signature)
│
└── migrations/                  # Run in order:
    ├── 20231201_initial_schema.sql
    ├── 20240101_add_subscriptions.sql
    ├── 20251227_create_scrape_jobs.sql
    ├── 20251228_add_api_keys_to_profiles.sql
    ├── 20251229_fix_enhance_scrape_jobs.sql
    ├── 20251229_add_calling_support.sql
    ├── 20251229_add_activity_lead_index.sql
    ├── 20251229_add_loom_url_to_leads.sql
    ├── 20251229_add_next_task_note.sql
    ├── 20251230_add_enrichment_fields_to_leads.sql
    ├── 20251230_add_email_settings.sql
    ├── 20251230_add_activity_direction.sql
    ├── 20251230_add_lead_notes.sql
    ├── 20251230_add_lead_tags.sql
    ├── 20251231_add_scrape_job_progress.sql
    ├── 20251231_add_performance_indexes.sql        # Performance indexes for scale
    ├── 20251231_add_duplicate_detection_rpc.sql    # SQL functions for duplicate detection
    ├── 20251231_add_strategy_performance_rpc.sql   # SQL functions for strategy analytics
    ├── 20251231_add_last_activity_at.sql
    ├── 20251231_add_saved_filters.sql
    ├── 20251231_add_rating_index.sql
    ├── 20251231_add_task_date_index.sql
    ├── 20260101_add_reporting_rpcs.sql
    ├── 20260102_combined_reporting_rpc.sql
    ├── 20260103_fix_score_index.sql                # Fix orphaned index
    ├── 20260103_add_composite_indexes.sql          # Performance indexes for call_records & lead_notes
    ├── 20260103_add_networking_features.sql        # Public profiles, activity metrics, leaderboard RPCs
    └── 20260104_add_custom_fields.sql              # User-defined custom fields for leads
```

---

## Data Flow

```
Supabase (PostgreSQL + RLS)
         ↓
services/supabase.ts (CRUD, snake_case ↔ camelCase transforms)
         ↓
hooks/queries/* (React Query: caching, optimistic updates)
         ↓
App.tsx (context providers, auth guard)
         ↓
Components
```

---

## Database Schema

### Core Tables

**leads** — Sales prospects
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users, **required for RLS** |
| company_name | text | Required |
| contact_name, email, phone | text | Contact info |
| website_url, instagram_url, facebook_url, linkedin_url | text | Channels |
| address, location, niche | text | Categorization |
| google_rating, google_review_count | decimal, int | Trust signals |
| strategy_id | uuid | FK → strategies (nullable) |
| current_step_index | int | Progress in strategy (default 0) |
| next_task_date | date | When next task is due |
| status | text | `not_contacted` → `in_progress` → `replied` → `qualified`/`disqualified` |
| created_at | timestamp | |

**activities** — Outreach log
| Column | Type | Notes |
|--------|------|-------|
| id, user_id, lead_id | uuid | Standard |
| action | text | What was done |
| platform | text | Channel used |
| note | text | Details |
| is_first_outreach | bool | For analytics |
| timestamp | timestamp | |

**strategies** — Reusable outreach sequences
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | uuid | Standard |
| name, description | text | |
| steps | jsonb | Array of `{dayOffset, action, template}` |
| color | text | User-selected color (indigo, blue, emerald, rose, amber, violet, pink, sky). Default: indigo |

**outreach_goals** — Daily targets per channel
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | uuid | Standard |
| instagram, facebook, linkedin, email, call, walk_in | int | Daily targets (default 0) |

**call_records** — Call history
| Column | Type | Notes |
|--------|------|-------|
| id, user_id, lead_id | uuid | Standard |
| twilio_call_sid | text | Twilio reference |
| from_number, to_number | text | |
| outcome | text | `connected`, `voicemail`, `no_answer`, `busy`, `wrong_number` |
| status | text | `initiated` → `ringing` → `in-progress` → `completed`/`failed` |
| duration_seconds | int | |
| recording_url, transcription, ai_summary | text | |
| started_at, ended_at | timestamp | |

**scrape_jobs** — Lead finder jobs
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | uuid | Standard |
| niche, location | text | Search params |
| lead_count | int | Requested count |
| status | text | `pending` → `processing` → `completed`/`failed`/`cancelled` |
| progress_current, progress_total | int | Real-time progress |
| error_message | text | |

**profiles** — User settings (extends auth.users)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, FK → auth.users |
| subscription_status | text | `free` or `pro` |
| subscription_plan, stripe_customer_id | text | Billing |
| twilio_account_sid, twilio_auth_token, twilio_twiml_app_sid, twilio_phone_number | text | Calling |
| gmail_access_token, gmail_refresh_token, gmail_token_expires_at, gmail_email | text | Gmail OAuth |
| resend_api_key, resend_from_address | text | Resend |
| email_provider | text | `gmail`, `resend`, or null |

**user_public_profiles** — Opt-in public profile for networking
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | uuid | Standard |
| is_visible | bool | Must opt-in (default false) |
| display_name | text | Public display name |
| avatar_url | text | Profile picture URL |
| bio | text | Short bio (max 500 chars) |
| show_activity_count | bool | Show activity on leaderboard |

**user_activity_metrics** — Cached activity stats for leaderboard
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | uuid | Standard |
| weekly_activity_count | int | Rolling 7-day count |
| monthly_activity_count | int | Rolling 30-day count |
| total_activity_count | int | All-time count |
| last_calculated_at | timestamp | When metrics were refreshed |

**custom_field_definitions** — User-defined custom field schemas
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | uuid | Standard |
| name | text | Display name |
| field_key | text | URL-safe identifier |
| field_type | text | `text`, `number`, `date`, `single_select`, `multi_select`, `checkbox`, `url` |
| is_required | bool | Required validation |
| options | jsonb | For select types: `[{value, label, color?}]` |
| position | int | Order in forms |
| show_in_list | bool | Show as column in lead list |
| show_in_filters | bool | Allow filtering |

**custom_field_values** — Custom field values per lead
| Column | Type | Notes |
|--------|------|-------|
| id, user_id, lead_id, field_id | uuid | Standard |
| value_text | text | For text, url, single_select |
| value_number | decimal | For number |
| value_date | date | For date |
| value_boolean | bool | For checkbox |
| value_array | text[] | For multi_select |

### Key Relationships

```
auth.users
    ├── profiles (1:1)
    ├── leads (1:many) ──→ strategies (many:1)
    │       └── activities (1:many)
    │       └── call_records (1:many)
    ├── strategies (1:many)
    ├── outreach_goals (1:1)
    └── scrape_jobs (1:many)
```

### Row Level Security

All tables have RLS enabled. Every policy filters by `auth.uid() = user_id`.

---

## Key Business Logic

### Lead Status Flow

```
not_contacted → in_progress → replied → qualified
                                      ↘ disqualified
```

**Terminal statuses** (`replied`, `qualified`, `disqualified`):
- Automatically clear `next_task_date` (Auto-Stop feature)
- Lead disappears from TaskQueue
- Strategy and progress are preserved for reporting

### Strategy System

```typescript
interface StrategyStep {
  dayOffset: number;  // Days after previous step (0, 3, 7, 14...)
  action: TaskAction; // 'send_dm' | 'send_email' | 'call' | 'walk_in'
  template: string;   // Message template (can be AI-personalized)
}
```

When assigned:
1. `currentStepIndex` = 0
2. `nextTaskDate` calculated from first step's `dayOffset`
3. Completing step → advance index, recalculate date
4. Terminal status → stop processing

### Multi-Tenancy

- **Every query must filter by `user_id`** (27+ locations in supabase.ts)
- RLS is backup defense, not primary

### Subscription Tiers

| Limit | Free | Pro |
|-------|------|-----|
| Lead storage | 50 | Unlimited |
| Strategies | 1 | Unlimited |
| Scrapes/month | 100 | Unlimited |
| Reporting | No | Yes |
| CSV Export | No | Yes |

Managed via `useSubscription()` hook with realtime updates from Stripe webhooks.

---

## API Functions Reference

### Lead Operations
| Function | Purpose |
|----------|---------|
| `getLeadsPaginated()` | Paginated list with filters & multi-sort |
| `getLeadById()` | Single lead |
| `createLead()` / `updateLead()` / `deleteLead()` | CRUD |
| `deleteLeads()` | Bulk delete |
| `updateLeadsStatus()` | Bulk status change |
| `updateLeadsStrategy()` | Bulk strategy assignment |
| `checkDuplicateCompanies()` | CSV import deduplication |
| `getUniqueColumnValues()` | Filter dropdown options |

### Activity Operations
| Function | Purpose |
|----------|---------|
| `createActivity()` | Log outreach |
| `getActivitiesPaginated()` | With date range |
| `getActivitiesByLead()` | Per-lead history |

### Strategy & Goals
| Function | Purpose |
|----------|---------|
| `getStrategies()` | User's strategies |
| `getDueTasks()` | Leads with tasks due today |
| `getLeadCountsByStatus()` | Dashboard stats |

### Calling
| Function | Purpose |
|----------|---------|
| `getTwilioCredentials()` / `updateTwilioCredentials()` | Credential management |
| `hasTwilioConfigured()` | Setup check |
| `createCallRecord()` / `updateCallRecord()` | Call logging |
| `getCallsByLead()` | Call history |
| `getCallMetrics()` | Analytics |

### Email
| Function | Purpose |
|----------|---------|
| `getGmailCredentials()` / `updateGmailCredentials()` / `clearGmailCredentials()` | Gmail OAuth |
| `getResendCredentials()` / `updateResendCredentials()` / `clearResendCredentials()` | Resend API |
| `getEmailProvider()` / `setEmailProvider()` | Provider preference |
| `hasEmailConfigured()` | Setup check |

### Scrape Jobs
| Function | Purpose |
|----------|---------|
| `getScrapeJobs()` | Job history |
| `getScrapeJobById()` | With progress |
| `createScrapeJob()` / `cancelScrapeJob()` | Job management |

### Duplicate Detection (SQL RPCs)
| Function | Purpose |
|----------|---------|
| `find_duplicate_leads_by_company()` | Groups by normalized company name |
| `find_duplicate_leads_by_email()` | Groups by email (case-insensitive) |
| `find_duplicate_leads_by_phone()` | Groups by normalized phone digits |
| `get_duplicates_summary()` | Counts of each duplicate type |

### Strategy Analytics (SQL RPCs)
| Function | Purpose |
|----------|---------|
| `get_strategy_performance_stats()` | Lead counts and reply rates by strategy |
| `get_lead_counts_by_status()` | Status breakdown |
| `get_activity_counts_by_platform()` | Platform activity metrics |

### Reporting Analytics (SQL RPCs)
| Function | Purpose |
|----------|---------|
| `get_stale_leads_count(p_user_id, p_days)` | Count of in_progress leads with no activity in X days |
| `get_channel_performance_stats(p_user_id)` | Reply rates per channel (email, call, instagram, etc) |
| `get_weekly_trends(p_user_id, p_weeks)` | Weekly activity, reply, and qualification trends |
| `get_avg_days_overdue(p_user_id)` | Average days tasks are overdue |

### Networking/Leaderboard (SQL RPCs)
| Function | Purpose |
|----------|---------|
| `get_leaderboard(p_user_id, p_period, p_limit, p_offset)` | Paginated leaderboard of visible users by activity |
| `get_user_rank(p_user_id, p_period)` | Current user's rank and activity count |
| `refresh_user_activity_metrics(p_user_id)` | Recalculate cached activity counts |

### Networking/Leaderboard (Service Functions)
| Function | Purpose |
|----------|---------|
| `getUserPublicProfile(userId)` | Get user's public profile settings |
| `upsertUserPublicProfile(userId, updates)` | Create/update public profile |
| `getUserActivityMetrics(userId)` | Get cached activity metrics |
| `refreshUserActivityMetrics(userId)` | Trigger metrics recalculation |
| `getLeaderboard(userId, period, limit, offset)` | Fetch leaderboard data |
| `getUserRank(userId, period)` | Get current user's rank |

### Custom Fields
| Function | Purpose |
|----------|---------|
| `getCustomFieldDefinitions(userId)` | Get all custom field definitions |
| `createCustomFieldDefinition(userId, field)` | Create new field |
| `updateCustomFieldDefinition(userId, fieldId, updates)` | Update field config |
| `deleteCustomFieldDefinition(userId, fieldId)` | Delete field (cascades values) |
| `reorderCustomFieldDefinitions(userId, fieldIds)` | Update field order |
| `getCustomFieldValues(userId, leadId)` | Get values for a lead |
| `setCustomFieldValue(userId, leadId, fieldId, value)` | Set/update a value |
| `customFieldHasValues(userId, fieldId)` | Check if field has data |

---

## Performance Optimizations

### Database Indexes
Performance indexes added in `20251231_add_performance_indexes.sql`:
- `idx_activities_user_platform` — Dashboard platform stats
- `idx_activities_user_timestamp` — Date range queries
- `idx_activities_user_lead` — Lead activity lookups
- `idx_leads_user_status` — Status filtering
- `idx_leads_user_location` — Location filtering
- `idx_leads_user_niche` — Niche filtering
- `idx_leads_user_strategy` — Strategy filtering
- `idx_leads_user_created` — Sorting by created date

### Query Limits
All queries that previously could return unbounded results now have limits:
- `getActivities()` — Limited to 1,000 (deprecated, use paginated version)
- `getLeads()` — Limited to 5,000 (deprecated, use paginated version)
- `getStrategyPerformance()` — Limited to 10,000 leads, 100 strategies
- `mergeLeads()` — Uses batch operations instead of N+1 loops

### Server-Side Aggregation
Heavy aggregations moved to SQL stored procedures:
- Duplicate detection uses SQL `GROUP BY` instead of JavaScript
- Strategy performance uses SQL aggregation instead of client-side loops

---

## React Query Configuration

**Settings** (in `lib/queryClient.ts`):
- `staleTime`: 5 minutes
- `gcTime`: 30 minutes
- `retry`: 2
- `refetchOnWindowFocus`: false

**Query Keys** — always use these, never raw strings:
```typescript
queryKeys.leads(userId)
queryKeys.lead(userId, leadId)
queryKeys.activities(userId)
queryKeys.activitiesByLead(userId, leadId)
queryKeys.strategies(userId)
queryKeys.goals(userId)
queryKeys.callRecords(userId)
queryKeys.callRecordsByLead(userId, leadId)
queryKeys.twilioCredentials(userId)
queryKeys.gmailCredentials(userId)
queryKeys.resendCredentials(userId)
queryKeys.emailProvider(userId)
queryKeys.subscription(userId)
queryKeys.scrapeUsage(userId)
```

---

## Authentication

Supabase Auth with Google OAuth:

```typescript
const { user, signInWithGoogle, signOut, loading } = useAuth();
```

- `AuthGuard` in App.tsx protects all routes
- Edge Functions verify JWT via `supabase.auth.getUser()`

---

## Security

### CORS Protection
All edge functions require explicit `ALLOWED_ORIGINS` environment variable in production:
- Uses `_shared/cors.ts` for consistent handling
- Returns 403 if `ALLOWED_ORIGINS` not set (except localhost dev)
- Never uses wildcard (`*`) in production

### Credential Encryption
OAuth tokens and API keys are encrypted server-side:
- Uses AES-256-GCM encryption via `_shared/encryption.ts`
- Requires `ENCRYPTION_SECRET` env var (64 hex characters = 32 bytes)
- Gmail tokens stored encrypted in `profiles.gmail_access_token/refresh_token`
- Client never sees raw tokens—only success/failure status

### Webhook Validation
External webhooks are validated:
- Twilio webhooks verified with HMAC-SHA1 signature (`recording-ready`)
- Scrape callbacks verified with shared secret (`scrape-callback`)
- Stripe webhooks verified with HMAC-SHA256 signature (`stripe-webhook`)

### Input Validation
- Email addresses validated against RFC 5322 before sending
- MIME headers sanitized to prevent header injection attacks
- CSV uploads limited to 10MB, max 100 columns
- Phone numbers validated (7-15 digits)

---

## Environment Variables

**Frontend** (`.env.local`):
```
VITE_GEMINI_API_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SENTRY_DSN=
VITE_GMAIL_CLIENT_ID=
```

**Edge Functions** (Supabase dashboard):
```
ALLOWED_ORIGINS=https://yourdomain.com
ENCRYPTION_SECRET=<64-char-hex-string>
GMAIL_CLIENT_ID=
SCRAPE_WEBHOOK_SECRET=
MODAL_WEBHOOK_URL=
STRIPE_WEBHOOK_SECRET=<from-stripe-dashboard>
```

---

## Migration Template

When creating new tables, use this pattern to ensure nothing is missed:

```sql
-- Create migration in supabase/migrations/YYYYMMDD_description.sql
CREATE TABLE new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- columns...
  created_at timestamptz DEFAULT now()
);

-- REQUIRED: Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- REQUIRED: All 4 policies
CREATE POLICY "Users can view own data" ON new_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON new_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON new_table
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON new_table
  FOR DELETE USING (auth.uid() = user_id);

-- RECOMMENDED: Index on user_id for query performance
CREATE INDEX idx_new_table_user_id ON new_table(user_id);
```

**Checklist:**
- [ ] Table has `user_id` column with FK to auth.users
- [ ] RLS enabled
- [ ] SELECT policy
- [ ] INSERT policy
- [ ] UPDATE policy
- [ ] DELETE policy
- [ ] Index on user_id

---

## Quick Commands

```bash
npm run dev          # Dev server (localhost:5173)
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```
