/**
 * Shadcn Badge component specification
 *
 * Variants: default, secondary, outline, destructive
 * Sizes: default (single size with pill shape)
 *
 * Reference: https://ui.shadcn.com/docs/components/badge
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const BADGE_SPEC: ComponentSpec = {
  name: 'Badge',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    fontWeight: 500,
    textAlign: 'center',
  },
  variants: {
    /** Primary badge with dark background */
    default: {
      backgroundColor: SHADCN_COLORS.primary,
      textColor: SHADCN_COLORS.primaryForeground,
    },
    /** Secondary badge with light gray background */
    secondary: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Outline badge with border, transparent background */
    outline: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Destructive badge for error/warning states */
    destructive: {
      backgroundColor: SHADCN_COLORS.destructive,
      textColor: SHADCN_COLORS.destructiveForeground,
    },
  },
  sizes: {
    /** Badges have a single size - small pill shape */
    default: {
      height: 22,
      paddingX: 10,
      paddingY: 2,
      fontSize: 12,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
