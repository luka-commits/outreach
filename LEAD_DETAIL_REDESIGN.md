# Lead Detail Page Redesign — Final Recommendation

> **Author:** Claude (Design & CRM Analysis)  
> **Date:** 2025-12-31  
> **Status:** Recommendation for Review

---

## Executive Summary

The current lead detail page suffers from **feature scatter**—11 distinct sections competing for attention with no clear hierarchy. This document proposes an **Action-First** redesign optimized for outbound sales workflows, consolidating redundant elements and establishing clear visual priority.

**Core principle:** When a salesperson opens a lead, they need to know **what to do next** before they need full relationship history.

---

## Current Problems

### 1. Information Overload
| Issue | Impact |
|-------|--------|
| 11+ separate cards/sections | Cognitive overload, no clear entry point |
| Company name appears 3x | Visual noise, wasted space |
| Location/Industry duplicated in tags AND fields | Redundant information |
| 60% empty states for new leads | Discouraging, wastes screen real estate |

### 2. Poor Task-Flow Alignment
- "Log Touchpoint" buried in middle of page
- "Set Manual Task" separated from activity logging
- No visual indication of "what's due now"
- Strategy shown as selection UI, not progress

### 3. Redundant Sections
- **Call History** + **Lead History** = same concept, split apart
- **Contact Channels** + **Log Touchpoint** = both about "how to reach lead"
- **Notes** as full card when most leads have zero notes

### 4. Missing Context
- No visual status progression (where is this lead in the funnel?)
- No "time since last contact" indicator
- Strategy steps not shown as timeline

---

## Design Philosophy

### Why Action-First (Not Timeline-First)

Traditional CRMs (HubSpot, Salesforce) put relationship history front-and-center. This works for **account management**—nurturing existing relationships.

Outbound Pilot is an **outbound sales tool**. Users work from a TaskQueue, executing strategy sequences on cold/warm leads. The mental model is:

```
1. Who is this? (2 seconds)
2. What do I do now? (immediate)
3. Do the thing (primary interaction)
4. What happened before? (reference, if needed)
```

Putting a timeline in 70% of the screen optimizes for step 4. We should optimize for steps 2-3.

### The 65/35 Split

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                   │
│            Identity + Status + Primary Actions                   │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────┬───────────────────────────────┐
│         MAIN COLUMN             │          SIDEBAR              │
│            (65%)                │           (35%)               │
│                                 │                               │
│   Current Task (Hero)           │   Quick Contact               │
│   Strategy Progress             │   Lead Details (collapsed)    │
│   Activity Composer             │   Notes (expandable)          │
│   Unified Timeline              │                               │
│                                 │                               │
└─────────────────────────────────┴───────────────────────────────┘
```

**Left column:** Action-oriented. What to do, how to do it, what's been done.  
**Right column:** Reference. Who they are, how to reach them, internal notes.

---

## Proposed Layout

### Header (Sticky)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Pipeline                                              │
│                                                                 │
│ C S Plumbing                                    🗑  [Log Reply]  │
│ ★ 4.0 (1 review)  •  Biwabik, MN  •  Plumber       [Qualify ▾]  │
│                                                                 │
│ ○────────●────────○────────○                                    │
│ Not      In       Replied  Qualified                            │
│ Contacted Progress                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Components:**
- Company name (single instance, editable on click)
- Trust signals: rating, location, industry as subtle metadata
- **Status stepper**: Visual progression through the funnel
- Primary actions: "Log Reply" (highlighted), "Qualify" (dropdown for status changes)
- Delete action (icon, requires confirmation)

**Removed from header:**
- Duplicate company name instances
- Separate tags for location/industry (now inline text)
- "+ Add Tag" (move to details panel)

---

### Main Column (65%)

#### 1. Next Action Card (Hero Position)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ NEXT STEP                                          Due Today │
│                                                                 │
│  Day 3: Send Follow-up Email                                    │
│  Template: "Quick follow-up on our conversation..."             │
│                                                                 │
│  [📧 Open Email Composer]              [Skip] [Reschedule ▾]    │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
- **Task due today/overdue**: Yellow/red highlight, prominent CTA
- **Task upcoming**: Subtle, shows date
- **No strategy assigned**: "No sequence active" + strategy picker
- **Strategy complete**: Success state, suggest next action

**Why hero position:** This is why the user opened this lead. Don't make them hunt for it.

---

#### 2. Strategy Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Instagram Warm-up                              [Change ▾]   │
│                                                                 │
│  ●━━━━━━━━●━━━━━━━━○━━━━━━━━○━━━━━━━━○                          │
│  Day 1    Day 3    Day 7    Day 14   Day 21                     │
│  DM ✓     Email    Call     Email    Close                      │
│           ← YOU ARE HERE                                        │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Horizontal step visualization
- Completed steps: filled circle + checkmark
- Current step: highlighted, labeled "YOU ARE HERE"
- Future steps: hollow circles
- Strategy name as header with dropdown to change
- Compact: ~80px height

---

#### 3. Activity Composer (Unified)

```
┌─────────────────────────────────────────────────────────────────┐
│  📝 Log Activity                                                │
│                                                                 │
│  [💬 DM] [📧 Email] [📞 Call] [🚶 Walk-in] [📝 Note]            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Write a detailed note about your interaction...           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ☐ Schedule follow-up                                           │
│    [1 hour] [Tomorrow] [End of day] [Next week] [Custom]        │
│    Note: ________________________________                       │
│                                                                 │
│                                        [Save Activity]          │
└─────────────────────────────────────────────────────────────────┘
```

**What this consolidates:**
- Log Touchpoint → Activity Composer
- Contact Channels → Channel selector tabs (DM, Email, Call, etc.)
- Set Manual Task → Checkbox "Schedule follow-up"
- Loom Video → Attachment option within composer (not shown by default)

**Behavior:**
- Selecting a channel pre-fills relevant fields
- "Email" opens email-specific composer (subject, body, send via Gmail/Resend)
- "Call" initiates Twilio WebRTC flow
- Follow-up scheduling is integrated, not separate
- Completing activity auto-advances strategy if it matches the current step

---

#### 4. Unified Activity Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│  📜 Activity History                              [Filter ▾]    │
│                                                                 │
│  TODAY                                                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📞 Called (No answer)                         10:30 AM  │    │
│  │    Duration: 0:45 • Left voicemail                      │    │
│  │    [▶ Play Recording]                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  DECEMBER 28                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 💬 Sent Instagram DM                           2:15 PM  │    │
│  │    "Hey! Saw your work on the Johnson project..."       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🎯 Strategy assigned: Instagram Warm-up       10:00 AM  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  DECEMBER 25                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ➕ Lead created (CSV Import)                   3:45 PM  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                    [Load more...]                               │
└─────────────────────────────────────────────────────────────────┘
```

**What this consolidates:**
- Lead History
- Call History
- Notes (activity-type notes appear here)
- Strategy events (assignment, step completions)

**Features:**
- Grouped by date
- Icon per activity type (DM, Email, Call, Walk-in, Note, System)
- Expandable details (call recordings, full message text)
- Filter dropdown (All, Calls only, Emails only, etc.)
- Infinite scroll or "Load more" pagination

---

### Sidebar (35%)

#### 1. Quick Contact Dock

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTACT                                                        │
│                                                                 │
│  [📱]  [📧]  [📸]  [👤]  [💼]  [🌐]                              │
│  Call  Email  IG   FB   LinkedIn Web                            │
│                                                                 │
│  📱 (218) 555-0123                              [Copy]          │
│  📧 info@csplumbing.com                         [Copy]          │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Icon row: Click to initiate action (call opens Twilio, email opens composer)
- Icons gray out if data not available
- Phone/email shown below with copy buttons
- Compact: ~100px height

---

#### 2. Lead Details (Collapsible Accordion)

```
┌─────────────────────────────────────────────────────────────────┐
│  DETAILS                                              [Edit]    │
│                                                                 │
│  ▾ Contact Information                                          │
│    Name: John Smith                                             │
│    Phone: (218) 555-0123                                        │
│    Email: info@csplumbing.com                                   │
│                                                                 │
│  ▸ Company Information                                          │
│                                                                 │
│  ▸ Social Profiles                                              │
│                                                                 │
│  ▸ Location & Address                                           │
│                                                                 │
│  ▸ Tags                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Content:**
- **Contact Info**: Name, phone, email
- **Company Info**: Company name, website, industry, rating
- **Social Profiles**: Instagram, Facebook, LinkedIn URLs
- **Location**: Address, city, state, zip
- **Tags**: Custom tags with add/remove

**Why collapsible:** Most of this is reference info. Users don't need it expanded every time.

---

#### 3. Notes (Expandable)

```
┌─────────────────────────────────────────────────────────────────┐
│  NOTES (3)                                         [+ Add]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Dec 30: Spoke with receptionist, John is on vacation    │    │
│  │ until Jan 5. Call back then.                            │    │
│  │                                            [Edit] [🗑]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Dec 28: Very interested in website redesign. Budget...  │    │
│  │                                                  [...]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Show all notes]                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Shows 2-3 most recent notes
- Long notes truncated with "..." expand on click
- "Show all notes" for leads with many notes
- "+ Add" opens inline composer or modal

**Note types:**
- **Sticky notes** (sidebar): Long-term reference info about the lead
- **Activity notes** (timeline): What happened during an interaction

---

## Component Architecture

```
LeadDetail/
├── index.tsx                    # Layout container, data fetching
├── LeadHeader.tsx               # Company, status stepper, actions
├── NextActionCard.tsx           # Hero task card (NEW)
├── StrategyRoadmap.tsx          # Horizontal progress visualization (REDESIGN)
├── ActivityComposer.tsx         # Unified logging + scheduling (REDESIGN)
├── ActivityTimeline.tsx         # Merged history feed (REDESIGN)
├── QuickContactDock.tsx         # Contact icons + numbers (NEW)
├── LeadDetailsPanel.tsx         # Collapsible accordion (REDESIGN)
└── NotesPanel.tsx               # Sticky notes sidebar (NEW)
```

**Removed/Deprecated:**
- `SchedulePanel.tsx` → Merged into ActivityComposer
- `ActivityFeed.tsx` → Replaced by ActivityTimeline
- Separate Call History section → Merged into ActivityTimeline

---

## Data Requirements

### New/Modified Queries

```typescript
// Unified timeline query - replaces separate activity + call queries
useUnifiedTimeline(leadId: string) {
  // Returns merged, sorted list of:
  // - Activities (existing)
  // - Call records (existing)
  // - System events (strategy changes, status changes)
}

// Current task query - surfaces next due action
useCurrentTask(leadId: string) {
  // Returns:
  // - Next strategy step (if strategy assigned)
  // - Manual task (if scheduled)
  // - null (if no pending tasks)
}
```

### Database Considerations

No schema changes required. This is a UI-only refactor. Existing tables support all proposed features:
- `activities` → Timeline entries
- `call_records` → Call entries in timeline
- `leads.strategy_id` + `leads.current_step_index` → Strategy roadmap
- `leads.next_task_date` → Next action card
- `strategies.steps` → Roadmap visualization

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `ActivityTimeline` component (merge Lead History + Call History)
- [ ] Add date grouping and activity type icons
- [ ] Deprecate separate history sections

### Phase 2: Action-First (Week 2)
- [ ] Create `NextActionCard` component
- [ ] Create `StrategyRoadmap` horizontal visualization
- [ ] Add strategy dropdown selector

### Phase 3: Composer Unification (Week 3)
- [ ] Redesign `ActivityComposer` with channel tabs
- [ ] Integrate follow-up scheduling into composer
- [ ] Add Loom as attachment option

### Phase 4: Sidebar (Week 4)
- [ ] Create `QuickContactDock` component
- [ ] Create `LeadDetailsPanel` accordion
- [ ] Create `NotesPanel` with sticky notes

### Phase 5: Header & Polish (Week 5)
- [ ] Redesign `LeadHeader` with status stepper
- [ ] Make header sticky on scroll
- [ ] Remove redundant elements
- [ ] Mobile responsive adjustments

---

## Success Metrics

| Metric | Current (Est.) | Target |
|--------|----------------|--------|
| Time to find "next action" | 5-10 seconds | < 2 seconds |
| Scroll required to log activity | 400px+ | 0px (visible on load) |
| Sections visible above fold | 3-4 partial | 4 complete |
| Empty state card count (new lead) | 4 | 1 |
| Clicks to complete daily task | 4-5 | 2-3 |

---

## Visual Reference

### Before (Current)
```
┌─────────────────────────────────────────────────────────────────┐
│  [HEAVY HEADER - 200px]                                         │
├─────────────────────────────────────────────────────────────────┤
│  [COMPANY ROW - redundant info]                                 │
├─────────────────────────────────────────────────────────────────┤
│  [CONTACT CHANNELS - 6 large boxes]                             │
├─────────────────────────────────────────────────────────────────┤
│  [LOOM VIDEO - rarely used]                                     │
├─────────────────────────────────────────────────────────────────┤
│  [ADDRESS - single line needs full card?]                       │
├──────────────────────────────┬──────────────────────────────────┤
│  [STRATEGY PLAN]             │  [LOG TOUCHPOINT]                │
│  3 large option cards        │  textarea + button               │
├──────────────────────────────┼──────────────────────────────────┤
│  [SET MANUAL TASK]           │  [LEAD HISTORY]                  │
│  4 time buttons              │  empty state                     │
├──────────────────────────────┴──────────────────────────────────┤
│  [NOTES - full width card]                                      │
├─────────────────────────────────────────────────────────────────┤
│  [CALL HISTORY - separate from lead history??]                  │
└─────────────────────────────────────────────────────────────────┘
```

### After (Proposed)
```
┌─────────────────────────────────────────────────────────────────┐
│  C S Plumbing • ★4.0 • Biwabik     [Log Reply] [Qualify ▾] 🗑   │
│  ○────●────○────○  Not Contacted → In Progress → Replied        │
├────────────────────────────────────┬────────────────────────────┤
│                                    │                            │
│  ⚡ NEXT: Day 3 Email    [Do It]   │  📱 📧 📸 💼 🌐            │
│                                    │  (218) 555-0123 [Copy]     │
│  ●━━●━━○━━○ Instagram Warm-up      │                            │
│                                    ├────────────────────────────┤
│  📝 Log Activity                   │  DETAILS           [Edit]  │
│  [DM] [Email] [Call] [Walk-in]     │  ▾ Contact Info            │
│  [____________________________]    │  ▸ Company                 │
│  ☐ Schedule follow-up              │  ▸ Social                  │
│  [Save Activity]                   │  ▸ Location                │
│                                    ├────────────────────────────┤
│  📜 Activity History               │  NOTES (2)        [+ Add]  │
│  ┌─ Today ──────────────────┐      │  ┌──────────────────────┐  │
│  │ 📞 Called (no answer)    │      │  │ Dec 30: Call back... │  │
│  └──────────────────────────┘      │  └──────────────────────┘  │
│  ┌─ Dec 28 ─────────────────┐      │                            │
│  │ 💬 Sent Instagram DM     │      │                            │
│  └──────────────────────────┘      │                            │
│                                    │                            │
└────────────────────────────────────┴────────────────────────────┘
```

---

## Questions to Resolve Before Implementation

1. **Notes model**: Should "notes" be separate from "activities" or unified? (Current: activities have `note` field, but there's no dedicated notes table)

2. **Strategy auto-advance**: When user logs an activity matching the current strategy step, should it auto-advance? Or require explicit "Complete Step" action?

3. **Mobile breakpoint**: At what width should the sidebar collapse to bottom or become tabs?

4. **Call integration**: Should clicking the phone icon in Quick Contact Dock initiate Twilio call immediately, or open a confirmation?

---

## Appendix: Rejected Alternatives

### Alternative A: Full Timeline-First (70/30)
**Rejected because:** Optimizes for relationship review over action execution. Doesn't match outbound sales workflow where "what to do next" is primary.

### Alternative B: Single-Column Layout
**Rejected because:** Either buries reference info (bad for lookups) or creates very long scroll (bad for action speed). Two-column provides best balance.

### Alternative C: Tab-Based Layout
**Rejected because:** Hides information behind clicks. Sales reps need to see task + history + contact info simultaneously, not switch between tabs.

---

*End of recommendation document.*
