/**
 * Shadcn Avatar component specification
 *
 * Variants: default, fallback
 * Sizes: default, sm, lg
 *
 * Reference: https://ui.shadcn.com/docs/components/avatar
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const AVATAR_SPEC: ComponentSpec = {
  name: 'Avatar',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.full,
  },
  variants: {
    /** Default avatar with image */
    default: {
      backgroundColor: SHADCN_COLORS.muted,
    },
    /** Fallback avatar with initials */
    fallback: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.mutedForeground,
    },
  },
  sizes: {
    /** Small avatar (32x32) */
    sm: {
      height: 32,
      fontSize: 12,
      borderRadius: SHADCN_RADII.full,
    },
    /** Default avatar (40x40) */
    default: {
      height: 40,
      fontSize: 14,
      borderRadius: SHADCN_RADII.full,
    },
    /** Large avatar (48x48) */
    lg: {
      height: 48,
      fontSize: 16,
      borderRadius: SHADCN_RADII.full,
    },
    /** Extra large avatar (64x64) */
    xl: {
      height: 64,
      fontSize: 20,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
