/**
 * Shadcn design tokens - centralized visual constants
 *
 * All color values are hex equivalents of Shadcn's OKLCH CSS variables.
 * These tokens provide the single source of truth for Shadcn styling.
 *
 * Reference: https://ui.shadcn.com/docs/theming
 */

/**
 * Core Shadcn color palette (Light Mode)
 * All values in hex format (#RRGGBB)
 */
export const SHADCN_COLORS = {
  /** Page/card backgrounds - oklch(1 0 0) */
  background: '#FFFFFF',
  /** Primary text - oklch(0.145 0 0) */
  foreground: '#0A0A0A',
  /** Default button bg, links - oklch(0.205 0 0) */
  primary: '#18181B',
  /** Text on primary - oklch(0.985 0 0) */
  primaryForeground: '#FAFAFA',
  /** Secondary button bg - oklch(0.97 0 0) */
  secondary: '#F4F4F5',
  /** Text on secondary - oklch(0.205 0 0) */
  secondaryForeground: '#18181B',
  /** Error states, destructive actions - oklch(0.577 0.245 27.325) */
  destructive: '#EF4444',
  /** Text on destructive - oklch(0.985 0 0) */
  destructiveForeground: '#FAFAFA',
  /** Muted backgrounds - oklch(0.97 0 0) */
  muted: '#F4F4F5',
  /** Muted text - oklch(0.556 0 0) */
  mutedForeground: '#71717A',
  /** Borders, dividers - oklch(0.922 0 0) */
  border: '#E4E4E7',
  /** Input borders - oklch(0.922 0 0) */
  input: '#E4E4E7',
  /** Focus rings - oklch(0.708 0 0) */
  ring: '#A1A1AA',
  /** Transparent color */
  transparent: 'transparent',
} as const;

/**
 * Border radius tokens in pixels
 */
export const SHADCN_RADII = {
  /** No rounding */
  none: 0,
  /** Small rounding (4px) */
  sm: 4,
  /** Medium/default rounding (6px) - used by most components */
  md: 6,
  /** Large rounding (8px) - used by cards */
  lg: 8,
  /** Full pill shape (9999px) - used by badges */
  full: 9999,
} as const;

/**
 * Component size presets with all dimension properties
 */
export const SHADCN_SIZES = {
  /** Extra small size (28px height) */
  xs: {
    height: 28,
    paddingX: 8,
    paddingY: 4,
    fontSize: 12,
    borderRadius: SHADCN_RADII.sm,
  },
  /** Small size (36px height) */
  sm: {
    height: 36,
    paddingX: 12,
    paddingY: 6,
    fontSize: 14,
    borderRadius: SHADCN_RADII.md,
  },
  /** Default size (40px height) */
  default: {
    height: 40,
    paddingX: 16,
    paddingY: 8,
    fontSize: 14,
    borderRadius: SHADCN_RADII.md,
  },
  /** Large size (44px height) */
  lg: {
    height: 44,
    paddingX: 24,
    paddingY: 10,
    fontSize: 16,
    borderRadius: SHADCN_RADII.md,
  },
  /** Icon button size (40px square) */
  icon: {
    height: 40,
    paddingX: 10,
    paddingY: 10,
    fontSize: 14,
    borderRadius: SHADCN_RADII.md,
  },
} as const;

/**
 * Shadow presets for Shadcn components
 */
export const SHADCN_SHADOWS = {
  /** No shadow */
  none: null,
  /** Small shadow - used by cards */
  sm: {
    color: '#00000008',
    offsetX: 0,
    offsetY: 1,
    blur: 2,
    spread: 0,
  },
  /** Default shadow */
  default: {
    color: '#0000001A',
    offsetX: 0,
    offsetY: 1,
    blur: 3,
    spread: 0,
  },
} as const;
