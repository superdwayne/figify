/**
 * Shadcn Component System - Public API
 *
 * Provides the component factory, specifications, and design tokens
 * for generating Figma nodes with Shadcn styling.
 */

// Main factory class
export { ShadcnComponentFactory } from './componentFactory';

// Style resolution functions
export { resolveStyles, mergeWithOverrides, colorsMatch } from './variantResolver';

// Variant inference functions
export { inferVariant, inferButtonVariant, inferBadgeVariant } from './variantResolver';

// Component specifications
export { COMPONENT_SPECS } from './specs/index';
export { BUTTON_SPEC } from './specs/button';
export { CARD_SPEC } from './specs/card';
export { BADGE_SPEC } from './specs/badge';
export { INPUT_SPEC } from './specs/input';

// Design tokens
export { SHADCN_COLORS, SHADCN_RADII, SHADCN_SIZES, SHADCN_SHADOWS } from './tokens';

// Types
export type {
  ComponentSpec,
  ComponentSpecMap,
  VariantStyle,
  SizeStyle,
  BaseStyles,
  ResolvedStyles,
  ShadowSpec,
} from './types';
