/**
 * Shadcn Checkbox component specification
 *
 * Variants: default, destructive
 * Sizes: default, sm
 *
 * Reference: https://ui.shadcn.com/docs/components/checkbox
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const CHECKBOX_SPEC: ComponentSpec = {
  name: 'Checkbox',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderWidth: 1,
    borderRadius: SHADCN_RADII.sm,
  },
  variants: {
    /** Default unchecked checkbox with border */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.primary,
      borderWidth: 1,
    },
    /** Checked state with primary background */
    checked: {
      backgroundColor: SHADCN_COLORS.primary,
      textColor: SHADCN_COLORS.primaryForeground,
      borderColor: SHADCN_COLORS.primary,
      borderWidth: 1,
    },
    /** Disabled state */
    disabled: {
      backgroundColor: SHADCN_COLORS.muted,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      height: 16,
      paddingX: 0,
      paddingY: 0,
      borderRadius: SHADCN_RADII.sm,
    },
    sm: {
      height: 14,
      paddingX: 0,
      paddingY: 0,
      borderRadius: SHADCN_RADII.sm,
    },
  },
};
