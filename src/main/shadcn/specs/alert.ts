/**
 * Shadcn Alert component specification
 *
 * Variants: default, destructive
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/alert
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const ALERT_SPEC: ComponentSpec = {
  name: 'Alert',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderWidth: 1,
    borderRadius: SHADCN_RADII.lg,
    textAlign: 'left',
  },
  variants: {
    /** Default alert with neutral styling */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Destructive/error alert */
    destructive: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.destructive,
      borderColor: SHADCN_COLORS.destructive,
      borderWidth: 1,
    },
    /** Success alert (custom - not in default shadcn) */
    success: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: '#16A34A', // green-600
      borderColor: '#16A34A',
      borderWidth: 1,
    },
    /** Warning alert (custom - not in default shadcn) */
    warning: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: '#CA8A04', // yellow-600
      borderColor: '#CA8A04',
      borderWidth: 1,
    },
  },
  sizes: {
    default: {
      paddingX: 16,
      paddingY: 16,
      fontSize: 14,
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
