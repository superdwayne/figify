/**
 * Shadcn Breadcrumb component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/breadcrumb
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS } from '../tokens';

export const BREADCRUMB_SPEC: ComponentSpec = {
  name: 'Breadcrumb',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    textAlign: 'left',
  },
  variants: {
    /** Default breadcrumb container */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Active/current breadcrumb item */
    active: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Link breadcrumb item */
    link: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Separator between items */
    separator: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
  },
  sizes: {
    default: {
      fontSize: 14,
      paddingX: 0,
      paddingY: 0,
    },
  },
};
