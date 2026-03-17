/**
 * Shadcn Select component specification
 *
 * Variants: default, outline
 * Sizes: default, sm, lg
 *
 * Reference: https://ui.shadcn.com/docs/components/select
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SIZES } from '../tokens';

export const SELECT_SPEC: ComponentSpec = {
  name: 'Select',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderWidth: 1,
    borderRadius: SHADCN_RADII.md,
    textAlign: 'left',
  },
  variants: {
    /** Default select with border */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.input,
      borderWidth: 1,
    },
    /** Disabled state */
    disabled: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.mutedForeground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      height: SHADCN_SIZES.default.height,
      paddingX: 12,
      paddingY: SHADCN_SIZES.default.paddingY,
      fontSize: SHADCN_SIZES.default.fontSize,
      borderRadius: SHADCN_RADII.md,
    },
    sm: {
      height: SHADCN_SIZES.sm.height,
      paddingX: 10,
      paddingY: SHADCN_SIZES.sm.paddingY,
      fontSize: SHADCN_SIZES.sm.fontSize,
      borderRadius: SHADCN_RADII.md,
    },
    lg: {
      height: SHADCN_SIZES.lg.height,
      paddingX: 14,
      paddingY: SHADCN_SIZES.lg.paddingY,
      fontSize: SHADCN_SIZES.lg.fontSize,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
