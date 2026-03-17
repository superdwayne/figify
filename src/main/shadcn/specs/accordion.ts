/**
 * Shadcn Accordion component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/accordion
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const ACCORDION_SPEC: ComponentSpec = {
  name: 'Accordion',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderWidth: 1,
    textAlign: 'left',
  },
  variants: {
    /** Default accordion item */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Accordion trigger/header */
    trigger: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Accordion content area */
    content: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
  },
  sizes: {
    default: {
      paddingX: 16,
      paddingY: 16,
      fontSize: 14,
      borderRadius: SHADCN_RADII.none,
    },
  },
};
