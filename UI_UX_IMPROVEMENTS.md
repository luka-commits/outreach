# Outbound Pilot UI/UX Improvement Plan

A comprehensive audit of UI and UX improvements, prioritized by impact and effort.

## Implementation Progress

| # | Item | Status | Files Created/Modified |
|---|------|--------|------------------------|
| 9 | Design tokens | ✅ Done | `lib/designTokens.ts` |
| 6 | Button component | ✅ Done | `components/ui/Button.tsx` |
| 7 | Modal component | ✅ Done | `components/ui/Modal.tsx` |
| 8 | Input component | ✅ Done | `components/ui/Input.tsx` |
| 1 | Skeleton loaders | ✅ Done | `components/ui/Skeleton.tsx`, `components/LeadList.tsx` |
| 2 | Empty states | ✅ Done | `components/ui/EmptyState.tsx`, `components/LeadList.tsx` |
| 5 | Keyboard shortcuts | ✅ Done | `hooks/useKeyboardShortcuts.ts`, `components/ui/KeyboardShortcutsHelp.tsx` |
| 3 | Bulk undo | ✅ Done | `components/Toast.tsx` (with progress bar + undo button) |

### High-Leverage Features (Tier 1)
| # | Feature | Status | Files Created/Modified |
|---|---------|--------|------------------------|
| 1 | Lead Tags/Labels | ✅ Done | Migration, `types.ts`, `services/supabase.ts`, `hooks/queries/useLeadTagsQuery.ts`, `components/LeadDetail/TagEditor.tsx` |
| 2 | Lead Notes | ✅ Done | Migration, `types.ts`, `services/supabase.ts`, `hooks/queries/useLeadNotesQuery.ts`, `components/LeadDetail/NotesPanel.tsx` |
| 3 | Reply/Response Tracking | ✅ Done | Migration (direction field), `types.ts`, `components/LogReplyModal.tsx`, `components/LeadDetail/ActivityFeed.tsx` |
| 4 | Call Transcripts Display | ✅ Done | `components/LeadDetail/CallRecordCard.tsx`, `components/LeadDetail/CallHistoryPanel.tsx` |
| 5 | Full Dataset Export | ✅ Done | `services/supabase.ts` (exportAllLeads), `components/ExportModal.tsx` |
| 6 | Task Rescheduling | ✅ Done | `components/RescheduleModal.tsx`, `components/TaskQueue.tsx` |
| 7 | Lead Scoring | ✅ Done | `utils/leadScoring.ts`, `components/LeadScoreBadge.tsx`, `components/LeadList.tsx`, `components/LeadDetail/LeadHeader.tsx` |
| 8 | Bulk Field Updates | ✅ Done | `components/BulkEditModal.tsx`, `services/supabase.ts` (bulkUpdateLeadFields), `components/LeadList.tsx` |
| 9 | Call Outcome Analytics | ✅ Done | `components/Reporting.tsx` (Call Analytics section) |
| 10 | Strategy Performance Analytics | ✅ Done | `types.ts` (StrategyPerformance), `services/supabase.ts`, `hooks/queries/useStrategyPerformanceQuery.ts`, `components/Reporting.tsx` |

### Bug Fixes Applied
- Fixed `bulkDelete`, `bulkUpdateStatus`, `bulkAssignStrategy` in `LeadList.tsx` - now properly called with `.mutate()`

## Alignment with CLAUDE.md Principles

All improvements follow the CLAUDE.md guidelines:
- **User isolation**: No changes affect user_id filtering or RLS
- **Scale considerations**: Virtual scrolling and pagination for large datasets
- **Error handling**: Visible feedback via `showToast()`, no silent failures
- **No over-engineering**: Each improvement is directly needed, not speculative
- **Protect existing functionality**: Additions/refactors, no breaking changes

---

## Priority 1: Critical UX Wins (High Impact, Reasonable Effort)

### 1. Add Skeleton Loaders & Loading States
**Problem:** No visual feedback during pagination or data fetching - users don't know if app is loading or broken.
**Solution:**
- Add skeleton components for LeadList rows during page transitions
- Show skeleton cards in Dashboard while stats load
- Add loading indicator on filter/sort changes
**Files:** `components/LeadList.tsx`, `components/Dashboard.tsx`, new `components/Skeleton.tsx`
**Impact:** High - perceived performance improvement

### 2. Empty States with Actions
**Problem:** Empty lists show nothing or generic text. Users don't know what to do.
**Solution:**
- Empty pipeline: "No leads yet" + prominent "Import CSV" and "Find Leads" buttons
- Empty tasks: "All caught up! No tasks for today" with celebration icon
- No activities: "No activity logged yet - complete your first outreach"
- No strategies: "Create your first sequence" with quick-start template
**Files:** `components/LeadList.tsx`, `components/TaskQueue.tsx`, `components/Dashboard.tsx`, `components/StrategyManager.tsx`
**Impact:** High - reduces confusion, drives activation

### 3. Bulk Operation Feedback & Undo
**Problem:** Bulk actions have no success feedback and can't be undone.
**Solution:**
- Show success toast: "5 leads deleted" with "Undo" button
- Keep deleted items in memory for 5 seconds
- Show progress for large operations (10+ items)
**Files:** `hooks/queries/useLeadsPaginated.ts`, `components/LeadList.tsx`, `components/Toast.tsx`
**Impact:** High - prevents data loss anxiety

### 4. Fix Next/Prev Navigation in Lead Detail
**Problem:** Users must go back to list, scroll, find next lead, click again.
**Solution:**
- Fetch lightweight ID list matching current filters
- Enable Next/Prev buttons in LeadDetail header
- Keyboard shortcuts: `j`/`k` for next/prev
**Files:** `components/LeadDetail/index.tsx`, `components/LeadDetail/LeadHeader.tsx`, `contexts/NavigationContext.tsx`
**Impact:** High - major workflow efficiency gain

### 5. Keyboard Shortcuts
**Problem:** Power users can't navigate efficiently without mouse.
**Solution:**
- `Escape` - close modals, go back
- `n` - new lead
- `s` - search/filter focus
- `?` - show shortcut help
- Number keys `1-5` in TaskQueue to complete with quick outcomes
**Files:** New `hooks/useKeyboardShortcuts.ts`, `App.tsx`
**Impact:** High - workflow efficiency for power users

---

## Priority 2: Visual Consistency (Medium-High Impact)

### 6. Standardize Button Variants
**Problem:** Buttons use inconsistent styles (bg-indigo-600, bg-slate-900, varying radii).
**Solution:** Create standard variants:
- Primary: `bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl`
- Secondary: `bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl`
- Danger: `bg-rose-600 hover:bg-rose-700 text-white rounded-xl`
- Ghost: `hover:bg-slate-100 text-slate-600 rounded-xl`
**Files:** New `components/Button.tsx`, then update all button usages
**Impact:** Medium-High - professional, cohesive feel

### 7. Standardize Modal Styling
**Problem:** Modals use different z-index (50-150), border radius (2.5rem-3rem), shadows.
**Solution:**
- Single `Modal` wrapper component with consistent styling
- z-index: 100 for all modals, 200 for toasts
- border-radius: 2rem, consistent padding (p-8)
- Backdrop: `bg-black/40 backdrop-blur-sm`
**Files:** New `components/Modal.tsx`, refactor: `ConfirmModal.tsx`, `BulkStatusModal.tsx`, `BulkStrategyModal.tsx`, `LeadAddForm.tsx`
**Impact:** Medium - visual polish

### 8. Form Input Component
**Problem:** Input styles scattered with inconsistent padding, icon alignment, focus states.
**Solution:** Unified `Input` component:
- Consistent icon positioning (left-5)
- Focus ring: `focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400`
- Standard padding: `pl-14 pr-6 py-4`
- Border radius: `rounded-2xl`
**Files:** New `components/Input.tsx`, refactor form components
**Impact:** Medium - faster form development, consistency

### 9. Design Tokens / Constants
**Problem:** Colors, spacing, radii hardcoded throughout - inconsistent usage.
**Solution:** Create `lib/designTokens.ts`:
```typescript
export const colors = { primary: 'indigo', danger: 'rose', success: 'emerald', warning: 'amber' };
export const radius = { sm: 'rounded-lg', md: 'rounded-xl', lg: 'rounded-2xl', xl: 'rounded-3xl' };
export const shadows = { sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg' };
```
**Files:** New `lib/designTokens.ts`, gradual adoption
**Impact:** Medium - maintainability, consistency

---

## Priority 3: Performance Feel (Medium Impact)

### 10. Optimistic Updates for All Mutations
**Problem:** Some mutations wait for server response before updating UI.
**Solution:**
- Activity creation: show immediately in feed
- Strategy assignment: show badge update instantly
- Status change: update list row immediately
**Files:** `hooks/queries/useActivityMutations.ts`, `hooks/queries/useLeadsPaginated.ts`
**Impact:** Medium-High - app feels snappier

### 11. Virtualized Lead List
**Problem:** With 500+ leads on a page, DOM becomes heavy.
**Solution:**
- Use `@tanstack/react-virtual` (already installed)
- Virtualize LeadList table rows
- Keep header fixed during scroll
**Files:** `components/LeadList.tsx`
**Impact:** Medium - noticeable for large datasets

### 12. Prefetch Adjacent Data
**Problem:** Clicking next page waits for fetch.
**Solution:**
- Prefetch next page when hovering pagination button
- Prefetch lead detail when hovering list row (low priority)
**Files:** `components/LeadList.tsx`, `hooks/queries/useLeadsPaginated.ts`
**Impact:** Medium - perceived instant navigation

### 13. Transition Animations
**Problem:** View changes are instant/jarring.
**Solution:**
- Fade transitions between views (150ms)
- Slide-in for modals (200ms)
- Scale-up for toasts
**Files:** `components/ViewRouter.tsx`, `components/Modal.tsx`, `components/Toast.tsx`
**Impact:** Medium - polished feel

---

## Priority 4: Workflow Improvements (Medium Impact)

### 14. Quick Actions in Lead List
**Problem:** To change status or log activity, must open lead detail.
**Solution:**
- Hover row shows quick action icons
- One-click status change dropdown
- Quick "Log Call" / "Log DM" buttons
**Files:** `components/LeadList.tsx`
**Impact:** Medium-High - major time saver

### 15. Inline Editing in Lead List
**Problem:** To edit company name or contact, must open detail view.
**Solution:**
- Double-click cell to edit inline
- Enter to save, Escape to cancel
- Tab to move to next editable cell
**Files:** `components/LeadList.tsx`, `components/InlineEditCell.tsx` (new)
**Impact:** Medium - efficiency for data cleanup

### 16. TaskQueue Processing Improvements
**Problem:** Processing mode has too many clicks to complete a task.
**Solution:**
- Auto-advance to next task after completion
- Quick outcome buttons (Connected, Voicemail, No Answer, Not Interested)
- Swipe gestures on mobile for complete/skip
**Files:** `components/TaskQueue.tsx`
**Impact:** Medium-High - daily workflow efficiency

### 17. Batch Mode for TaskQueue
**Problem:** Session mode adds cognitive load without clear benefit.
**Solution:**
- Remove session mode, simplify to List/Processing toggle
- Add "focus mode" that hides sidebar for distraction-free processing
- Add task count progress: "3 of 12 completed"
**Files:** `components/TaskQueue.tsx`
**Impact:** Medium - reduced complexity

### 18. Global Search with Command Palette
**Problem:** Search only works within current view.
**Solution:**
- `Cmd+K` opens command palette
- Search across leads, strategies, recent activities
- Quick actions: "New lead", "Go to settings", "Import CSV"
**Files:** New `components/CommandPalette.tsx`, `App.tsx`
**Impact:** Medium-High - power user efficiency

---

## Priority 5: Information Architecture (Medium Impact)

### 19. Dashboard Improvements
**Problem:** Dashboard shows activity rings but lacks actionable insights.
**Solution:**
- Add "Needs Attention" section: overdue tasks, leads without strategy
- Show conversion funnel: Not Contacted → In Progress → Qualified
- Add "Quick Stats": response rate, avg time to qualified
**Files:** `components/Dashboard.tsx`
**Impact:** Medium - better decision making

### 20. Activity Feed Improvements
**Problem:** Activity feed is just a list - hard to see patterns.
**Solution:**
- Group activities by date with headers
- Show activity type icons for quick scanning
- Add "filter by type" toggle
- Collapse consecutive activities of same type
**Files:** `components/LeadDetail/ActivityFeed.tsx`
**Impact:** Medium - easier history review

### 21. Lead Detail Header Improvements
**Problem:** Key info buried - must scroll to see status, strategy, next task.
**Solution:**
- Sticky header with: company name, status badge, strategy badge, next task date
- Channel availability icons always visible
- Quick action buttons (call, email, DM) in header
**Files:** `components/LeadDetail/LeadHeader.tsx`, `components/LeadDetail/index.tsx`
**Impact:** Medium - faster context

---

## Priority 6: Error Handling & Edge Cases (Medium Impact)

### 22. Specific Error Messages
**Problem:** All errors show generic "Failed to update lead".
**Solution:**
- Map Supabase error codes to user-friendly messages
- Show field-level validation errors inline
- Network errors: "Connection lost - changes will save when back online"
**Files:** `services/supabase.ts`, `components/Toast.tsx`, form components
**Impact:** Medium - reduces support burden

### 23. Offline Indicator
**Problem:** No indication when offline - actions silently fail.
**Solution:**
- Show banner when offline: "You're offline - changes will sync when reconnected"
- Queue mutations for retry
- Visual indicator on data that's pending sync
**Files:** New `hooks/useOnlineStatus.ts`, `App.tsx`, `components/OfflineBanner.tsx`
**Impact:** Medium - trust & reliability

### 24. Confirmation for Destructive Actions
**Problem:** Some destructive actions lack confirmation or have inconsistent confirm flows.
**Solution:**
- All deletes require confirmation with item count
- Terminal status changes show warning about Auto-Stop
- Bulk strategy assignment shows "This will reset progress"
**Files:** Already partially done - audit all mutation calls
**Impact:** Medium - prevents accidents

---

## Priority 7: Mobile Experience (Medium Impact)

### 25. Mobile-Optimized Lead List
**Problem:** Table not ideal on mobile - horizontal scroll required.
**Solution:**
- Card view on mobile (< 768px)
- Each card shows: company, contact, status badge, channel icons
- Tap to expand, long-press for actions
**Files:** `components/LeadList.tsx`, new `components/LeadCard.tsx`
**Impact:** Medium-High - mobile usability

### 26. Pull-to-Refresh
**Problem:** No way to manually refresh data on mobile.
**Solution:**
- Pull-to-refresh on list views
- Show refresh indicator
- Trigger query invalidation
**Files:** `components/LeadList.tsx`, `components/TaskQueue.tsx`, `components/Dashboard.tsx`
**Impact:** Medium - expected mobile pattern

### 27. Mobile Bottom Sheet Actions
**Problem:** Modal popups awkward on mobile.
**Solution:**
- Convert modals to bottom sheets on mobile
- Drag to dismiss
- Native-feeling interactions
**Files:** `components/Modal.tsx` (responsive behavior)
**Impact:** Medium - mobile polish

---

## Priority 8: Accessibility (Important but Lower Urgency)

### 28. ARIA Labels & Roles
**Problem:** Screen readers can't navigate effectively.
**Solution:**
- Add `aria-label` to icon buttons
- Use `role="dialog"` for modals
- Add `aria-live="polite"` for toasts
- Proper heading hierarchy
**Files:** All interactive components
**Impact:** Medium - inclusivity

### 29. Focus Management
**Problem:** Focus doesn't move to modal when opened, doesn't return when closed.
**Solution:**
- Trap focus inside open modals
- Return focus to trigger element on close
- Focus first input in forms
**Files:** `components/Modal.tsx`, form components
**Impact:** Medium - accessibility requirement

### 30. Color Contrast Audit
**Problem:** Some text/background combinations may not meet WCAG guidelines.
**Solution:**
- Audit all color combinations
- Ensure 4.5:1 contrast ratio for text
- Don't rely solely on color for meaning
**Files:** Throughout - mainly status badges, form labels
**Impact:** Medium - accessibility compliance

---

## Quick Wins (Low Effort, Immediate Polish)

### 31. Hover States Everywhere
- Add subtle hover background to all clickable rows
- Hover state on sidebar nav items
- Button hover transitions (150ms)

### 32. Loading Button States
- Disable and show spinner on buttons during mutations
- Prevent double-submission

### 33. Character Counters
- Show remaining characters for textarea fields with limits
- Template editor in strategies

### 34. Tooltips for Icon Buttons
- Add title/tooltip to all icon-only buttons
- Especially in LeadList action column

### 35. Better Date Display
- "Today", "Yesterday", "2 days ago" instead of raw dates
- Full date on hover

---

## Implementation Order Recommendation

**Week 1 - Foundation:**
1. Design tokens / constants (enables consistency)
2. Button component (most reused)
3. Modal component (standardize all modals)
4. Input component

**Week 2 - Critical UX:**
5. Skeleton loaders
6. Empty states
7. Specific error messages
8. Bulk operation feedback/undo

**Week 3 - Workflow:**
9. Keyboard shortcuts
10. Next/Prev navigation
11. Quick actions in list
12. TaskQueue processing improvements

**Week 4 - Polish:**
13. Transitions/animations
14. Command palette
15. Dashboard improvements
16. Mobile optimizations

**Ongoing:**
- Accessibility improvements
- Performance optimizations
- Quick wins as opportunities arise

---

## Files Most Frequently Modified

| File | Changes |
|------|---------|
| `components/LeadList.tsx` | Quick actions, inline edit, virtualization, mobile cards, skeleton |
| `components/TaskQueue.tsx` | Processing improvements, simplified modes |
| `components/Dashboard.tsx` | Empty states, skeleton, insights section |
| `components/LeadDetail/` | Next/prev nav, sticky header, activity feed improvements |
| `components/Toast.tsx` | Undo functionality, better styling |
| New `components/Button.tsx` | Standard button variants |
| New `components/Modal.tsx` | Standard modal wrapper |
| New `components/Input.tsx` | Standard input component |
| New `components/Skeleton.tsx` | Loading states |
| New `components/CommandPalette.tsx` | Global search |
| New `hooks/useKeyboardShortcuts.ts` | Keyboard navigation |

---

## Success Metrics

- **Time to complete daily tasks** - should decrease 20-30%
- **Clicks to common actions** - reduce by 50% with keyboard shortcuts and quick actions
- **User-reported confusion** - fewer "where do I..." questions
- **Mobile session duration** - increase with better mobile UX
- **Error recovery** - fewer support tickets from accidental deletions
