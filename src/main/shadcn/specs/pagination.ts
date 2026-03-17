/**
 * Shadcn Pagination component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/pagination
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const PAGINATION_SPEC: ComponentSpec = {
  name: 'Pagination',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
    textAlign: 'center',
  },
  variants: {
    /** Default pagination container */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Pagination item */
    item: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Active/current page */
    active: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Disabled item */
    disabled: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Ellipsis */
    ellipsis: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
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
    sm: {
      height: 32,
      paddingX: 8,
      paddingY: 4,
      fontSize: 12,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
