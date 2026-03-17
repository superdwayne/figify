/**
 * Shadcn Menubar component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/menubar
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const MENUBAR_SPEC: ComponentSpec = {
  name: 'Menubar',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default menubar container */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Menubar trigger */
    trigger: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Active trigger */
    triggerActive: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Menu content dropdown */
    content: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Menu item */
    item: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Highlighted item */
    highlighted: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
  },
  sizes: {
    default: {
      height: 40,
      paddingX: 12,
      paddingY: 8,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
