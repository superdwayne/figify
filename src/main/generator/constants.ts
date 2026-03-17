/**
 * Centralized constants for pixel-perfect accuracy
 *
 * All tolerance values and thresholds used across the generator system.
 * Centralizing these ensures consistent behavior and easy tuning.
 */

/**
 * Tolerance values for spatial detection and coordinate handling
 */
export const TOLERANCES = {
  /**
   * Tolerance for containment checks (is element inside another?)
   * Used in coordinate conversion and hierarchy building.
   * Smaller = stricter containment requirements
   */
  CONTAINMENT: 2,

  /**
   * Tolerance for row detection (elements within this Y range are same row)
   * Based on center-point grouping
   */
  ROW_GROUPING: 15,

  /**
   * Tolerance for column detection (elements within this X range are same column)
   * Based on center-point grouping
   */
  COLUMN_GROUPING: 15,

  /**
   * Tolerance for grid spacing consistency validation
   */
  GRID_SPACING: 10,

  /**
   * Tolerance for alignment detection (are elements aligned on an axis?)
   */
  ALIGNMENT: 10,

  /**
   * Floating-point precision tolerance for coordinate comparisons
   */
  FLOAT_PRECISION: 0.5,
} as const;

/**
 * Layout detection thresholds
 */
export const LAYOUT_THRESHOLDS = {
  /**
   * Minimum variance ratio to determine dominant layout direction
   * If X variance / Y variance > this, layout is horizontal
   */
  DIRECTION_VARIANCE_RATIO: 2,

  /**
   * Minimum elements needed to detect a pattern (row, column, grid)
   */
  MIN_GROUP_SIZE: 2,

  /**
   * Minimum coverage ratio for pattern to be valid
   * (detected pattern must include at least this % of siblings)
   */
  MIN_COVERAGE_RATIO: 0.5,

  /**
   * Maximum spacing variance allowed within a group
   * (max gap can be this multiple of min gap)
   */
  MAX_SPACING_VARIANCE: 2,

  /**
   * Maximum size variance for elements in a group
   * (sizes must be within this % of each other)
   */
  MAX_SIZE_VARIANCE: 0.8,

  /**
   * Fill threshold - when child dimension is >= this % of parent,
   * use FILL sizing mode instead of FIXED
   */
  FILL_THRESHOLD: 0.9,
} as const;

/**
 * Round a number to nearest pixel for Figma
 * Figma works in whole pixels - sub-pixel values cause rendering issues
 */
export function roundToPixel(value: number): number {
  return Math.round(value);
}

/**
 * Round bounds to pixel values
 */
export function roundBounds(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } {
  return {
    x: roundToPixel(bounds.x),
    y: roundToPixel(bounds.y),
    width: Math.max(1, roundToPixel(bounds.width)),
    height: Math.max(1, roundToPixel(bounds.height)),
  };
}
