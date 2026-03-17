/**
 * Shadcn Tabs component specification
 *
 * Variants: default, outline
 * Sizes: default, sm
 *
 * Reference: https://ui.shadcn.com/docs/components/tabs
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const TABS_SPEC: ComponentSpec = {
  name: 'Tabs',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default tabs list container with muted background */
    default: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Active/selected tab state */
    active: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Inactive tab state */
    inactive: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
  },
  sizes: {
    default: {
      height: 40,
      paddingX: 12,
      paddingY: 6,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
    sm: {
      height: 36,
      paddingX: 10,
      paddingY: 4,
      fontSize: 13,
      borderRadius: SHADCN_RADII.sm,
    },
  },
};
