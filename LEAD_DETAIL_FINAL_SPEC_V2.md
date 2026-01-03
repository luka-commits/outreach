# Lead Detail Page — Final Specification

> **Date:** 2025-01-01  
> **Status:** Approved for Implementation

---

## Context: Why This Redesign

### Problems with Current Version

The current lead detail page has significant UX issues that make it difficult for non-technical users to navigate efficiently:

1. **Too Many Sections (11+):** The page is cluttered with separate cards for Strategy Plan, Log Touchpoint, Set Manual Task, Notes, Call History, Lead History, Contact Channels, Loom Video, and more. Users have to scan in a "Z-pattern" to find what they need.

2. **Redundant Information:** The same data appears in multiple places:
   - Phone number displayed in both CONTACT sidebar and DETAILS panel
   - Contact actions (Call, Email, DM) appear as both sidebar icons AND Log Activity tabs
   - Strategy selection appears in two separate UI elements
   - Location appears in header tags AND details section

3. **Split View Confusion:** The two-column layout (main + sidebar) creates cognitive load. Users aren't sure which column to focus on.

4. **Poor Task Flow:** The primary action (logging activity) is buried in the middle of the page. Users have to scroll past non-actionable information to do their main task.

5. **Scattered Contact Methods:** Social links, phone, and email are spread across multiple sections instead of being consolidated.

6. **Status Stepper Takes Too Much Space:** The horizontal stepper consumes valuable header real estate for something that changes infrequently.

### Design Goals

- Reduce from 11 sections to 4
- Single column layout (no split view)
- Each piece of information appears exactly once
- Familiar patterns (chat-style activity feed)
- Clear visual hierarchy
- Inline editing throughout
- Optimized for non-technical users who need clarity over density

---

## Overview

A simplified, single-column lead detail page with 4 sections:

1. **Header** — Identity, status dropdown, primary actions
2. **Contact** — Phone, email, social links, Loom video, executive summary
3. **Strategy & Next Step** — Current strategy progress and what's due
4. **Activity** — Unified history feed with input at bottom

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                          HEADER                                  │
│         Identity + Status Dropdown + Primary Actions             │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                          CONTACT                                 │
│     Phone, Email, Social Links, Loom Video, Executive Summary    │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGY & NEXT STEP                          │
│               Current strategy + what's due next                 │
└─────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────┐
│                          ACTIVITY                                │
│              History (scrollable) + Input (fixed)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Header

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← BACK TO PIPELINE                     🗑  [Log Reply] [Status ▾] │
│                                                                 │
│  C S Plumbing    ⟲ 22                                          │
│  ★ 4.0 (1 reviews) • Biwabik • Plumber                         │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Element | Behavior |
|---------|----------|
| ← Back to Pipeline | Returns to Pipeline view |
| 🗑 Delete | Opens confirmation modal, then deletes lead |
| [Log Reply] | Primary action — logs a reply received, auto-sets status to "Replied" |
| [Status ▾] | Dropdown showing current status with options to change |
| Company Name | **Inline editable** — click to edit |
| ⟲ 22 | Lead ID (read-only) |
| Rating | **Inline editable** — click to edit |
| Location | **Inline editable** — click to edit |
| Industry | **Inline editable** — click to edit |

### Status Dropdown

The status dropdown replaces the horizontal stepper. Shows current status as button text, click to open dropdown.

```
┌─────────────────┐
│ Not Contacted ▾ │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│ ○ Not Contacted │ ← Current (highlighted)
│ ○ In Progress   │
│ ○ Replied       │
│ ───────────────│
│ ○ Qualified     │
│ ○ Lost          │
└─────────────────┘
```

**Status Options:**
- Not Contacted (default)
- In Progress
- Replied
- Qualified (terminal)
- Lost (terminal)

**Auto-Status Changes:**
| Action | Status Changes To |
|--------|-------------------|
| User assigns a strategy | In Progress |
| User clicks [Log Reply] | Replied |
| User manually selects | Whatever they choose |

**Terminal Statuses:**
When status is set to "Qualified" or "Lost", the `next_task_date` is cleared (lead exits task queue).

---

## Section 2: Contact

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTACT                                                        │
│                                                                 │
│  Phone   +12188654315                                    [Copy] │
│  Email   email@company.com                               [Copy] │
│                                                                 │
│  [IG]  [FB]  [LI]  [Web]                                       │
│                                                                 │
│  [🎥 Add Loom Video]                                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  EXECUTIVE SUMMARY                                              │
│  Brief AI-generated or manual summary of this lead...           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Element | Behavior |
|---------|----------|
| Phone | **Inline editable** — click to edit. [Copy] copies to clipboard |
| Email | **Inline editable** — click to edit. [Copy] copies to clipboard |
| Social buttons | Native platform icons (not emojis) |
| Loom Video | Link to add/view Loom video |
| Executive Summary | **Inline editable** — AI-generated or manually written |

### Social Buttons

Use native platform icons (SVG or icon library), not emojis.

| Button | Icon | State: Has URL | State: No URL |
|--------|------|----------------|---------------|
| Instagram | Native IG icon | Colored, opens link | Gray, click to add URL |
| Facebook | Native FB icon | Colored, opens link | Gray, click to add URL |
| LinkedIn | Native LI icon | Colored, opens link | Gray, click to add URL |
| Website | Globe icon | Colored, opens link | Gray, click to add URL |

**Empty State Behavior:**
- Gray/muted appearance
- On click, opens inline input to add URL
- Once URL added, button becomes colored/active

### Loom Video

```
State: No video
┌─────────────────────────────┐
│  🎥 Add Loom Video          │
└─────────────────────────────┘

State: Has video
┌─────────────────────────────┐
│  🎥 View Loom Video   [✕]   │
└─────────────────────────────┘
```

- Click "Add Loom Video" → inline input for URL
- Click "View Loom Video" → opens Loom link in new tab
- [✕] removes the video link

### Executive Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                     [Edit]   │
│                                                                 │
│  Plumbing company in Biwabik, MN. 4-star rating with 1 review.  │
│  Potential interest in website redesign services. Owner John    │
│  mentioned they're looking to expand online presence.           │
└─────────────────────────────────────────────────────────────────┘
```

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                              │
│                                                                 │
│  No summary yet. Click to add one, or let AI generate it.       │
│  [✍️ Write Summary]  [✨ Generate with AI]                       │
└─────────────────────────────────────────────────────────────────┘
```

- **Inline editable** — click anywhere to edit
- Can be manually written or AI-generated
- AI generation uses lead data + activity history to create summary

---

## Section 3: Strategy & Next Step

### Layout — With Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ STRATEGY & NEXT STEP                         [Change ▾]     │
│                                                                 │
│  Instagram Warm-up                                              │
│  ●━━━━●━━━━○━━━━○━━━━○                                          │
│  Day 1  Day 3  Day 7  Day 14  Day 21                           │
│                                                                 │
│  Next: Day 3 - Send follow-up email             [Execute →]     │
└─────────────────────────────────────────────────────────────────┘
```

### Layout — Empty State (Collapsed)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ STRATEGY    No strategy assigned           [Select Strategy] │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Element | Behavior |
|---------|----------|
| [Change ▾] | Dropdown to select different strategy or remove current |
| Strategy name | Display only |
| Progress bar | Visual steps: ● completed, ○ upcoming |
| Step labels | Day offset + action type |
| Next step indicator | Shows what's due and when |
| [Execute →] | Scrolls to Activity input, pre-selects matching channel tab |
| [Select Strategy] | Opens dropdown to assign strategy (empty state) |

### Progress Bar Details

```
●━━━━●━━━━○━━━━○━━━━○
│     │     │     │     │
Day 1 Day 3 Day 7 Day14 Day21
DM ✓  Email Call  Email Close
      ↑
   CURRENT
```

- Completed steps: Filled circle (●) with subtle checkmark
- Current step: Highlighted
- Future steps: Hollow circle (○)

### Auto-Status on Strategy Assignment

When user selects a strategy via [Select Strategy]:
1. Strategy is assigned to lead
2. `current_step_index` set to 0
3. `next_task_date` calculated from first step
4. **Status automatically changes to "In Progress"**

---

## Section 4: Activity

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ACTIVITY                                   [All Activity ▾]    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │                   (scrollable history)                    │  │
│  │                                                           │  │
│  │  DECEMBER 30, 2025                                        │  │
│  │  ├─ [LI] LinkedIn Log                           10:37 AM  │  │
│  │  │   3r4f3rf                                              │  │
│  │  │                                                        │  │
│  │  ├─ [Note] Manual Note                          10:37 AM  │  │
│  │  │   svcefv                                               │  │
│  │                                                           │  │
│  │  DECEMBER 28, 2025                                        │  │
│  │  ├─ [IG] Instagram DM                            2:15 PM  │  │
│  │  │   Sent intro message about web design services         │  │
│  │                                                           │  │
│  │  DECEMBER 25, 2025                                        │  │
│  │  ├─ [+] Lead Created (CSV Import)                3:45 PM  │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [DM] [Email] [Call] [FB] [LI] [Walk-in] [Note]                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Write a note about this lead...                           │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Schedule follow-up]                         [Save Activity]   │
└─────────────────────────────────────────────────────────────────┘
```

### Structure

The Activity section has two parts:

**A. History Feed (Top, Scrollable)**
- Shows all activities in reverse chronological order
- Grouped by date
- Includes: DMs, Emails, Calls, Notes, System events
- Uses native platform icons (not emojis)

**B. Input Area (Bottom, Fixed)**
- Always visible at bottom of section
- Channel selector tabs
- Text input field
- Action buttons

### History Feed Components

| Element | Behavior |
|---------|----------|
| [All Activity ▾] | Filter dropdown: All, Calls only, Emails only, DMs only, Notes only |
| Date headers | Group activities by day |
| Activity icon | Native platform icon (IG, FB, LI, etc.) |
| Activity title | Action type + platform |
| Timestamp | Time of activity |
| Activity content | Note/message content (truncated with expand) |

### Activity Icons (Native, Not Emojis)

| Channel | Icon |
|---------|------|
| Instagram DM | Native Instagram icon |
| Facebook | Native Facebook icon |
| LinkedIn | Native LinkedIn icon |
| Email | Mail icon |
| Call | Phone icon |
| Walk-in | Location/person icon |
| Note | Document icon |
| System event | Gear icon |

### Input Area Components

| Element | Behavior |
|---------|----------|
| Channel tabs | [DM] [Email] [Call] [FB] [LI] [Walk-in] [Note] |
| Text input | Multi-line textarea for notes |
| [Schedule follow-up] | Opens date/time picker for next task |
| [Save Activity] | Saves activity and adds to history |

### Channel Tab Behavior

| Tab | On Click |
|-----|----------|
| DM | Pre-fills for Instagram DM logging |
| Email | Opens email composer (Gmail/Resend integration) |
| Call | Initiates Twilio WebRTC call |
| FB | Pre-fills for Facebook message logging |
| LI | Pre-fills for LinkedIn message logging |
| Walk-in | Pre-fills for in-person visit logging |
| Note | Default — just log a note |

### Schedule Follow-up

When clicked, shows inline options:

```
[1 hour] [Tomorrow] [End of day] [Next week] [Custom]

Note (optional): [_________________________________]
```

Selecting a time sets `next_task_date` on the lead.

---

## Interaction Flows

### Flow 1: Execute Strategy Step

1. User sees "Next: Day 3 - Send follow-up email" in Strategy section
2. User clicks [Execute →]
3. Page scrolls to Activity input
4. Email tab is auto-selected
5. Template content (if any) is pre-filled
6. User sends email
7. Activity logged, strategy advances to next step

### Flow 2: Log Manual Activity

1. User clicks desired channel tab (e.g., [Call])
2. User writes note about the call
3. (Optional) User clicks [Schedule follow-up] to set next task
4. User clicks [Save Activity]
5. Activity appears in history feed

### Flow 3: Log Reply (Status Change)

1. User clicks [Log Reply] in header
2. Reply activity is logged
3. Status automatically changes to "Replied"
4. Activity appears in history feed

### Flow 4: Assign Strategy (Status Change)

1. User clicks [Select Strategy] in empty Strategy section
2. User selects "Instagram Warm-up" from dropdown
3. Strategy is assigned
4. Status automatically changes to "In Progress"
5. Next step is displayed

### Flow 5: Edit Contact Information

1. User clicks on phone number
2. Field becomes editable input
3. User types new number
4. User clicks away or presses Enter
5. Change is saved automatically

### Flow 6: Add Missing Social Link

1. User sees gray Instagram button (no URL)
2. User clicks it
3. Inline input appears: "Instagram URL: [____________]"
4. User pastes URL
5. Button becomes colored/active

### Flow 7: Add Executive Summary

1. User clicks [Write Summary] or anywhere in empty summary area
2. Text area becomes editable
3. User types summary
4. User clicks away or presses save
5. Summary is saved

---

## Empty States

### No Activities Yet

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│                    No activity yet.                           │
│           Start your outreach using the form below!           │
│                                                               │
└───────────────────────────────────────────────────────────────┘

[DM] [Email] [Call] [FB] [LI] [Walk-in] [Note]
...
```

### No Strategy Assigned

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ STRATEGY    No strategy assigned           [Select Strategy] │
└─────────────────────────────────────────────────────────────────┘
```

### No Executive Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  EXECUTIVE SUMMARY                                              │
│                                                                 │
│  No summary yet. Click to add one, or let AI generate it.       │
│  [Write Summary]  [Generate with AI]                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
LeadDetail/
├── index.tsx                    # Main container, data fetching
├── LeadHeader.tsx               # Company info, status dropdown, actions
├── ContactSection.tsx           # Phone, email, social, Loom, summary (NEW)
│   ├── SocialButtons.tsx        # Native icon buttons
│   ├── LoomVideo.tsx            # Loom link management
│   └── ExecutiveSummary.tsx     # Summary with AI generation
├── StrategySection.tsx          # Strategy progress + next step
└── ActivityFeed.tsx             # History + input combined
    ├── ActivityHistory.tsx      # Scrollable history list
    ├── ActivityInput.tsx        # Channel tabs + textarea
    └── ScheduleFollowup.tsx     # Follow-up picker
```

### Removed Components (from original)

- `SchedulePanel.tsx` → Merged into ActivityFeed
- `ActivityComposer.tsx` → Merged into ActivityFeed  
- `LeadDetailsPanel.tsx` → Removed (info in Header + ContactSection)
- `NotesPanel.tsx` → Removed (notes in ActivityHistory)
- `QuickContactDock.tsx` → Replaced by ContactSection
- Status stepper → Replaced by status dropdown

---

## Data Model

### Schema Updates Required

**leads table** — Add columns:
```sql
ALTER TABLE leads ADD COLUMN loom_video_url TEXT;
ALTER TABLE leads ADD COLUMN executive_summary TEXT;
```

### Existing Tables Used

| Table | Usage |
|-------|-------|
| `leads` | Company info, contact details, social URLs, strategy assignment, status |
| `activities` | Activity history (all types including notes) |
| `call_records` | Call details (merged into activity display) |
| `strategies` | Strategy definitions and steps |

### Key Queries

```typescript
// Lead data
useLeadQuery(leadId)

// Unified activity history (activities + calls merged)
useUnifiedActivityHistory(leadId)

// Strategy with steps
useStrategyQuery(strategyId)
```

---

## Responsive Behavior

### Desktop (> 768px)
- Full layout as specified
- Activity section has max-height with scroll

### Tablet (768px)
- Same layout, slightly reduced padding
- Social buttons may wrap to 2 rows

### Mobile (< 640px)
- Full width single column
- Header actions stack or become icon-only
- Channel tabs scroll horizontally

---

## Implementation Checklist

### Phase 1: Structure
- [ ] Create new single-column layout container
- [ ] Implement LeadHeader with inline editing + status dropdown
- [ ] Remove status stepper component
- [ ] Implement ContactSection with inline editing

### Phase 2: Contact Section
- [ ] Build SocialButtons with native platform icons
- [ ] Implement gray/active states for social buttons
- [ ] Add LoomVideo component
- [ ] Add ExecutiveSummary component with AI generation option

### Phase 3: Activity Feed
- [ ] Create combined ActivityFeed component
- [ ] Merge activity + call_records into unified history
- [ ] Use native icons (not emojis) for activity types
- [ ] Implement channel tabs with appropriate actions
- [ ] Add Schedule follow-up inline picker

### Phase 4: Status Automation
- [ ] Wire [Log Reply] to auto-set status to "Replied"
- [ ] Wire strategy assignment to auto-set status to "In Progress"
- [ ] Implement status dropdown with all options

### Phase 5: Integrations
- [ ] Connect [Execute →] to auto-scroll + tab selection
- [ ] Wire up Twilio call initiation from Call tab
- [ ] Wire up email composer from Email tab
- [ ] Implement strategy auto-advance on matching activity

### Phase 6: Polish
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsive adjustments

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Sections | 11 | 4 |
| Columns | 2 (split view) | 1 (single column) |
| Places phone appears | 2 | 1 |
| Places to log activity | 2 | 1 |
| Strategy selectors | 2 | 1 |
| Status UI | Horizontal stepper (large) | Dropdown (compact) |
| Loom video | Separate card | Inline in Contact |
| Executive summary | Missing | Added to Contact |

**Result:** Clean, simple, no redundancy. Optimized for non-technical users who need clarity over density.
