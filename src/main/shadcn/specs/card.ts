/**
 * Shadcn Card component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/card
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const CARD_SPEC: ComponentSpec = {
  name: 'Card',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    backgroundColor: SHADCN_COLORS.background,
    borderRadius: SHADCN_RADII.lg,
  },
  variants: {
    /** Default card with subtle border and shadow */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.sm,
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
