/**
 * Shadcn Popover component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/popover
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const POPOVER_SPEC: ComponentSpec = {
  name: 'Popover',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default popover content */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
  },
  sizes: {
    default: {
      paddingX: 16,
      paddingY: 16,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
