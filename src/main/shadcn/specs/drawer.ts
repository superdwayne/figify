/**
 * Shadcn Drawer component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/drawer
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII } from '../tokens';

export const DRAWER_SPEC: ComponentSpec = {
  name: 'Drawer',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    backgroundColor: SHADCN_COLORS.background,
  },
  variants: {
    /** Default drawer container */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Drawer overlay */
    overlay: {
      backgroundColor: '#00000080',
    },
    /** Drawer handle */
    handle: {
      backgroundColor: SHADCN_COLORS.muted,
    },
  },
  sizes: {
    default: {
      paddingX: 24,
      paddingY: 24,
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
