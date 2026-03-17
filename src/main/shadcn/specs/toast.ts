/**
 * Shadcn Toast component specification
 *
 * Variants: default, destructive
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/toast
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const TOAST_SPEC: ComponentSpec = {
  name: 'Toast',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.lg,
  },
  variants: {
    /** Default toast */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Destructive/error toast */
    destructive: {
      backgroundColor: SHADCN_COLORS.destructive,
      textColor: SHADCN_COLORS.destructiveForeground,
      borderColor: SHADCN_COLORS.destructive,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Success toast */
    success: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: '#16A34A',
      borderColor: '#16A34A',
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Warning toast */
    warning: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: '#CA8A04',
      borderColor: '#CA8A04',
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
  },
  sizes: {
    default: {
      paddingX: 16,
      paddingY: 16,
      fontSize: 14,
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
