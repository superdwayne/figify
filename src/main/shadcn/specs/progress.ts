/**
 * Shadcn Progress component specification
 *
 * Variants: default
 * Sizes: default, sm, lg
 *
 * Reference: https://ui.shadcn.com/docs/components/progress
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const PROGRESS_SPEC: ComponentSpec = {
  name: 'Progress',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.full,
  },
  variants: {
    /** Default progress track (background) */
    default: {
      backgroundColor: SHADCN_COLORS.secondary,
    },
    /** Progress indicator (filled portion) */
    indicator: {
      backgroundColor: SHADCN_COLORS.primary,
    },
    /** Destructive/error progress */
    destructive: {
      backgroundColor: SHADCN_COLORS.destructive,
    },
    /** Success progress */
    success: {
      backgroundColor: '#16A34A', // green-600
    },
  },
  sizes: {
    /** Small progress bar (6px height) */
    sm: {
      height: 6,
      borderRadius: SHADCN_RADII.full,
    },
    /** Default progress bar (8px height) */
    default: {
      height: 8,
      borderRadius: SHADCN_RADII.full,
    },
    /** Large progress bar (12px height) */
    lg: {
      height: 12,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
