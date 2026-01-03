# OutboundPilot Visual Polish Guide
## Making Your CRM Look Professional

**Goal:** Transform OutboundPilot's visual aesthetic to match the polished, professional look of enterprise CRMs like Instantly, Close, and Linear — without changing any component structure or layout.

---

## Design Tokens Reference

### Border System
```css
/* REPLACE all standard borders with hairline borders */

OLD: border border-gray-300
NEW: border border-gray-200/50

OLD: border-2 border-gray-400
NEW: border border-slate-200

OLD: divide-y divide-gray-200
NEW: divide-y divide-gray-100

/* Card/Container borders */
border border-gray-200/60

/* Input borders */
border border-gray-200 focus:border-blue-500/50

/* Sidebar borders */
border-r border-gray-100
```

### Shadow System (Elevation)
```css
/* Replace current shadows with these elevation levels */

/* Level 1 - Subtle lift (cards, dropdowns) */
shadow-sm
/* Equivalent: 0 1px 2px 0 rgba(0, 0, 0, 0.05) */

/* Level 2 - Medium elevation (modals, popovers) */
shadow-md
/* Equivalent: 0 4px 6px -1px rgba(0, 0, 0, 0.1) */

/* Level 3 - High elevation (floating action buttons) */
shadow-lg
/* Equivalent: 0 10px 15px -3px rgba(0, 0, 0, 0.1) */

/* REMOVE heavy shadows like shadow-xl or shadow-2xl */
```

### Border Radius System
```css
/* Increase all border radius for modern feel */

OLD: rounded
NEW: rounded-lg (8px)

OLD: rounded-lg
NEW: rounded-xl (12px)

/* Buttons */
rounded-lg (8px)

/* Cards/Containers */
rounded-xl (12px)

/* Small elements (badges, pills) */
rounded-full
```

### Background Colors
```css
/* App Background (body/main container) */
bg-gray-50

/* Card/Panel Background */
bg-white

/* Sidebar Background */
bg-white border-r border-gray-100

/* Hover states */
hover:bg-gray-50

/* Active/Selected states */
bg-blue-50 text-blue-700
```

### Typography (Inter Font)
```css
/* Headings */
font-semibold tracking-tight text-gray-900

/* Page Title (h1) */
text-2xl font-semibold tracking-tight text-gray-900

/* Section Title (h2) */
text-lg font-semibold tracking-tight text-gray-900

/* Card Title (h3) */
text-base font-semibold text-gray-900

/* Body Text */
text-sm text-gray-600

/* Labels */
text-xs font-medium text-gray-700 uppercase tracking-wide

/* Links */
text-blue-600 hover:text-blue-700 font-medium

/* Muted Text */
text-gray-500 text-sm
```

---

## Component-Specific Updates

### 1. Pipeline Table (LeadList.tsx)

**Current Issues:**
- Heavy borders between rows
- Too much visual weight
- Lacks elevation

**Updates:**
```tsx
// Container
OLD: <div className="bg-white rounded-lg shadow">
NEW: <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm">

// Table Header
OLD: <th className="border-b border-gray-200 px-4 py-3">
NEW: <th className="border-b border-gray-100 px-4 py-3 text-xs font-medium text-gray-700 uppercase tracking-wide">

// Table Rows
OLD: <tr className="border-b border-gray-200 hover:bg-gray-50">
NEW: <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">

// Table Cells
OLD: <td className="px-4 py-3 text-sm">
NEW: <td className="px-4 py-3 text-sm text-gray-600">
```

### 2. Cards (Dashboard, Overview)

**Current Issues:**
- Need subtle elevation
- Borders too heavy
- Rounded corners too small

**Updates:**
```tsx
// Stat Cards
OLD: <div className="bg-white rounded-lg border border-gray-200 p-6">
NEW: <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm hover:shadow-md transition-shadow">

// Card Title
OLD: <h3 className="text-lg font-bold">
NEW: <h3 className="text-lg font-semibold tracking-tight text-gray-900">

// Card Subtitle/Description
OLD: <p className="text-gray-600">
NEW: <p className="text-sm text-gray-500">
```

### 3. Sidebar Navigation

**Current Issues:**
- Needs more subtle separation
- Active states too bold
- Spacing could be tighter

**Updates:**
```tsx
// Sidebar Container
OLD: <aside className="bg-gray-50 border-r border-gray-200">
NEW: <aside className="bg-white border-r border-gray-100">

// Navigation Items (inactive)
OLD: <button className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
NEW: <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">

// Navigation Items (active)
OLD: <button className="flex items-center px-4 py-2 bg-blue-500 text-white">
NEW: <button className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 font-medium rounded-lg">

// Section Headers in Sidebar
OLD: <div className="px-4 py-2 text-xs font-bold uppercase text-gray-500">
NEW: <div className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500">
```

### 4. Buttons

**Current Issues:**
- Need more refined hover states
- Could use subtle shadows
- Radius should be consistent

**Updates:**
```tsx
// Primary Button
OLD: <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
NEW: <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-700 hover:shadow transition-all">

// Secondary Button
OLD: <button className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50">
NEW: <button className="border border-gray-200 bg-white px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all">

// Danger Button
OLD: <button className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
NEW: <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-red-700 hover:shadow transition-all">

// Icon-only Button
OLD: <button className="p-2 hover:bg-gray-100 rounded">
NEW: <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-600 hover:text-gray-900 transition-colors">
```

### 5. Input Fields

**Current Issues:**
- Borders too prominent
- Focus states could be softer
- Need better spacing

**Updates:**
```tsx
// Text Input
OLD: <input className="border border-gray-300 rounded px-3 py-2 w-full focus:border-blue-500">
NEW: <input className="border border-gray-200 rounded-lg px-3 py-2 w-full text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 transition-colors">

// Label
OLD: <label className="block text-sm font-medium text-gray-700 mb-1">
NEW: <label className="block text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">

// Input with Icon
<div className="relative">
  <input className="pl-10 border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10">
  <Icon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
</div>
```

### 6. Badges/Pills (Status, Strategy Tags)

**Current Issues:**
- Too bold/heavy
- Need softer backgrounds
- Better color system

**Updates:**
```tsx
// Status Badges
OLD: <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs">
NEW: <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-medium border border-green-200/50">

// Strategy Pills (currently purple)
OLD: <span className="bg-purple-600 text-white px-3 py-1.5 rounded-full text-sm">
NEW: <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium border border-blue-200/50">

// Color Mapping for Status Badges
Qualified: bg-green-50 text-green-700 border-green-200/50
In Progress: bg-blue-50 text-blue-700 border-blue-200/50
Not Contacted: bg-gray-50 text-gray-700 border-gray-200/50
Replied: bg-purple-50 text-purple-700 border-purple-200/50
Disqualified: bg-red-50 text-red-700 border-red-200/50
```

### 7. Modals/Dialogs

**Current Issues:**
- Need better elevation
- Could use softer backdrop
- Header styling needs refinement

**Updates:**
```tsx
// Modal Backdrop
OLD: <div className="fixed inset-0 bg-black bg-opacity-50">
NEW: <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm">

// Modal Container
OLD: <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg">
NEW: <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg border border-gray-100">

// Modal Header
OLD: <h2 className="text-xl font-bold mb-4">
NEW: <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-4">

// Modal Close Button
OLD: <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700">
NEW: <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg transition-colors">
```

### 8. Dropdown Menus

**Current Issues:**
- Need subtle elevation
- Better spacing needed
- Hover states too heavy

**Updates:**
```tsx
// Dropdown Container
OLD: <div className="absolute bg-white border border-gray-200 rounded shadow-lg mt-2">
NEW: <div className="absolute bg-white border border-gray-200/60 rounded-xl shadow-lg mt-2 py-1">

// Dropdown Items
OLD: <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">
NEW: <button className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg mx-1 transition-colors">

// Divider
OLD: <div className="border-t border-gray-200 my-2">
NEW: <div className="border-t border-gray-100 my-1">
```

### 9. Data Tables (Activities, Call Records)

**Current Issues:**
- Row borders too heavy
- Need better hover states
- Header styling can be refined

**Updates:**
```tsx
// Table Container
OLD: <table className="w-full">
NEW: <table className="w-full">

// Table Header Row
OLD: <thead className="bg-gray-50 border-b border-gray-200">
NEW: <thead className="bg-gray-50/50 border-b border-gray-100">

// Table Header Cell
OLD: <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
NEW: <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">

// Table Body Row
OLD: <tr className="border-b border-gray-200 hover:bg-gray-50">
NEW: <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">

// Empty State
OLD: <div className="text-center py-12 text-gray-500">
NEW: <div className="text-center py-12 text-sm text-gray-500">
```

### 10. Form Sections

**Current Issues:**
- Section dividers too heavy
- Need better hierarchy
- Spacing could be refined

**Updates:**
```tsx
// Section Container
OLD: <div className="border-b border-gray-200 pb-6 mb-6">
NEW: <div className="border-b border-gray-100 pb-6 mb-6 last:border-0">

// Section Title
OLD: <h3 className="text-lg font-bold mb-4">
NEW: <h3 className="text-base font-semibold tracking-tight text-gray-900 mb-4">

// Section Description
OLD: <p className="text-gray-600 mb-4">
NEW: <p className="text-sm text-gray-500 mb-4">
```

---

## Page-Specific Updates

### Dashboard (Weekly Momentum)

```tsx
// Page Title
OLD: <h1 className="text-3xl font-bold">Weekly Momentum</h1>
NEW: <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Weekly Momentum</h1>

// Subtitle
OLD: <p className="text-gray-600">Your growth pulse across every channel.</p>
NEW: <p className="text-sm text-gray-500 mt-1">Your growth pulse across every channel.</p>

// Stat Card Grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="bg-white rounded-xl border border-gray-200/60 p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-50 rounded-lg">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Today's Tasks</h3>
    </div>
    <div className="text-3xl font-semibold tracking-tight text-gray-900">3</div>
    <p className="text-sm text-gray-500 mt-1">leads need action</p>
  </div>
</div>
```

### Pipeline Table

```tsx
// Remove heavy alternating row backgrounds
// Use subtle hover instead

<tbody>
  <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/20" />
        <span className="text-sm font-medium text-gray-900">Li Architect Associate PLLC</span>
      </div>
    </td>
    <td className="px-4 py-3 text-sm text-gray-600">Flushing</td>
    <td className="px-4 py-3 text-sm text-gray-600">Architect</td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium text-gray-900">5.0</span>
        <span className="text-xs text-gray-500">TRUST</span>
      </div>
    </td>
    <td className="px-4 py-3">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
        MULTI-CHANNEL 6
      </span>
    </td>
    <td className="px-4 py-3">
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200/50">
        QUALIFIED
      </span>
    </td>
  </tr>
</tbody>
```

---

## Global CSS Updates

Add to your main CSS file (likely `index.css` or `App.css`):

```css
/* Ensure Inter font is loaded */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

/* Apply globally */
* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Tighten letter spacing on headings */
h1, h2, h3, h4, h5, h6 {
  letter-spacing: -0.02em;
}

/* Scrollbar styling for modern look */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #E2E8F0;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #CBD5E1;
}

/* Focus ring for accessibility */
*:focus-visible {
  outline: 2px solid #3B82F6;
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## Tailwind Config Updates

Update `tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.02em',
      },
      colors: {
        // Your brand colors
        pilot: {
          blue: '#0066CC',
          slate: '#1E293B',
        },
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
```

---

## Implementation Strategy

### Phase 1: Foundation (Do First)
1. Update global CSS (fonts, scrollbars)
2. Update Tailwind config
3. Set app background to `bg-gray-50`
4. Update all card containers to use new shadow/border system

### Phase 2: Core Components
1. Update buttons across the app
2. Update form inputs
3. Update badges/pills
4. Update navigation sidebar

### Phase 3: Page-Specific
1. Pipeline table
2. Dashboard cards
3. Lead detail views
4. Modals and dropdowns

### Phase 4: Polish
1. Hover states and transitions
2. Empty states
3. Loading states
4. Toast notifications

---

## Quick Reference: Common Replacements

| Old Class | New Class |
|-----------|-----------|
| `border-gray-300` | `border-gray-200/60` |
| `rounded` | `rounded-lg` |
| `rounded-lg` | `rounded-xl` |
| `shadow` | `shadow-sm` |
| `font-bold` | `font-semibold tracking-tight` |
| `bg-gray-50` (sidebar) | `bg-white` |
| `bg-white` (app background) | `bg-gray-50` |
| `text-gray-700` (body) | `text-gray-600` |
| `text-gray-900` (keep) | `text-gray-900` |
| `hover:bg-gray-100` | `hover:bg-gray-50 transition-colors` |

---

## Testing Checklist

After applying changes:

- [ ] All pages render without layout shifts
- [ ] Text remains readable (contrast check)
- [ ] Hover states feel responsive
- [ ] Focus states are visible for accessibility
- [ ] Mobile view still works
- [ ] Dark borders are replaced with hairlines
- [ ] Cards have subtle elevation
- [ ] Typography hierarchy is clear
- [ ] Spacing feels balanced
- [ ] Overall feel is "cleaner" and more professional

---

**Questions or Issues?**
If something doesn't look right after applying these changes, the most common issues are:
1. Forgetting to update the app background to `bg-gray-50`
2. Not replacing ALL instances of old border classes
3. Missing the font import in CSS
4. Not applying transitions to hover states
