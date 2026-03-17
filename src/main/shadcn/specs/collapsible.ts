/**
 * Shadcn Collapsible component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/collapsible
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const COLLAPSIBLE_SPEC: ComponentSpec = {
  name: 'Collapsible',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.md,
  },
  variants: {
    /** Default collapsible container */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Collapsible trigger */
    trigger: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Collapsible content */
    content: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
  },
  sizes: {
    default: {
      paddingX: 0,
      paddingY: 0,
      fontSize: 14,
      borderRadius: SHADCN_RADII.md,
    },
  },
};
