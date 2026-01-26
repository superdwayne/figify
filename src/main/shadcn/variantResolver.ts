/**
 * Variant Resolver - Style resolution and merging for Shadcn components
 *
 * Resolves component styles by merging base, size, and variant styles
 * in CVA (class-variance-authority) order. Also handles AI color overrides
 * when detected colors differ significantly from spec defaults.
 */

import type { ComponentSpec, ResolvedStyles } from './types';
import type { ElementStyles } from '../../ui/types/analysis';
import { SHADCN_COLORS } from './tokens';

/**
 * Known Shadcn colors for comparison (hex values)
 */
const KNOWN_SHADCN_COLORS = new Set(Object.values(SHADCN_COLORS));

/**
 * Parse a hex color to RGB values (0-255)
 */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Handle short hex format (#RGB)
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  // Must be 6 characters (or 8 with alpha, which we ignore)
  if (fullHex.length < 6) {
    return null;
  }

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }

  return { r, g, b };
}

/**
 * Compare two hex colors with tolerance
 *
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @param tolerance - Maximum difference per RGB channel (0-255, default 10)
 * @returns True if colors match within tolerance
 */
export function colorsMatch(color1: string, color2: string, tolerance: number = 10): boolean {
  const rgb1 = parseHex(color1);
  const rgb2 = parseHex(color2);

  if (!rgb1 || !rgb2) {
    // If either color is invalid, consider them not matching
    return false;
  }

  const rDiff = Math.abs(rgb1.r - rgb2.r);
  const gDiff = Math.abs(rgb1.g - rgb2.g);
  const bDiff = Math.abs(rgb1.b - rgb2.b);

  return rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance;
}

/**
 * Check if a color matches any known Shadcn color (within tolerance)
 */
function isKnownShadcnColor(color: string, tolerance: number = 10): boolean {
  for (const knownColor of KNOWN_SHADCN_COLORS) {
    if (knownColor === 'transparent') continue;
    if (colorsMatch(color, knownColor, tolerance)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve styles for a component by merging base, size, and variant styles
 *
 * Merge order follows CVA pattern: base -> size -> variant
 * Later values override earlier ones for the same property.
 *
 * @param spec - Component specification
 * @param variant - Variant name (e.g., "default", "outline")
 * @param size - Size name (e.g., "sm", "default", "lg")
 * @returns Merged ResolvedStyles ready to apply to Figma node
 */
export function resolveStyles(
  spec: ComponentSpec,
  variant: string,
  size: string
): ResolvedStyles {
  // Start with base styles
  const resolved: ResolvedStyles = {
    backgroundColor: spec.baseStyles.backgroundColor,
    borderWidth: spec.baseStyles.borderWidth,
    borderRadius: spec.baseStyles.borderRadius,
    fontWeight: spec.baseStyles.fontWeight,
    textAlign: spec.baseStyles.textAlign,
  };

  // Apply size styles (overrides base)
  const sizeStyles = spec.sizes[size] || spec.sizes[spec.defaultSize];
  if (sizeStyles) {
    if (sizeStyles.height !== undefined) resolved.height = sizeStyles.height;
    if (sizeStyles.paddingX !== undefined) resolved.paddingX = sizeStyles.paddingX;
    if (sizeStyles.paddingY !== undefined) resolved.paddingY = sizeStyles.paddingY;
    if (sizeStyles.fontSize !== undefined) resolved.fontSize = sizeStyles.fontSize;
    if (sizeStyles.borderRadius !== undefined) resolved.borderRadius = sizeStyles.borderRadius;
    if (sizeStyles.iconSize !== undefined) resolved.iconSize = sizeStyles.iconSize;
  }

  // Apply variant styles (overrides size and base)
  const variantStyles = spec.variants[variant] || spec.variants[spec.defaultVariant];
  if (variantStyles) {
    if (variantStyles.backgroundColor !== undefined) {
      resolved.backgroundColor = variantStyles.backgroundColor;
    }
    if (variantStyles.textColor !== undefined) {
      resolved.textColor = variantStyles.textColor;
    }
    if (variantStyles.borderColor !== undefined) {
      resolved.borderColor = variantStyles.borderColor;
    }
    if (variantStyles.borderWidth !== undefined) {
      resolved.borderWidth = variantStyles.borderWidth;
    }
    if (variantStyles.shadow !== undefined) {
      resolved.shadow = variantStyles.shadow;
    }
    if (variantStyles.textDecoration !== undefined) {
      resolved.textDecoration = variantStyles.textDecoration;
    }
  }

  return resolved;
}

/**
 * Merge resolved styles with AI-detected element styles
 *
 * Preserves AI-detected colors when they differ significantly from
 * standard Shadcn colors. This allows custom-themed screenshots to
 * retain their unique colors while standard Shadcn UIs get spec colors.
 *
 * @param resolved - Styles resolved from component spec
 * @param elementStyles - Styles detected by AI from screenshot
 * @returns Merged styles, preferring AI colors when they're non-standard
 */
export function mergeWithOverrides(
  resolved: ResolvedStyles,
  elementStyles: ElementStyles
): ResolvedStyles {
  const merged: ResolvedStyles = { ...resolved };

  // Check if AI-detected background color differs from known Shadcn colors
  if (elementStyles.backgroundColor) {
    const isStandard = isKnownShadcnColor(elementStyles.backgroundColor);
    if (!isStandard) {
      // AI detected a custom color - use it
      merged.backgroundColor = elementStyles.backgroundColor;
    }
  }

  // Check if AI-detected text color differs from known Shadcn colors
  if (elementStyles.textColor) {
    const isStandard = isKnownShadcnColor(elementStyles.textColor);
    if (!isStandard) {
      // AI detected a custom color - use it
      merged.textColor = elementStyles.textColor;
    }
  }

  // Check if AI-detected border color differs from known Shadcn colors
  if (elementStyles.borderColor) {
    const isStandard = isKnownShadcnColor(elementStyles.borderColor);
    if (!isStandard) {
      // AI detected a custom color - use it
      merged.borderColor = elementStyles.borderColor;
    }
  }

  // Always use AI-detected font properties if provided
  // (these are specific to the screenshot, not Shadcn defaults)
  if (elementStyles.fontSize !== undefined) {
    merged.fontSize = elementStyles.fontSize;
  }
  if (elementStyles.fontWeight !== undefined) {
    merged.fontWeight = elementStyles.fontWeight;
  }

  // Use AI-detected border radius if provided (component might be customized)
  if (elementStyles.borderRadius !== undefined) {
    merged.borderRadius = elementStyles.borderRadius;
  }

  return merged;
}
