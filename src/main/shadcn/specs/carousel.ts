/**
 * Shadcn Carousel component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/carousel
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const CAROUSEL_SPEC: ComponentSpec = {
  name: 'Carousel',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default carousel container */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
    },
    /** Carousel item/slide */
    item: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Navigation button */
    button: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      paddingX: 16,
      paddingY: 16,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
