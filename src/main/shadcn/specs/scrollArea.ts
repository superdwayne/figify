/**
 * Shadcn ScrollArea component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/scroll-area
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const SCROLL_AREA_SPEC: ComponentSpec = {
  name: 'ScrollArea',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default scroll area container */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
    },
    /** Scrollbar track */
    track: {
      backgroundColor: SHADCN_COLORS.transparent,
    },
    /** Scrollbar thumb */
    thumb: {
      backgroundColor: SHADCN_COLORS.border,
    },
  },
  sizes: {
    default: {
      paddingX: 0,
      paddingY: 0,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
