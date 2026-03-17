/**
 * Shadcn Toggle component specification
 *
 * Variants: default, outline
 * Sizes: default, sm, lg
 *
 * Reference: https://ui.shadcn.com/docs/components/toggle
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SIZES } from '../tokens';

export const TOGGLE_SPEC: ComponentSpec = {
  name: 'Toggle',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    fontWeight: 500,
    textAlign: 'center',
  },
  variants: {
    /** Default toggle (unpressed) - transparent background */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Pressed/active toggle state */
    pressed: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Outline variant (unpressed) */
    outline: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.input,
      borderWidth: 1,
    },
    /** Outline variant (pressed) */
    outlinePressed: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.input,
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      height: SHADCN_SIZES.default.height,
      paddingX: SHADCN_SIZES.default.paddingX,
      paddingY: SHADCN_SIZES.default.paddingY,
      fontSize: SHADCN_SIZES.default.fontSize,
      borderRadius: SHADCN_RADII.md,
    },
    sm: {
      height: SHADCN_SIZES.sm.height,
      paddingX: SHADCN_SIZES.sm.paddingX,
      paddingY: SHADCN_SIZES.sm.paddingY,
      fontSize: SHADCN_SIZES.sm.fontSize,
      borderRadius: SHADCN_RADII.md,
    },
    lg: {
      height: SHADCN_SIZES.lg.height,
      paddingX: SHADCN_SIZES.lg.paddingX,
      paddingY: SHADCN_SIZES.lg.paddingY,
      fontSize: SHADCN_SIZES.lg.fontSize,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
