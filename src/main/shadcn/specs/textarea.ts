/**
 * Shadcn Textarea component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/textarea
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const TEXTAREA_SPEC: ComponentSpec = {
  name: 'Textarea',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderWidth: 1,
    borderRadius: SHADCN_RADII.md,
    textAlign: 'left',
  },
  variants: {
    /** Default textarea */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.input,
      borderWidth: 1,
    },
    /** Disabled textarea */
    disabled: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.mutedForeground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Error state */
    error: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.destructive,
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      height: 80,
      paddingX: 12,
      paddingY: 8,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
    sm: {
      height: 60,
      paddingX: 10,
      paddingY: 6,
      fontSize: 13,
      borderRadius: SHADCN_RADII.md,
    },
    lg: {
      height: 120,
      paddingX: 14,
      paddingY: 10,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
