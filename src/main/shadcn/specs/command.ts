/**
 * Shadcn Command component specification
 *
 * Variants: default
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/command
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS, SHADCN_RADII, SHADCN_SHADOWS } from '../tokens';

export const COMMAND_SPEC: ComponentSpec = {
  name: 'Command',
  defaultVariant: 'default',
  defaultSize: 'default',
  baseStyles: {
    borderRadius: SHADCN_RADII.lg,
  },
  variants: {
    /** Default command palette container */
    default: {
      backgroundColor: SHADCN_COLORS.background,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
      shadow: SHADCN_SHADOWS.default,
    },
    /** Command input field */
    input: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 1,
    },
    /** Command item */
    item: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Selected/highlighted item */
    selected: {
      backgroundColor: SHADCN_COLORS.secondary,
      textColor: SHADCN_COLORS.secondaryForeground,
    },
    /** Command group heading */
    heading: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
  },
  sizes: {
    default: {
      paddingX: 8,
      paddingY: 8,
      fontSize: 14,
      borderRadius: SHADCN_RADII.lg,
    },
  },
};
