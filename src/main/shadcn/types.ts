/**
 * Type definitions for Shadcn component specifications
 *
 * These interfaces define the structure for component specs that describe
 * visual properties (colors, sizes, spacing) for each Shadcn component variant.
 */

import type { ShadcnComponentType } from '../../ui/types/analysis';

/**
 * Shadow specification for drop shadows
 */
export interface ShadowSpec {
  /** Shadow color as hex (#RRGGBB) */
  color: string;
  /** Horizontal offset in pixels */
  offsetX: number;
  /** Vertical offset in pixels */
  offsetY: number;
  /** Blur radius in pixels */
  blur: number;
  /** Spread radius in pixels */
  spread: number;
}

/**
 * Variant-specific styles (colors, borders, shadows)
 */
export interface VariantStyle {
  /** Background color as hex (#RRGGBB) */
  backgroundColor?: string;
  /** Text color as hex (#RRGGBB) */
  textColor?: string;
  /** Border color as hex (#RRGGBB) */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Drop shadow configuration */
  shadow?: ShadowSpec;
  /** Text decoration (for link variant) */
  textDecoration?: 'none' | 'underline';
}

/**
 * Size-specific styles (dimensions, spacing, typography)
 */
export interface SizeStyle {
  /** Element height in pixels */
  height?: number;
  /** Horizontal padding in pixels */
  paddingX?: number;
  /** Vertical padding in pixels */
  paddingY?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Icon size in pixels (for icon buttons) */
  iconSize?: number;
}

/**
 * Base styles applied to all variants/sizes of a component
 */
export interface BaseStyles {
  /** Font weight (400, 500, 600, 700) */
  fontWeight?: number;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Default background color (for cards, etc.) */
  backgroundColor?: string;
  /** Default border width in pixels */
  borderWidth?: number;
  /** Default border radius in pixels */
  borderRadius?: number;
}

/**
 * Complete component specification defining all visual properties
 */
export interface ComponentSpec {
  /** Component name (e.g., "Button", "Card") */
  name: string;
  /** Default variant to use when not specified */
  defaultVariant: string;
  /** Default size to use when not specified */
  defaultSize: string;
  /** Base styles applied to all variants */
  baseStyles: BaseStyles;
  /** Variant-specific style overrides */
  variants: Record<string, VariantStyle>;
  /** Size-specific style overrides */
  sizes: Record<string, SizeStyle>;
}

/**
 * Resolved styles after merging base, variant, and size
 * Ready to apply directly to Figma nodes
 */
export interface ResolvedStyles {
  /** Background color as hex (#RRGGBB) */
  backgroundColor?: string;
  /** Text color as hex (#RRGGBB) */
  textColor?: string;
  /** Border color as hex (#RRGGBB) */
  borderColor?: string;
  /** Border width in pixels */
  borderWidth?: number;
  /** Drop shadow configuration */
  shadow?: ShadowSpec;
  /** Text decoration */
  textDecoration?: 'none' | 'underline';
  /** Element height in pixels */
  height?: number;
  /** Horizontal padding in pixels */
  paddingX?: number;
  /** Vertical padding in pixels */
  paddingY?: number;
  /** Font size in pixels */
  fontSize?: number;
  /** Border radius in pixels */
  borderRadius?: number;
  /** Icon size in pixels */
  iconSize?: number;
  /** Font weight */
  fontWeight?: number;
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right';
  /** Font family name */
  fontFamily?: string;
}

/**
 * Map of component types to their specifications
 */
export type ComponentSpecMap = Partial<Record<ShadcnComponentType, ComponentSpec>>;
