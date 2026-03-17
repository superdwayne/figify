/**
 * Shadcn Label component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/label
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS } from '../tokens';

export const LABEL_SPEC: ComponentSpec = {
  name: 'Label',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    fontWeight: 500,
    textAlign: 'left',
  },
  variants: {
    /** Default label */
    default: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Disabled label */
    disabled: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Error label */
    error: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.destructive,
    },
  },
  sizes: {
    default: {
      fontSize: 14,
      paddingX: 0,
      paddingY: 0,
    },
    sm: {
      fontSize: 12,
      paddingX: 0,
      paddingY: 0,
    },
  },
};
