/**
 * Shadcn Typography component specification
 *
 * Variants: h1, h2, h3, h4, p, blockquote, code, lead, large, small, muted
 * Sizes: default
 *
 * Reference: https://ui.shadcn.com/docs/components/typography
 */

import type { ComponentSpec } from '../types';
import { SHADCN_COLORS } from '../tokens';

export const TYPOGRAPHY_SPEC: ComponentSpec = {
  name: 'Typography',
  defaultVariant: 'p',
  defaultSize: 'default',
  baseStyles: {
    textAlign: 'left',
  },
  variants: {
    /** H1 heading - scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl */
    h1: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** H2 heading - scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight */
    h2: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
    },
    /** H3 heading - scroll-m-20 text-2xl font-semibold tracking-tight */
    h3: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** H4 heading - scroll-m-20 text-xl font-semibold tracking-tight */
    h4: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Paragraph - leading-7 */
    p: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Blockquote - mt-6 border-l-2 pl-6 italic */
    blockquote: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
      borderColor: SHADCN_COLORS.border,
      borderWidth: 2,
    },
    /** Inline code - bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm */
    code: {
      backgroundColor: SHADCN_COLORS.muted,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Lead text - text-xl text-muted-foreground */
    lead: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Large text - text-lg font-semibold */
    large: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Small text - text-sm font-medium leading-none */
    small: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.foreground,
    },
    /** Muted text - text-sm text-muted-foreground */
    muted: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.mutedForeground,
    },
    /** Link text */
    link: {
      backgroundColor: SHADCN_COLORS.transparent,
      textColor: SHADCN_COLORS.primary,
      textDecoration: 'underline',
    },
  },
  sizes: {
    /** H1 size */
    h1: {
      fontSize: 36,
      paddingX: 0,
      paddingY: 0,
    },
    /** H2 size */
    h2: {
      fontSize: 30,
      paddingX: 0,
      paddingY: 0,
    },
    /** H3 size */
    h3: {
      fontSize: 24,
      paddingX: 0,
      paddingY: 0,
    },
    /** H4 size */
    h4: {
      fontSize: 20,
      paddingX: 0,
      paddingY: 0,
    },
    /** Default paragraph size */
    default: {
      fontSize: 16,
      paddingX: 0,
      paddingY: 0,
    },
    /** Lead size */
    lead: {
      fontSize: 20,
      paddingX: 0,
      paddingY: 0,
    },
    /** Large size */
    large: {
      fontSize: 18,
      paddingX: 0,
      paddingY: 0,
    },
    /** Small size */
    small: {
      fontSize: 14,
      paddingX: 0,
      paddingY: 0,
    },
    /** Code size */
    code: {
      fontSize: 14,
      paddingX: 5,
      paddingY: 3,
    },
  },
};
