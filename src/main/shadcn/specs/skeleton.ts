/**
 * Shadcn Skeleton component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/skeleton
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const SKELETON_SPEC: ComponentSpec = {
  name: 'Skeleton',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default skeleton placeholder */
    default: {
      backgroundColor: SHADCN_COLORS.muted,
    },
    /** Circular skeleton (for avatars) */
    circular: {
      backgroundColor: SHADCN_COLORS.muted,
    },
  },
  sizes: {
    default: {
      borderRadius: SHADCN_RADII.md,
    },
    /** Line/text skeleton */
    line: {
      height: 16,
      borderRadius: SHADCN_RADII.sm,
    },
    /** Avatar skeleton */
    avatar: {
      height: 40,
      borderRadius: SHADCN_RADII.full,
    },
    /** Card skeleton */
    card: {
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
