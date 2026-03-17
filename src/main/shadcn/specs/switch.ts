/**
 * Shadcn Switch component specification
 *
 * Variants: default (off), checked (on)
 * Sizes: default, sm
 *
 * Reference: https://ui.shadcn.com/docs/components/switch
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const SWITCH_SPEC: ComponentSpec = {
  name: 'Switch',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.full,
  },
  variants: {
    /** Default unchecked state - muted background */
    default: {
      backgroundColor: SHADCN_COLORS.input,
    },
    /** Checked/on state - primary background */
    checked: {
      backgroundColor: SHADCN_COLORS.primary,
    },
    /** Disabled state */
    disabled: {
      backgroundColor: SHADCN_COLORS.muted,
    },
  },
  sizes: {
    /** Default switch size (44x24) */
    default: {
      height: 24,
      paddingX: 2,
      paddingY: 2,
      borderRadius: SHADCN_RADII.full,
    },
    /** Small switch size (36x20) */
    sm: {
      height: 20,
      paddingX: 2,
      paddingY: 2,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
