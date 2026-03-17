/**
 * Shadcn Separator component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/separator
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS } from '../tokens';

export const SEPARATOR_SPEC: ComponentSpec = {
  name: 'Separator',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {},
  variants: {
    /** Default horizontal separator */
    default: {
      backgroundColor: SHADCN_COLORS.border,
    },
    /** Vertical separator */
    vertical: {
      backgroundColor: SHADCN_COLORS.border,
    },
  },
  sizes: {
    /** Horizontal separator (full width, 1px height) */
    default: {
      height: 1,
      paddingX: 0,
      paddingY: 0,
    },
    /** Vertical separator (1px width) */
    vertical: {
      height: undefined,
      paddingX: 0,
      paddingY: 0,
    },
  },
};
