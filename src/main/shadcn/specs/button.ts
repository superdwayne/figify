/**
 * Shadcn Button component specification
 *
 * Variants: default, secondary, outline, ghost, destructive, link
 * Sizes: default, sm, lg, icon
 *
 * Reference: https://ui.shadcn.com/docs/components/button
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_SIZES } from '../tokens';

export const BUTTON_SPEC: ComponentSpec = {
  name: 'Button',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    fontWeight: 500,
    textAlign: 'center',
  },
  variants: {
    /** Primary button with dark background */
    default: {
      backgroundColor: SHADCN_COLORS.primary,
      textColor: SHADCN_COLORS.primaryForeground,
    },
    /** Secondary button with light gray background */
    secondary: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Outline button with border, transparent background */
    outline: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Ghost button - transparent, no border */
    ghost: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Destructive button for dangerous actions */
    destructive: {
      backgroundColor: SHADCN_COLORS.destructive,
      textColor: SHADCN_COLORS.destructiveForeground,
    },
    /** Link button - looks like a text link */
    link: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.primary,
      textDecoration: 'underline',
    },
  },
  sizes: {
    default: {
      height: SHADCN_SIZES.default.height,
      paddingX: SHADCN_SIZES.default.paddingX,
      paddingY: SHADCN_SIZES.default.paddingY,
      fontSize: SHADCN_SIZES.default.fontSize,
      borderRadius: SHADCN_SIZES.default.borderRadius,
    },
    sm: {
      height: SHADCN_SIZES.sm.height,
      paddingX: SHADCN_SIZES.sm.paddingX,
      paddingY: SHADCN_SIZES.sm.paddingY,
      fontSize: SHADCN_SIZES.sm.fontSize,
      borderRadius: SHADCN_SIZES.sm.borderRadius,
    },
    lg: {
      height: SHADCN_SIZES.lg.height,
      paddingX: SHADCN_SIZES.lg.paddingX,
      paddingY: SHADCN_SIZES.lg.paddingY,
      fontSize: SHADCN_SIZES.lg.fontSize,
      borderRadius: SHADCN_SIZES.lg.borderRadius,
    },
    icon: {
      height: SHADCN_SIZES.icon.height,
      paddingX: SHADCN_SIZES.icon.paddingX,
      paddingY: SHADCN_SIZES.icon.paddingY,
      borderRadius: SHADCN_SIZES.icon.borderRadius,
      iconSize: 16,
    },
  },
};
