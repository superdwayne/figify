/**
 * Shadcn AlertDialog component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/alert-dialog
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const ALERT_DIALOG_SPEC: ComponentSpec = {
  name: 'AlertDialog',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    backgroundColor: SHADCN_COLORS.background,
    borderRadius: SHADCN_RADII.lg,
  },
  variants: {
    /** Default alert dialog */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Alert dialog overlay */
    overlay: {
      backgroundColor: '#00000080',
    },
  },
  sizes: {
    default: {
      paddingX: 24,
      paddingY: 24,
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
