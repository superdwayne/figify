/**
 * LayoutAnalyzer - Detects layout patterns from element positions
 *
 * Analyzes child element bounds to determine:
 * - Layout direction (horizontal vs vertical)
 * - Item spacing between children
 * - Padding from parent bounds
 * - Alignment patterns
 */

import type { Bounds, UIElement, LayoutConfig } from './types';

// Re-export LayoutConfig for consumers
export type { LayoutConfig };

/**
 * Default layout config when layout cannot be determined
 */
const DEFAULT_LAYOUT: LayoutConfig = {
  mode: 'NONE',
  primaryAxisAlignItems: 'MIN',
  counterAxisAlignItems: 'MIN',
  itemSpacing: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  primaryAxisSizingMode: 'FIXED',
  counterAxisSizingMode: 'FIXED',
};

/**
 * Threshold for determining if elements are aligned on an axis (in pixels)
 */
const ALIGNMENT_THRESHOLD = 5;

/**
 * Minimum variance ratio to determine dominant direction
 */
const DIRECTION_VARIANCE_RATIO = 2;

/**
 * Analyzer class for detecting layout patterns
 */
export class LayoutAnalyzer {
  // Scale factor reserved for future use (retina normalization)
  private _scaleFactor: number;

  constructor(scaleFactor: number = 1) {
    this._scaleFactor = scaleFactor;
  }

  get scaleFactor(): number {
    return this._scaleFactor;
  }

  /**
   * Analyze children elements to determine layout configuration
   */
  analyzeLayout(parentBounds: Bounds, children: UIElement[]): LayoutConfig {
    // Single or no children - no auto layout needed
    if (children.length < 2) {
      return {
        ...DEFAULT_LAYOUT,
        padding: this.calculatePaddingFromSingleChild(parentBounds, children[0]),
      };
    }

    // Sort children by position for analysis
    const sortedByX = [...children].sort((a, b) => a.bounds.x - b.bounds.x);
    const sortedByY = [...children].sort((a, b) => a.bounds.y - b.bounds.y);

    // Detect layout direction
    const direction = this.detectLayoutDirection(children);

    if (direction === 'NONE') {
      return DEFAULT_LAYOUT;
    }

    // Calculate spacing based on direction
    const itemSpacing = this.calculateItemSpacing(
      direction === 'HORIZONTAL' ? sortedByX : sortedByY,
      direction
    );

    // Calculate padding
    const padding = this.calculatePadding(parentBounds, children, direction);

    // Detect alignment
    const { primaryAlignment, counterAlignment } = this.detectAlignment(
      parentBounds,
      children,
      direction
    );

    return {
      mode: direction,
      primaryAxisAlignItems: primaryAlignment,
      counterAxisAlignItems: counterAlignment,
      itemSpacing,
      padding,
      primaryAxisSizingMode: 'FIXED',
      counterAxisSizingMode: 'FIXED',
    };
  }

  /**
   * Detect if children are arranged horizontally or vertically
   * Uses position variance to determine dominant direction
   */
  private detectLayoutDirection(children: UIElement[]): 'HORIZONTAL' | 'VERTICAL' | 'NONE' {
    if (children.length < 2) return 'NONE';

    // Calculate center points of each child
    const centers = children.map((child) => ({
      x: child.bounds.x + child.bounds.width / 2,
      y: child.bounds.y + child.bounds.height / 2,
    }));

    // Calculate variance in X and Y positions
    const xValues = centers.map((c) => c.x);
    const yValues = centers.map((c) => c.y);

    const xVariance = this.calculateVariance(xValues);
    const yVariance = this.calculateVariance(yValues);

    // Check if elements are roughly aligned horizontally (low Y variance)
    const yRange = Math.max(...yValues) - Math.min(...yValues);
    const xRange = Math.max(...xValues) - Math.min(...xValues);

    // If all elements have similar Y positions, it's horizontal
    if (yRange < ALIGNMENT_THRESHOLD && xRange > ALIGNMENT_THRESHOLD) {
      return 'HORIZONTAL';
    }

    // If all elements have similar X positions, it's vertical
    if (xRange < ALIGNMENT_THRESHOLD && yRange > ALIGNMENT_THRESHOLD) {
      return 'VERTICAL';
    }

    // Use variance ratio to determine dominant direction
    if (xVariance > yVariance * DIRECTION_VARIANCE_RATIO) {
      return 'HORIZONTAL';
    }
    if (yVariance > xVariance * DIRECTION_VARIANCE_RATIO) {
      return 'VERTICAL';
    }

    // If variance is similar, use range to determine
    if (xRange > yRange) {
      return 'HORIZONTAL';
    }
    if (yRange > xRange) {
      return 'VERTICAL';
    }

    return 'NONE';
  }

  /**
   * Calculate spacing between consecutive children
   */
  private calculateItemSpacing(
    sortedChildren: UIElement[],
    direction: 'HORIZONTAL' | 'VERTICAL'
  ): number {
    if (sortedChildren.length < 2) return 0;

    const gaps: number[] = [];

    for (let i = 0; i < sortedChildren.length - 1; i++) {
      const current = sortedChildren[i];
      const next = sortedChildren[i + 1];

      let gap: number;
      if (direction === 'HORIZONTAL') {
        // Gap is distance from right edge of current to left edge of next
        gap = next.bounds.x - (current.bounds.x + current.bounds.width);
      } else {
        // Gap is distance from bottom edge of current to top edge of next
        gap = next.bounds.y - (current.bounds.y + current.bounds.height);
      }

      // Only count positive gaps (ignore overlapping elements)
      if (gap > 0) {
        gaps.push(gap);
      }
    }

    if (gaps.length === 0) return 0;

    // Use median gap to be resilient to outliers
    const sortedGaps = [...gaps].sort((a, b) => a - b);
    const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];

    // Round to nearest pixel
    return Math.round(medianGap);
  }

  /**
   * Calculate padding from parent bounds to children
   */
  private calculatePadding(
    parentBounds: Bounds,
    children: UIElement[],
    _direction: 'HORIZONTAL' | 'VERTICAL'
  ): { top: number; right: number; bottom: number; left: number } {
    // Find bounding box of all children
    const bounds = this.getChildrenBoundingBox(children);

    // Calculate padding from parent to children bounding box
    const top = Math.max(0, Math.round(bounds.minY - parentBounds.y));
    const left = Math.max(0, Math.round(bounds.minX - parentBounds.x));
    const bottom = Math.max(
      0,
      Math.round(parentBounds.y + parentBounds.height - bounds.maxY)
    );
    const right = Math.max(
      0,
      Math.round(parentBounds.x + parentBounds.width - bounds.maxX)
    );

    return { top, right, bottom, left };
  }

  /**
   * Calculate padding when there's only one child
   */
  private calculatePaddingFromSingleChild(
    parentBounds: Bounds,
    child?: UIElement
  ): { top: number; right: number; bottom: number; left: number } {
    if (!child) {
      return { top: 0, right: 0, bottom: 0, left: 0 };
    }

    const top = Math.max(0, Math.round(child.bounds.y - parentBounds.y));
    const left = Math.max(0, Math.round(child.bounds.x - parentBounds.x));
    const bottom = Math.max(
      0,
      Math.round(parentBounds.y + parentBounds.height - (child.bounds.y + child.bounds.height))
    );
    const right = Math.max(
      0,
      Math.round(parentBounds.x + parentBounds.width - (child.bounds.x + child.bounds.width))
    );

    return { top, right, bottom, left };
  }

  /**
   * Detect alignment of children within parent
   */
  private detectAlignment(
    parentBounds: Bounds,
    children: UIElement[],
    direction: 'HORIZONTAL' | 'VERTICAL'
  ): {
    primaryAlignment: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    counterAlignment: 'MIN' | 'CENTER' | 'MAX';
  } {
    const padding = this.calculatePadding(parentBounds, children, direction);

    // Determine counter axis alignment (perpendicular to layout direction)
    let counterAlignment: 'MIN' | 'CENTER' | 'MAX' = 'MIN';

    if (direction === 'HORIZONTAL') {
      // Check vertical alignment
      const topSpace = padding.top;
      const bottomSpace = padding.bottom;
      counterAlignment = this.getAlignmentFromSpacing(topSpace, bottomSpace);
    } else {
      // Check horizontal alignment
      const leftSpace = padding.left;
      const rightSpace = padding.right;
      counterAlignment = this.getAlignmentFromSpacing(leftSpace, rightSpace);
    }

    // Determine primary axis alignment
    let primaryAlignment: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' = 'MIN';

    if (direction === 'HORIZONTAL') {
      const leftSpace = padding.left;
      const rightSpace = padding.right;
      
      // Check for space-between pattern (significant space on both sides)
      // If children are evenly distributed with equal padding, use space-between
      if (children.length >= 2 && leftSpace > 5 && rightSpace > 5 && 
          Math.abs(leftSpace - rightSpace) < ALIGNMENT_THRESHOLD) {
        primaryAlignment = 'SPACE_BETWEEN';
      } else {
        primaryAlignment = this.getAlignmentFromSpacing(leftSpace, rightSpace);
      }
    } else {
      const topSpace = padding.top;
      const bottomSpace = padding.bottom;
      primaryAlignment = this.getAlignmentFromSpacing(topSpace, bottomSpace);
    }

    return { primaryAlignment, counterAlignment };
  }

  /**
   * Determine alignment from spacing on both sides
   */
  private getAlignmentFromSpacing(
    startSpace: number,
    endSpace: number
  ): 'MIN' | 'CENTER' | 'MAX' {
    const diff = Math.abs(startSpace - endSpace);

    // If spacing is roughly equal, it's centered
    if (diff < ALIGNMENT_THRESHOLD) {
      return 'CENTER';
    }

    // More space at start means alignment toward end (MAX)
    if (startSpace > endSpace) {
      return 'MAX';
    }

    // More space at end means alignment toward start (MIN)
    return 'MIN';
  }

  /**
   * Get bounding box encompassing all children
   */
  private getChildrenBoundingBox(children: UIElement[]): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    if (children.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const child of children) {
      minX = Math.min(minX, child.bounds.x);
      minY = Math.min(minY, child.bounds.y);
      maxX = Math.max(maxX, child.bounds.x + child.bounds.width);
      maxY = Math.max(maxY, child.bounds.y + child.bounds.height);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Calculate variance of a set of numbers
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Determine if a frame should have Auto Layout applied
   * Returns true if children suggest a clear layout pattern
   */
  shouldApplyAutoLayout(children: UIElement[]): boolean {
    if (children.length < 2) {
      // Single child can still benefit from Auto Layout for padding
      return children.length === 1;
    }

    const direction = this.detectLayoutDirection(children);
    return direction !== 'NONE';
  }
}
