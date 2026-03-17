/**
 * Shadcn ContextMenu component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/context-menu
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const CONTEXT_MENU_SPEC: ComponentSpec = {
  name: 'ContextMenu',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default context menu container */
    default: {
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
    /** Highlighted/focused item */
    highlighted: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Disabled item */
    disabled: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Separator */
    separator: {
      backgroundColor: SHADCN_COLORS.border,
    },
  },
  sizes: {
    default: {
      paddingX: 8,
      paddingY: 4,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
