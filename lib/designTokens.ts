/**
 * Design Tokens for Outbound Pilot
 * Centralized constants for consistent styling across the app.
 *
 * Design Philosophy: Professional CRM aesthetic
 * - Clean, minimal visual weight
 * - Brand colors: Navy (#0F172A), Pilot Blue (#3B82F6), Soft Slate (#F8FAFC)
 * - Hairline borders, shadows only on hover/elevation
 * - Social media channels keep their brand colors
 * - Everything else uses brand palette
 */

// Brand colors - use these Tailwind classes
export const brandColors = {
  navy: 'text-navy',           // #0F172A - headings, trust elements
  pilotBlue: 'text-pilot-blue', // #3B82F6 - icons, accents, links, CTAs
  softSlate: 'bg-soft-slate',   // #F8FAFC - app background
} as const;

// Color palette - semantic names mapped to Tailwind colors
export const colors = {
  primary: 'pilot-blue',  // CTA/accent color (brand)
  danger: 'rose',
  success: 'emerald',     // Keep for semantic meaning
  warning: 'amber',       // Keep for semantic meaning
  info: 'pilot-blue',
  neutral: 'slate',
} as const;

// Border radius classes - increased for modern feel
export const radius = {
  none: 'rounded-none',  // 0
  xs: 'rounded-md',      // 6px - badges, pills (was 4px)
  sm: 'rounded-lg',      // 8px - buttons, inputs (was 6px)
  md: 'rounded-xl',      // 12px - cards, modals, panels (was 8px)
  full: 'rounded-full',  // avatars, icon buttons only
} as const;

// Shadow classes - shadows are earned (only on hover/elevation)
export const shadows = {
  none: 'shadow-none',
  sm: 'shadow-sm',       // dropdowns
  md: 'shadow-md',       // modals, elevated panels, cards on hover
  lg: 'shadow-lg',       // special emphasis
} as const;

// Border styles - hairline borders for modern feel
export const borders = {
  card: 'border border-gray-200/60',      // cards, containers
  divider: 'border-gray-100',             // section dividers
  input: 'border border-gray-200',        // form inputs
  inputFocus: 'border-pilot-blue/50',     // input focus state
  tableRow: 'border-b border-gray-50',    // table rows
} as const;

// Z-index scale for layering
export const zIndex = {
  dropdown: 'z-40',
  sticky: 'z-50',
  modal: 'z-[100]',
  toast: 'z-[200]',
} as const;

// Spacing scale (for reference - use Tailwind classes directly)
export const spacing = {
  xs: '2',   // 8px
  sm: '3',   // 12px
  md: '4',   // 16px
  lg: '6',   // 24px
  xl: '8',   // 32px
  '2xl': '10', // 40px
  '3xl': '12', // 48px
} as const;

// Animation durations
export const transitions = {
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  slower: 'duration-500',
} as const;

// Button variant styles - solid Pilot Blue for primary, clean secondary
export const buttonVariants = {
  primary: 'bg-pilot-blue hover:bg-pilot-blue/90 text-white shadow-sm hover:shadow active:scale-[0.98]',
  secondary: 'bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow active:scale-[0.98]',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-gray-50 text-gray-600',
  outline: 'bg-transparent border border-gray-200 hover:bg-gray-50 text-gray-700',
  // Special gradient variant for landing page CTAs only
  gradient: 'bg-gradient-to-r from-pilot-blue to-pilot-gradient text-white shadow-sm hover:shadow-md active:scale-[0.98]',
} as const;

// Button size styles
export const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-base',
} as const;

// Input styles - lighter borders, softer focus
export const inputStyles = {
  base: 'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-150',
  focus: 'focus:border-pilot-blue/50 focus:ring-2 focus:ring-pilot-blue/10 focus:outline-none',
  error: 'border-rose-300 focus:ring-rose-500/10 focus:border-rose-400',
  disabled: 'bg-gray-100 text-gray-400 cursor-not-allowed',
} as const;

// Modal styles - better backdrop, rounded-xl container
export const modalStyles = {
  overlay: 'fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4',
  container: 'bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-lg',
  header: 'p-6 border-b border-gray-100',
  body: 'p-6',
  footer: 'p-6 border-t border-gray-100 flex justify-end gap-3',
} as const;

// Card styles - no shadow at rest, shadow on hover
export const cardStyles = {
  base: 'bg-white rounded-xl border border-gray-200/60',
  hover: 'hover:shadow-md transition-all duration-150',
  interactive: 'bg-white rounded-xl border border-gray-200/60 hover:shadow-md transition-all duration-150 cursor-pointer',
} as const;

// Status badge colors - using brand palette with semantic colors
export const statusColors = {
  not_contacted: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  in_progress: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/50',
  },
  replied: {
    bg: 'bg-pilot-blue/10',
    text: 'text-pilot-blue',
    border: 'border-pilot-blue/20',
  },
  qualified: {
    bg: 'bg-pilot-blue/10',
    text: 'text-pilot-blue',
    border: 'border-pilot-blue/20',
  },
  disqualified: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200/50',
  },
} as const;

// Strategy colors - user-selectable colors for strategies
// Each strategy can have its own color that displays consistently across the app
export const strategyColors = {
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    solid: 'bg-indigo-500',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    solid: 'bg-blue-500',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    solid: 'bg-emerald-500',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    solid: 'bg-rose-500',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    solid: 'bg-amber-500',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    solid: 'bg-violet-500',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    solid: 'bg-pink-500',
  },
  sky: {
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    solid: 'bg-sky-500',
  },
} as const;

// Channel/platform colors
// Social media: keep native brand colors (recognizable)
// Non-social (email, call, walk_in): use gray (not brand logos)
export const channelColors = {
  // Social media - keep brand colors
  instagram: {
    bg: 'bg-pink-50',
    text: 'text-pink-500',
    border: 'border-pink-200/50',
  },
  facebook: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200/50',
  },
  linkedin: {
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200/50',
  },
  // Non-social channels - distinct colors for visual clarity
  email: {
    bg: 'bg-rose-50',
    text: 'text-rose-500',
    border: 'border-rose-200/50',
  },
  call: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200/50',
  },
  walk_in: {
    bg: 'bg-violet-50',
    text: 'text-violet-500',
    border: 'border-violet-200/50',
  },
} as const;

// Icon colors - minimal, functional
export const iconColors = {
  default: 'text-gray-400',
  hover: 'text-gray-600',
  active: 'text-pilot-blue',
  // Social media icons keep brand colors
  instagram: 'text-pink-500',
  facebook: 'text-blue-700',
  linkedin: 'text-sky-600',
} as const;

// Typography classes
export const typography = {
  pageTitle: 'text-2xl font-semibold tracking-tight text-navy',
  sectionTitle: 'text-lg font-semibold tracking-tight text-gray-900',
  cardTitle: 'text-base font-semibold text-gray-900',
  body: 'text-sm text-gray-600',
  tableHeader: 'text-xs font-medium text-gray-700 uppercase tracking-wide',
  label: 'text-sm font-medium text-gray-700',
  muted: 'text-sm text-gray-500',
} as const;

// Type exports
export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;
export type Radius = keyof typeof radius;
export type Shadow = keyof typeof shadows;
export type StatusColor = keyof typeof statusColors;
export type ChannelColor = keyof typeof channelColors;
export type StrategyColorKey = keyof typeof strategyColors;
