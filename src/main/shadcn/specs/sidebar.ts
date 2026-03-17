/**
 * Shadcn Sidebar component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/sidebar
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const SIDEBAR_SPEC: ComponentSpec = {
  name: 'Sidebar',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    backgroundColor: SHADCN_COLORS.background,
  },
  variants: {
    /** Default sidebar container */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Sidebar menu item */
    item: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Active/selected menu item */
    itemActive: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Sidebar group heading */
    groupLabel: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Collapsed sidebar */
    collapsed: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      paddingX: 12,
      paddingY: 8,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
