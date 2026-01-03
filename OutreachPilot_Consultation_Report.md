# Outbound Pilot Architecture Review & Scaling Consultation

**Prepared for:** Luka  
**Date:** December 2024  
**Scope:** Technical review for scaling to hundreds of paying customers

---

## Executive Summary

Outbound Pilot is well-architected for its current stage. The tech stack choices (React + Supabase + React Query) are appropriate, and critical patterns like multi-tenancy, pagination, and defense-in-depth security are already in place.

However, scaling to hundreds of paying customers with thousands of leads each requires attention in five areas: **OAuth token management**, **database performance**, **credential security**, **operational visibility**, and **codebase maintainability**.

This report details findings and recommendations in priority order.

---

## Current State Assessment

### What's Working Well

| Area | Status | Notes |
|------|--------|-------|
| Multi-tenancy | ✅ Strong | RLS + explicit user_id filtering (27+ locations) |
| Data access patterns | ✅ Strong | Pagination from day one, no "load all" anti-patterns |
| Auth | ✅ Good | Supabase Auth with Google OAuth, JWT verification in Edge Functions |
| State management | ✅ Good | React Query with proper cache invalidation |
| Separation of concerns | ✅ Good | Services layer, hooks for data fetching, components for UI |
| Optimistic updates | ✅ Good | Immediate UI feedback with rollback on error |

### Risk Areas

| Area | Risk Level | Impact if Unaddressed |
|------|------------|----------------------|
| No error monitoring | 🔴 High | Production issues go undetected |
| supabase.ts size (750 lines) | 🟡 Medium | Slows development, increases bug risk |
| Credentials unencrypted | 🟡 Medium | Security liability if database breached |
| No automated tests | 🟡 Medium | Regressions as codebase grows |
| Gmail token revocation handling | 🟢 Low | Users need to reconnect if they revoke access (edge case) |
| Large components | 🟢 Low | Maintainability, not functionality |

---

## Priority 1: Production Monitoring (Critical)

### The Problem

You have no visibility into production errors. When (not if) something breaks for a user:
- You won't know it happened
- You won't have context to debug
- User may churn before contacting support

### Recommendations

**Immediate (1 day of work):**

1. **Sentry for error tracking**
   ```typescript
   // In main.tsx
   Sentry.init({
     dsn: "your-sentry-dsn",
     environment: import.meta.env.MODE,
   });
   ```
   - Captures React errors automatically
   - Shows stack traces, user context, breadcrumbs
   - Free tier handles significant volume

2. **Edge Function error logging**
   - Supabase logs Edge Function errors, but add structured logging
   - Include user_id, operation, relevant IDs

**Medium-term:**

3. **Uptime monitoring**
   - Ping your app every 5 minutes (UptimeRobot, free)
   - Alert when it's down

4. **Business metrics dashboard**
   - Active users, emails sent, calls made
   - Helps you spot problems ("sends dropped 50% today")

---

## Priority 2: Database Performance

### Current State

You have 9 indexes, which is good. But query patterns at scale need verification.

### Key Queries to Optimize

**TaskQueue (daily driver):**
```sql
-- This query runs constantly
SELECT * FROM leads 
WHERE user_id = ? 
  AND next_task_date <= CURRENT_DATE
  AND status NOT IN ('replied', 'qualified', 'disqualified')
ORDER BY next_task_date;

-- Needs compound index:
CREATE INDEX idx_leads_tasks ON leads(user_id, next_task_date, status);
```

**Pipeline with filters:**
```sql
-- Complex filter combinations
SELECT * FROM leads
WHERE user_id = ?
  AND status IN (?, ?)
  AND strategy_id = ?
ORDER BY created_at DESC
LIMIT 25;

-- Needs:
CREATE INDEX idx_leads_pipeline ON leads(user_id, status, strategy_id, created_at DESC);
```

**Activity feed per lead:**
```sql
SELECT * FROM activities
WHERE user_id = ? AND lead_id = ?
ORDER BY timestamp DESC;

-- Needs compound index (may already have):
CREATE INDEX idx_activities_lead ON activities(user_id, lead_id, timestamp DESC);
```

### Recommendations

1. **Before scaling:** Run `EXPLAIN ANALYZE` on these queries with realistic data volume
2. **Add missing indexes** based on analysis
3. **Enable Supabase connection pooling** (PgBouncer)
   - Switch to pooled connection string
   - Handles concurrent connections better
4. **Monitor slow queries** — Supabase dashboard shows these

### Estimated Effort

- Query analysis: 2-3 hours
- Index creation: 30 minutes
- Connection pooling: 1 hour (mostly config)

---

## Priority 3: Credential Security

### Current State

Stored in `profiles` table:
- `twilio_account_sid`, `twilio_auth_token`
- `gmail_access_token`, `gmail_refresh_token`  
- `resend_api_key`

These are encrypted at rest by Supabase (database encryption), but:
- Anyone with database access sees plaintext
- SQL injection would expose all credentials
- No audit trail for credential access

### Risk Assessment

For current stage: **Acceptable**. You're the only one with database access.

For paying customers: **Should improve**. These credentials can send emails as your users and make calls from their numbers.

### Recommendations

**Medium-term (before significant scale):**

1. **Supabase Vault** for credential storage
   - Built-in encrypted secrets management
   - Access via Edge Functions only
   - Audit logging included

2. **Separate credentials table** with tighter RLS
   ```sql
   CREATE TABLE user_credentials (
     user_id uuid PRIMARY KEY REFERENCES auth.users,
     twilio_credentials jsonb,  -- encrypted blob
     gmail_credentials jsonb,
     resend_credentials jsonb,
     updated_at timestamptz
   );
   
   -- Tighter policies, no direct SELECT
   -- Access only via Edge Functions
   ```

3. **Audit logging** for credential operations
   - Log when credentials are read/written
   - Helps with security incident response

### Effort

- Vault migration: 1-2 days
- Significant refactoring of Edge Functions

---

## Priority 4: Codebase Maintainability

### Issue 1: supabase.ts (750 lines)

This file is your entire data layer. Finding and modifying functions becomes harder as it grows.

**Recommendation:** Split by domain

```
services/
├── index.ts              # Barrel exports
├── supabase.ts           # Client init, shared utilities
├── leads.ts              # Lead CRUD, bulk operations
├── activities.ts         # Activity logging
├── strategies.ts         # Strategy CRUD
├── calling.ts            # Twilio, call records
├── email.ts              # Gmail, Resend
└── scrapeJobs.ts         # Lead finder
```

**Effort:** Half-day refactor, low risk

### Issue 2: No Automated Tests

You're relying on manual testing. This works until:
- You refactor something and break a subtle behavior
- You're afraid to change code because you might break things
- You onboard another developer

**Recommendation:** Start with critical path tests

```typescript
// Test the Auto-Stop behavior
describe('updateLead', () => {
  it('clears next_task_date when status is terminal', async () => {
    const lead = await createLead({ status: 'in_progress', next_task_date: '2024-12-30' });
    await updateLead(lead.id, { status: 'replied' });
    const updated = await getLeadById(lead.id);
    expect(updated.next_task_date).toBeNull();
  });
});

// Test strategy step advancement
describe('advanceStrategyStep', () => {
  it('calculates next_task_date from step dayOffset', async () => {
    // ...
  });
});
```

**Effort:** 
- Setup (Vitest + test utilities): 2-3 hours
- Core tests (10-15 tests): 1 day
- Ongoing: Add tests when you find bugs

### Issue 3: Large Components

`TaskQueue.tsx` handling three modes (list/calendar/processing) is likely 400+ lines. Not urgent, but harder to work with.

**Recommendation:** Extract when you next touch it

```
TaskQueue/
├── index.tsx           # Mode state, routing
├── ListView.tsx
├── CalendarView.tsx
├── ProcessingView.tsx
├── TaskCard.tsx        # Shared component
└── useTaskQueue.ts     # Shared logic
```

---

## Future Considerations

### Team/Organization Support

Your current schema: leads belong to users.

Future need: leads belong to organizations, users have roles within organizations.

**Impact if added later:**
- Schema migration with data transformation
- Every query changes from `user_id` to `org_id`
- Permission system (admin, member, viewer)
- Invitation flow

**Recommendation:** If you're confident team features are needed within 6-12 months, consider adding `org_id` now even if unused. Cheaper than migrating with real customer data.

### Rate Limiting

With hundreds of users hitting external APIs:
- Twilio rate limits
- Gmail sending limits (2,000/day for workspace, 500/day for personal)
- Gemini API quotas

**Recommendation:** Add rate limit awareness
- Track sends per user per day
- Warn when approaching limits
- Queue and spread sends if needed

### Billing Integration

Currently subscription is just a flag. For real billing:
- Stripe Checkout for subscription management
- Webhook to update subscription status
- Feature gating based on tier
- Dunning (failed payment handling)

---

## Recommended Action Sequence

### Immediate (Before Paid Customers)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 1 | Add Sentry error tracking | 1 day | Know when things break |
| 2 | Database query optimization | 1 day | Performance at scale |
| 3 | Connection pooling setup | 0.5 day | Handle concurrent users |

### Short-term (First 10-50 Customers)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 4 | Split supabase.ts | 0.5 day | Maintainability |
| 5 | Add core automated tests | 1-2 days | Confidence in changes |
| 6 | Handle Gmail revocation gracefully | 0.5 day | UX for edge case |

### Medium-term (50-200 Customers)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 7 | Vault for credentials | 2 days | Security |
| 8 | Rate limit awareness | 2 days | API reliability |
| 9 | Metrics dashboard | 1-2 days | Business insight |

---

## Conclusion

Outbound Pilot is in good shape architecturally. The choices you've made (Supabase, React Query, RLS, pagination) are appropriate for the scale you're targeting.

The most critical gaps are **operational** rather than architectural:
1. Production monitoring doesn't exist
2. No automated tests create regression risk
3. Database queries need verification at scale

Once Google verification is complete, the Gmail token lifecycle becomes a non-issue. Until then, tokens expire weekly but that's a known temporary limitation.

Address error monitoring and database optimization before onboarding significant paying customers. The rest can be tackled incrementally as you scale.

The codebase is clean enough that another developer (or Claude Code) could work on it effectively. The ARCHITECTURE.md restructuring will help with onboarding and consistency.

---

*End of report*
