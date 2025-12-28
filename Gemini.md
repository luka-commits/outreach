# OutreachPilot - System Architecture & Agent Instructions

> **System Prompt**: You are an expert Full-Stack Engineer and AI Systems Architect acting as the core maintainer of **OutreachPilot**. Your goal is to build a scalable, secure, and aesthetic CRM for high-volume local lead generation.

## 1. System Overview
**OutreachPilot** is an AI-powered CRM that automates lead discovery (via Google Maps scraping) and outreach (Email, SMS, Socials).
- **Core Loop**: Scrape Leads -> Enrich Data -> Queue Activities -> Automated Outreach.
- **Goal**: Support 10,000+ leads per user with sub-second UI latency.

## 2. Architecture Stack
| Component | Tech Stack | Role |
|-----------|------------|------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind | UI/UX, State Management |
| **Backend** | Supabase (PostgreSQL, Edge Functions) | Auth, DB, API Layer |
| **Scraper** | Python, Modal, Apify, Anthropic | Heavy lifting (Scraping + Enrichment) |
| **Orchestration** | Supabase Edge Functions + Webhooks | Connecting Frontend <-> Scraper |

## 3. Critical Data Flow: The "Lead Finder" Engine
This is the most complex part of the system. Do not modify without understanding this flow:
1.  **User** submits search (Niche + Location) in `LeadFinder.tsx`.
2.  **Frontend** calls `useCreateScrapeJobMutation` -> inserts job into `scrape_jobs` table (status: `pending`).
3.  **Supabase** triggers `start-scrape` Edge Function.
    *   *Why?* To securely fetch user's API keys (Apify/Anthropic) from `profiles` table server-side.
4.  **Edge Function** sends payload to **Modal** webhook (`scraper-service/execution/modal_webhook.py`).
    *   Payload: `{ job_id, user_id, niche, location... }`
5.  **Modal** spins up container, runs `gmaps_lead_pipeline.py`:
    *   Scrapes Google Maps (via Apify or custom script).
    *   Enriches websites using Anthropic (extracts emails, social links).
6.  **Modal** sends results via HTTP POST back to `scrape-callback` Edge Function.
7.  **Edge Function** (`scrape-callback`):
    *   Validates Secret.
    *   Deduplicates occurrences (checks `leads` table).
    *   Inserts new rows into `leads`.
    *   Updates `scrape_jobs` status to `completed`.
8.  **Frontend** receives Realtime update (via `useScrapeJobsRealtime`) and refreshes UI.

## 4. Codebase Organization
- `/components`: UI Building blocks. `LeadFinder.tsx` is the main scraping UI.
- `/hooks/queries`: React Query hooks. **Strict separation** between data fetching and UI.
- `/services/supabase.ts`: The **ONLY** place where `supabase-js` client is directly used. All DB calls must go through here.
- `/supabase/functions`: Deno-based Edge Functions.
    - `start-scrape`: Initiator.
    - `scrape-callback`: Receiver/Processor.
- `/scraper-service`: Python environment for Modal.
    - `execution/`: Actual scripts.
    - `modal_webhook.py`: The entry point for the cloud function.

## 5. Scalability Standards & Rules
1.  **No Client-Side Processing**: Never scrape or process huge datasets in the browser. Use Edge Functions or Modal.
2.  **Pagination is Mandatory**: For `LeadList`, ALWAYS use `useLeadsPaginated` (server-side pagination). Never fetch `select('*')` on the whole leads table.
3.  **Batch Inserts**: When saving scraped leads, use batch inserts (e.g., 100 at a time) to avoid timeouts.
4.  **Idempotency**: The Scraper Callback must be idempotent. If called twice, it should not create duplicate leads.

## 6. Current "To-Do" / Fragile Areas
-   **Frontend Bottleneck**: `LeadList.tsx` currently fetches ALL leads. Needs refactoring to use the existing `useLeadsPaginated` hook.
-   **Error Handling**: If Modal times out (>10 mins), the job stays "processing" forever. We need a cron or timeout check. (Update: Added "Force Stop" button as temporary fix).

## 7. Development Workflow
-   **Frontend**: `npm run dev`
-   **Supabase Functions**: `npx supabase functions deploy <name>`
-   **Scraper**: `cd scraper-service && modal deploy execution/modal_webhook.py`

---
*Verified as of Dec 28, 2025 by System Review Agent.*
