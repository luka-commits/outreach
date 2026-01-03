# CLAUDE.md - Outbound Pilot

## Context

**Outbound Pilot** — Sales outreach app for agencies, freelancers, and sales teams. Users manage leads, run multi-step sequences, and execute outreach across channels (email, DMs, calls, walk-ins).

**Scale target:** Hundreds of users, thousands of leads each, connected Gmail/Twilio accounts.

**Stakes:** Users run their client acquisition through this. Bugs cost them revenue.

See **ARCHITECTURE.md** for technical details, database schema, API functions, and project structure.

---

## How to Work

### 1. Check Existing Patterns First

Before writing new code, look at how similar problems are solved in this codebase. Follow existing patterns in `hooks/queries/`, `services/supabase.ts`, and similar components.

Why: LLMs improvising 5 steps at 90% accuracy = 59% success. Following proven patterns is more reliable.

### 2. Protect Existing Functionality

New features must never break what works. Before modifying code:
- Search for all usages
- Understand dependencies
- After changes, verify original behavior still works

If you're not confident a change is safe, say so.

### 3. Think at Scale

Every change must work for 200 users with 5,000 leads each. Ask:
- Will this query be fast with 50k leads?
- Is User A's data isolated from User B?
- What happens if 200 users do this simultaneously?

Red flags: queries without limits, loading "all" anything, N+1 patterns, missing `user_id` filters.

### 4. Improve Continuously

When something breaks: fix it → understand why → improve the code → update ARCHITECTURE.md. System gets stronger.

### 5. Challenge and Suggest

Don't just implement requests. Push back when something is risky. Suggest better approaches. Present options for significant decisions. Think like an owner, not a contractor.

### 6. Keep Docs Current

Update ARCHITECTURE.md when you add components, hooks, API functions, database tables, or edge functions. Documentation is part of the task.

---

## Critical Rules (Never Break)

**User isolation:** Every Supabase query MUST include `.eq('user_id', userId)`. RLS is backup, not primary defense.

**Auth:** All routes inside `AuthGuard`. Edge Functions verify JWT via `supabase.auth.getUser()`.

**Errors:** Never swallow silently. Show feedback via `showToast()`. Optimistic updates must rollback on failure.

---

## High-Risk Files

| File | Risk | Reason |
|------|------|--------|
| `services/supabase.ts` | Critical | All data access - breaking this breaks everything |
| `hooks/useAuth.tsx` | Critical | Auth - breaking this locks out users |
| `lib/queryClient.ts` | High | Query keys - wrong keys = stale data |
| `supabase/migrations/*` | Critical | Schema - can cause data loss |
| `App.tsx` | High | Route guards, context providers |

Extra caution required when modifying these files.

---

## Prohibited

- Disable/weaken RLS policies
- Remove `user_id` filters
- Secrets in client code
- Bypass AuthGuard
- Modify existing migrations
- Use `any` without justification
- Query without `enabled: !!userId`
- Raw query key strings (use `queryKeys.*`)

---

## When Uncertain

Ask. Don't guess. It's better to clarify than to ship bugs.

---

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build (run before committing)
npm run lint         # Lint check
npm run type-check   # TypeScript check
```
