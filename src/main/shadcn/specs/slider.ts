/**
 * Shadcn Slider component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/slider
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const SLIDER_SPEC: ComponentSpec = {
  name: 'Slider',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.full,
  },
  variants: {
    /** Default slider track (background) */
    default: {
      backgroundColor: SHADCN_COLORS.secondary,
    },
    /** Slider range (filled portion) */
    range: {
      backgroundColor: SHADCN_COLORS.primary,
    },
    /** Slider thumb */
    thumb: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.primary,
      borderWidth: 2,
    },
    /** Disabled slider */
    disabled: {
      backgroundColor: SHADCN_COLORS.muted,
    },
  },
  sizes: {
    default: {
      height: 8,
      borderRadius: SHADCN_RADII.full,
    },
    /** Slider thumb size */
    thumb: {
      height: 20,
      borderRadius: SHADCN_RADII.full,
    },
  },
};
