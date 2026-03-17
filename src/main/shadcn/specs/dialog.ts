/**
 * Shadcn Dialog component specification
 *
 * Variants: default
 * Sizes: default, sm, lg, full
 *
 * Reference: https://ui.shadcn.com/docs/components/dialog
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const DIALOG_SPEC: ComponentSpec = {
  name: 'Dialog',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    backgroundColor: SHADCN_COLORS.background,
    borderRadius: SHADCN_RADII.lg,
  },
  variants: {
    /** Default dialog with border and shadow */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Dialog overlay backdrop */
    overlay: {
      backgroundColor: '#00000080', // 50% black overlay
    },
  },
  sizes: {
    /** Small dialog (max-width: 425px) */
    sm: {
      paddingX: 24,
      paddingY: 24,
      borderRadius: SHADCN_RADII.lg,
    },
    /** Default dialog (max-width: 525px) */
    default: {
      paddingX: 24,
      paddingY: 24,
      borderRadius: SHADCN_RADII.lg,
    },
    /** Large dialog (max-width: 700px) */
    lg: {
      paddingX: 32,
      paddingY: 32,
      borderRadius: SHADCN_RADII.lg,
    },
    /** Full-width dialog */
    full: {
      paddingX: 32,
      paddingY: 32,
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
