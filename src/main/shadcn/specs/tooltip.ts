/**
 * Shadcn Tooltip component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/tooltip
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const TOOLTIP_SPEC: ComponentSpec = {
  name: 'Tooltip',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    fontWeight: 500,
    textAlign: 'center',
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default tooltip (dark background) */
    default: {
      backgroundColor: SHADCN_COLORS.primary,
      textColor: SHADCN_COLORS.primaryForeground,
    },
  },
  sizes: {
    default: {
      paddingX: 12,
      paddingY: 6,
      fontSize: 12,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
