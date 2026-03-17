/**
 * Shadcn Calendar component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/calendar
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const CALENDAR_SPEC: ComponentSpec = {
  name: 'Calendar',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default calendar container */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Selected day */
    selected: {
      backgroundColor: SHADCN_COLORS.primary,
      textColor: SHADCN_COLORS.primaryForeground,
    },
    /** Today indicator */
    today: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Disabled/outside month days */
    disabled: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Day cell on hover */
    hover: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
  },
  sizes: {
    default: {
      paddingX: 12,
      paddingY: 12,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
