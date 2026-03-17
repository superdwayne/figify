/**
 * Shadcn Table component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/table
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS } from '../tokens';

export const TABLE_SPEC: ComponentSpec = {
  name: 'Table',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    textAlign: 'left',
  },
  variants: {
    /** Default table container */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Table header */
    header: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Table row */
    row: {
      backgroundColor: SHADCN_COLORS.background,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Hovered row */
    rowHover: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Selected row */
    rowSelected: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Table cell */
    cell: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Table footer */
    footer: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.mutedForeground,
    },
  },
  sizes: {
    default: {
      paddingX: 16,
      paddingY: 12,
      fontSize: 14,
    },
    sm: {
      paddingX: 12,
      paddingY: 8,
      fontSize: 13,
    },
  },
};
