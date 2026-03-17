/**
 * Shadcn Sheet component specification
 *
 * Variants: default
 * Sizes: default, sm, lg
 *
 * Reference: https://ui.shadcn.com/docs/components/sheet
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_SHADOWS } from '../tokens';

export const SHEET_SPEC: ComponentSpec = {
  name: 'Sheet',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    backgroundColor: SHADCN_COLORS.background,
  },
  variants: {
    /** Default sheet content */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Sheet overlay */
    overlay: {
      backgroundColor: '#00000080',
    },
  },
  sizes: {
    /** Small sheet */
    sm: {
      paddingX: 24,
      paddingY: 24,
    },
    /** Default sheet */
    default: {
      paddingX: 24,
      paddingY: 24,
    },
    /** Large sheet */
    lg: {
      paddingX: 32,
      paddingY: 32,
    },
  },
};
