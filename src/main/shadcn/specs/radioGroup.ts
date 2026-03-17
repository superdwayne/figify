/**
 * Shadcn RadioGroup component specification
 *
 * Variants: default, checked
 * Sizes: default, sm
 *
 * Reference: https://ui.shadcn.com/docs/components/radio-group
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const RADIO_GROUP_SPEC: ComponentSpec = {
  name: 'RadioGroup',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderWidth: 1,
    borderRadius: SHADCN_RADII.full,
  },
  variants: {
    /** Default unchecked radio button */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.primary,
      borderWidth: 1,
    },
    /** Checked/selected radio button */
    checked: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.primary,
      borderWidth: 1,
      // Note: The inner dot is rendered separately
    },
    /** Disabled state */
    disabled: {
      backgroundColor: SHADCN_COLORS.muted,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
  },
  sizes: {
    /** Default radio button (16x16) */
    default: {
      height: 16,
      borderRadius: SHADCN_RADII.full,
    },
    /** Small radio button (14x14) */
    sm: {
      height: 14,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
