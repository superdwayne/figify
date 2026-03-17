/**
 * Coordinate Utilities - Convert between absolute and relative coordinate systems
 *
 * Claude's analysis returns absolute coordinates (relative to screenshot origin 0,0).
 * When elements are nested inside parent frames in Figma, they need relative coordinates
 * (relative to their parent's origin).
 *
 * All outputs are rounded to whole pixels for Figma compatibility.
 */

import type { Bounds } from './types';
import { TOLERANCES, roundToPixel } from './constants';

/**
 * Convert absolute bounds to parent-relative bounds
 *
 * @param childBounds - The child element's absolute bounds (from Claude)
 * @param parentBounds - The parent element's absolute bounds
 * @returns Bounds relative to the parent's origin
 *
 * @example
 * // Parent at (200, 100), child at (220, 120)
 * // Child should be at (20, 20) relative to parent
 * toRelativeBounds(
 *   { x: 220, y: 120, width: 100, height: 50 },
 *   { x: 200, y: 100, width: 300, height: 200 }
 * )
 * // Returns: { x: 20, y: 20, width: 100, height: 50 }
 */
export function toRelativeBounds(
  childBounds: Bounds,
  parentBounds: Bounds
): Bounds {
  return {
    x: roundToPixel(childBounds.x - parentBounds.x),
    y: roundToPixel(childBounds.y - parentBounds.y),
    width: roundToPixel(childBounds.width),
    height: roundToPixel(childBounds.height),
  };
}

/**
 * Check if child bounds are fully contained within parent bounds
 *
 * @param child - The child element's bounds
 * @param parent - The parent element's bounds
 * @param tolerance - Pixel tolerance for edge detection (default: TOLERANCES.CONTAINMENT)
 * @returns true if child is fully contained within parent
 */
export function isContainedWithin(
  child: Bounds,
  parent: Bounds,
  tolerance: number = TOLERANCES.CONTAINMENT
): boolean {
  return (
    child.x >= parent.x - tolerance &&
    child.y >= parent.y - tolerance &&
    child.x + child.width <= parent.x + parent.width + tolerance &&
    child.y + child.height <= parent.y + parent.height + tolerance
  );
}

/**
 * Validate that relative bounds are non-negative
 * (child should be inside parent, not outside)
 *
 * @param relativeBounds - Bounds that have been converted to relative coordinates
 * @returns true if the relative position is valid (non-negative)
 */
export function isValidRelativeBounds(relativeBounds: Bounds): boolean {
  return relativeBounds.x >= 0 && relativeBounds.y >= 0;
}

/**
 * Clamp relative bounds to ensure they stay within parent
 * This is a safety measure for edge cases where Claude's analysis
 * might have slight inaccuracies.
 *
 * @param relativeBounds - Bounds relative to parent
 * @param parentWidth - Parent's width
 * @param parentHeight - Parent's height
 * @param elementName - Optional element name for logging
 * @returns Clamped bounds that fit within parent
 */
export function clampRelativeBounds(
  relativeBounds: Bounds,
  parentWidth: number,
  parentHeight: number,
  elementName?: string
): Bounds {
  const originalX = relativeBounds.x;
  const originalY = relativeBounds.y;
  const originalWidth = relativeBounds.width;
  const originalHeight = relativeBounds.height;

  // Ensure x,y are not negative
  const x = roundToPixel(Math.max(0, originalX));
  const y = roundToPixel(Math.max(0, originalY));

  // Ensure element doesn't extend beyond parent
  const maxWidth = parentWidth - x;
  const maxHeight = parentHeight - y;

  const width = roundToPixel(Math.max(1, Math.min(originalWidth, maxWidth)));
  const height = roundToPixel(Math.max(1, Math.min(originalHeight, maxHeight)));

  // Log if clamping changed dimensions significantly (more than 1px)
  const xClamped = Math.abs(x - originalX) > 1;
  const yClamped = Math.abs(y - originalY) > 1;
  const widthClamped = Math.abs(width - originalWidth) > 1;
  const heightClamped = Math.abs(height - originalHeight) > 1;

  if (xClamped || yClamped || widthClamped || heightClamped) {
    const name = elementName || 'Element';
    console.log(
      `[CoordinateUtils] Clamped ${name}: ` +
        `pos (${originalX.toFixed(1)}, ${originalY.toFixed(1)}) → (${x}, ${y}), ` +
        `size (${originalWidth.toFixed(1)}×${originalHeight.toFixed(1)}) → (${width}×${height})`
    );
  }

  return { x, y, width, height };
}
