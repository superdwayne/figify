/**
 * SpatialAnalyzer - Detects spatial relationships and patterns between UI elements
 *
 * This analyzer provides:
 * - Containment detection (which elements are inside others)
 * - Row grouping (elements with similar Y positions)
 * - Column grouping (elements with similar X positions)
 * - Grid pattern detection (regular 2D arrangements)
 *
 * Used in Pass 2 of the two-pass generation system to build proper
 * element hierarchy from flat element lists.
 */

import type { Bounds, UIElement } from './types';
import { isContainedWithin } from './coordinateUtils';
import { TOLERANCES, LAYOUT_THRESHOLDS } from './constants';

/**
 * Tolerance values for spatial detection (using centralized constants)
 */
const DEFAULTS = {
  /** Tolerance for row detection (elements within this Y range are same row) */
  ROW_TOLERANCE: TOLERANCES.ROW_GROUPING,
  /** Tolerance for column detection (elements within this X range are same column) */
  COLUMN_TOLERANCE: TOLERANCES.COLUMN_GROUPING,
  /** Tolerance for containment (allows slight overlap at edges) */
  CONTAINMENT_TOLERANCE: TOLERANCES.CONTAINMENT,
  /** Minimum overlap percentage to consider elements part of same group */
  OVERLAP_THRESHOLD: 0.5,
  /** Tolerance for grid spacing consistency */
  GRID_SPACING_TOLERANCE: TOLERANCES.GRID_SPACING,
};

/**
 * A group of spatially related elements
 */
export interface SpatialGroup {
  /** Unique identifier for the group */
  id: string;
  /** Type of spatial relationship */
  type: 'row' | 'column' | 'grid' | 'container';
  /** Bounding box encompassing all group members */
  bounds: Bounds;
  /** Elements in this group */
  members: UIElement[];
  /** Calculated spacing between members (if uniform) */
  spacing: number;
  /** For grids: number of columns */
  columns?: number;
  /** For grids: number of rows */
  rows?: number;
}

/**
 * A node in the containment hierarchy tree
 */
export interface ContainmentNode {
  /** The element at this node */
  element: UIElement;
  /** Child elements contained within this element */
  children: ContainmentNode[];
  /** Depth in the containment tree (0 = root level) */
  depth: number;
}

/**
 * Grid detection result
 */
export interface GridPattern {
  /** Whether a valid grid was detected */
  isGrid: boolean;
  /** Number of rows in the grid */
  rowCount: number;
  /** Number of columns in the grid */
  columnCount: number;
  /** Horizontal spacing between columns */
  horizontalSpacing: number;
  /** Vertical spacing between rows */
  verticalSpacing: number;
  /** Elements organized by row, then column */
  cells: UIElement[][];
}

/**
 * Main spatial analysis class
 */
export class SpatialAnalyzer {
  private rowTolerance: number;
  private columnTolerance: number;
  private containmentTolerance: number;
  private groupCounter: number = 0;

  constructor(options: {
    rowTolerance?: number;
    columnTolerance?: number;
    containmentTolerance?: number;
  } = {}) {
    this.rowTolerance = options.rowTolerance ?? DEFAULTS.ROW_TOLERANCE;
    this.columnTolerance = options.columnTolerance ?? DEFAULTS.COLUMN_TOLERANCE;
    this.containmentTolerance = options.containmentTolerance ?? DEFAULTS.CONTAINMENT_TOLERANCE;
  }

  /**
   * Build a containment tree from a flat list of elements
   * 
   * Elements that are spatially contained within other elements become
   * children in the tree. This is used to automatically detect parent-child
   * relationships when Claude's analysis doesn't provide explicit hierarchy.
   *
   * @param elements - Flat list of UI elements
   * @returns Array of root-level containment nodes (elements not inside others)
   */
  buildContainmentTree(elements: UIElement[]): ContainmentNode[] {
    if (elements.length === 0) return [];
    if (elements.length === 1) {
      return [{ element: elements[0], children: [], depth: 0 }];
    }

    // Sort by area (largest first) - larger elements are more likely to be containers
    const sortedByArea = [...elements].sort((a, b) => {
      const areaA = a.bounds.width * a.bounds.height;
      const areaB = b.bounds.width * b.bounds.height;
      return areaB - areaA;
    });

    // Track which elements have been assigned as children
    const assignedAsChild = new Set<string>();

    // Build containment relationships
    const nodeMap = new Map<string, ContainmentNode>();
    
    // Create nodes for all elements
    for (const element of sortedByArea) {
      nodeMap.set(element.id, {
        element,
        children: [],
        depth: 0,
      });
    }

    // Find parent for each element (smallest containing element)
    for (const child of sortedByArea) {
      let bestParent: UIElement | null = null;
      let smallestParentArea = Infinity;

      for (const potential of sortedByArea) {
        // Skip self
        if (potential.id === child.id) continue;
        
        // Skip if potential parent is smaller than child
        const potentialArea = potential.bounds.width * potential.bounds.height;
        const childArea = child.bounds.width * child.bounds.height;
        if (potentialArea <= childArea) continue;

        // Check if child is contained within potential parent
        if (this.isFullyContained(child.bounds, potential.bounds)) {
          // Find the smallest container (most immediate parent)
          if (potentialArea < smallestParentArea) {
            smallestParentArea = potentialArea;
            bestParent = potential;
          }
        }
      }

      // Assign to best parent if found
      if (bestParent) {
        const parentNode = nodeMap.get(bestParent.id)!;
        const childNode = nodeMap.get(child.id)!;
        parentNode.children.push(childNode);
        assignedAsChild.add(child.id);
      }
    }

    // Calculate depths
    const calculateDepths = (node: ContainmentNode, depth: number): void => {
      node.depth = depth;
      for (const child of node.children) {
        calculateDepths(child, depth + 1);
      }
    };

    // Collect root nodes (not assigned as children)
    const roots: ContainmentNode[] = [];
    for (const element of sortedByArea) {
      if (!assignedAsChild.has(element.id)) {
        const node = nodeMap.get(element.id)!;
        calculateDepths(node, 0);
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Detect rows - groups of elements with similar Y positions
   *
   * @param elements - Elements to analyze
   * @param tolerance - Y position tolerance for grouping (default: 10px)
   * @returns Array of row groups, sorted top to bottom
   */
  detectRows(elements: UIElement[], tolerance: number = this.rowTolerance): SpatialGroup[] {
    if (elements.length === 0) return [];
    if (elements.length === 1) {
      return [this.createGroup('row', elements, 0)];
    }

    // Sort by Y center position
    const sorted = [...elements].sort((a, b) => {
      const centerA = a.bounds.y + a.bounds.height / 2;
      const centerB = b.bounds.y + b.bounds.height / 2;
      return centerA - centerB;
    });

    const rows: SpatialGroup[] = [];
    let currentRow: UIElement[] = [sorted[0]];
    let currentRowCenterY = sorted[0].bounds.y + sorted[0].bounds.height / 2;

    for (let i = 1; i < sorted.length; i++) {
      const element = sorted[i];
      const centerY = element.bounds.y + element.bounds.height / 2;

      // Check if element belongs to current row
      if (Math.abs(centerY - currentRowCenterY) <= tolerance) {
        currentRow.push(element);
        // Update row center as average of all members
        currentRowCenterY = this.averageY(currentRow);
      } else {
        // Start new row
        rows.push(this.createGroup('row', currentRow, this.calculateHorizontalSpacing(currentRow)));
        currentRow = [element];
        currentRowCenterY = centerY;
      }
    }

    // Add final row
    if (currentRow.length > 0) {
      rows.push(this.createGroup('row', currentRow, this.calculateHorizontalSpacing(currentRow)));
    }

    return rows;
  }

  /**
   * Detect columns - groups of elements with similar X positions
   *
   * @param elements - Elements to analyze
   * @param tolerance - X position tolerance for grouping (default: 10px)
   * @returns Array of column groups, sorted left to right
   */
  detectColumns(elements: UIElement[], tolerance: number = this.columnTolerance): SpatialGroup[] {
    if (elements.length === 0) return [];
    if (elements.length === 1) {
      return [this.createGroup('column', elements, 0)];
    }

    // Sort by X center position
    const sorted = [...elements].sort((a, b) => {
      const centerA = a.bounds.x + a.bounds.width / 2;
      const centerB = b.bounds.x + b.bounds.width / 2;
      return centerA - centerB;
    });

    const columns: SpatialGroup[] = [];
    let currentColumn: UIElement[] = [sorted[0]];
    let currentColumnCenterX = sorted[0].bounds.x + sorted[0].bounds.width / 2;

    for (let i = 1; i < sorted.length; i++) {
      const element = sorted[i];
      const centerX = element.bounds.x + element.bounds.width / 2;

      // Check if element belongs to current column
      if (Math.abs(centerX - currentColumnCenterX) <= tolerance) {
        currentColumn.push(element);
        // Update column center as average of all members
        currentColumnCenterX = this.averageX(currentColumn);
      } else {
        // Start new column
        columns.push(this.createGroup('column', currentColumn, this.calculateVerticalSpacing(currentColumn)));
        currentColumn = [element];
        currentColumnCenterX = centerX;
      }
    }

    // Add final column
    if (currentColumn.length > 0) {
      columns.push(this.createGroup('column', currentColumn, this.calculateVerticalSpacing(currentColumn)));
    }

    return columns;
  }

  /**
   * Detect grid pattern - elements arranged in regular rows and columns
   *
   * @param elements - Elements to analyze
   * @returns GridPattern with detection results, or null if no grid found
   */
  detectGrid(elements: UIElement[]): GridPattern | null {
    if (elements.length < 4) return null; // Need at least 2x2 for a grid

    // First, detect rows
    const rows = this.detectRows(elements);
    if (rows.length < 2) return null; // Need at least 2 rows

    // Check if all rows have similar column positions
    const rowColumnPositions: number[][] = [];

    for (const row of rows) {
      // Sort row members by X position
      const sortedMembers = [...row.members].sort((a, b) => a.bounds.x - b.bounds.x);
      const columnCenters = sortedMembers.map(el => el.bounds.x + el.bounds.width / 2);
      rowColumnPositions.push(columnCenters);
    }

    // Check if column counts match
    const columnCounts = rowColumnPositions.map(positions => positions.length);
    const uniqueCounts = new Set(columnCounts);
    
    // Allow some variance (incomplete last row in a grid)
    if (uniqueCounts.size > 2) return null;
    
    // Get the most common column count
    const columnCount = Math.max(...columnCounts);
    if (columnCount < 2) return null;

    // Check if column positions are consistent across rows
    const fullRows = rowColumnPositions.filter(positions => positions.length === columnCount);
    if (fullRows.length < 2) return null;

    // Calculate average column positions from full rows
    const avgColumnPositions: number[] = [];
    for (let col = 0; col < columnCount; col++) {
      const positions = fullRows.map(row => row[col]);
      avgColumnPositions.push(this.average(positions));
    }

    // Check consistency of column positions across rows
    for (const rowPositions of fullRows) {
      for (let col = 0; col < columnCount; col++) {
        if (Math.abs(rowPositions[col] - avgColumnPositions[col]) > DEFAULTS.GRID_SPACING_TOLERANCE) {
          return null; // Columns not aligned
        }
      }
    }

    // Calculate spacing
    const horizontalSpacing = columnCount > 1
      ? this.calculateAverageGap(avgColumnPositions)
      : 0;

    const rowCenters = rows.map(row => {
      const centers = row.members.map(el => el.bounds.y + el.bounds.height / 2);
      return this.average(centers);
    });
    const verticalSpacing = rows.length > 1
      ? this.calculateAverageGap(rowCenters)
      : 0;

    // Organize elements into cells
    const cells: UIElement[][] = rows.map(row => {
      return [...row.members].sort((a, b) => a.bounds.x - b.bounds.x);
    });

    return {
      isGrid: true,
      rowCount: rows.length,
      columnCount,
      horizontalSpacing,
      verticalSpacing,
      cells,
    };
  }

  /**
   * Find the containing parent element for a group
   *
   * @param group - The spatial group to find a parent for
   * @param candidates - Potential parent elements
   * @returns The best containing parent, or null if none found
   */
  findContainingParent(group: SpatialGroup, candidates: UIElement[]): UIElement | null {
    let bestParent: UIElement | null = null;
    let smallestArea = Infinity;

    for (const candidate of candidates) {
      // Skip elements that are members of the group
      if (group.members.some(m => m.id === candidate.id)) continue;

      // Check if candidate contains the entire group bounds
      if (this.isFullyContained(group.bounds, candidate.bounds)) {
        const area = candidate.bounds.width * candidate.bounds.height;
        if (area < smallestArea) {
          smallestArea = area;
          bestParent = candidate;
        }
      }
    }

    return bestParent;
  }

  /**
   * Get elements that are not contained within any other element
   * These are the root-level elements for the containment tree
   */
  getRootElements(elements: UIElement[]): UIElement[] {
    const tree = this.buildContainmentTree(elements);
    return tree.map(node => node.element);
  }

  /**
   * Flatten a containment tree back to a list with proper parent-child IDs set
   */
  flattenWithHierarchy(roots: ContainmentNode[]): UIElement[] {
    const result: UIElement[] = [];

    const traverse = (node: ContainmentNode): void => {
      // Create a copy of the element with children IDs
      const element: UIElement = {
        ...node.element,
        children: node.children.map(child => child.element.id),
      };
      result.push(element);

      // Traverse children
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const root of roots) {
      traverse(root);
    }

    return result;
  }

  // ============ Private Helper Methods ============

  /**
   * Check if child bounds are fully contained within parent bounds
   */
  private isFullyContained(child: Bounds, parent: Bounds): boolean {
    return isContainedWithin(child, parent, this.containmentTolerance);
  }

  /**
   * Create a spatial group from elements
   */
  private createGroup(
    type: 'row' | 'column' | 'grid' | 'container',
    members: UIElement[],
    spacing: number
  ): SpatialGroup {
    this.groupCounter++;
    return {
      id: `${type}-${this.groupCounter}`,
      type,
      bounds: this.calculateBounds(members),
      members,
      spacing,
    };
  }

  /**
   * Calculate bounding box encompassing all elements
   */
  private calculateBounds(elements: UIElement[]): Bounds {
    if (elements.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const el of elements) {
      minX = Math.min(minX, el.bounds.x);
      minY = Math.min(minY, el.bounds.y);
      maxX = Math.max(maxX, el.bounds.x + el.bounds.width);
      maxY = Math.max(maxY, el.bounds.y + el.bounds.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Calculate average Y center position of elements
   */
  private averageY(elements: UIElement[]): number {
    if (elements.length === 0) return 0;
    const sum = elements.reduce((acc, el) => acc + el.bounds.y + el.bounds.height / 2, 0);
    return sum / elements.length;
  }

  /**
   * Calculate average X center position of elements
   */
  private averageX(elements: UIElement[]): number {
    if (elements.length === 0) return 0;
    const sum = elements.reduce((acc, el) => acc + el.bounds.x + el.bounds.width / 2, 0);
    return sum / elements.length;
  }

  /**
   * Calculate average of numbers
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate horizontal spacing between elements in a row
   */
  private calculateHorizontalSpacing(elements: UIElement[]): number {
    if (elements.length < 2) return 0;

    // Sort by X position
    const sorted = [...elements].sort((a, b) => a.bounds.x - b.bounds.x);
    
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gap = next.bounds.x - (current.bounds.x + current.bounds.width);
      if (gap > 0) {
        gaps.push(gap);
      }
    }

    if (gaps.length === 0) return 0;
    return Math.round(this.average(gaps));
  }

  /**
   * Calculate vertical spacing between elements in a column
   */
  private calculateVerticalSpacing(elements: UIElement[]): number {
    if (elements.length < 2) return 0;

    // Sort by Y position
    const sorted = [...elements].sort((a, b) => a.bounds.y - b.bounds.y);
    
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const gap = next.bounds.y - (current.bounds.y + current.bounds.height);
      if (gap > 0) {
        gaps.push(gap);
      }
    }

    if (gaps.length === 0) return 0;
    return Math.round(this.average(gaps));
  }

  /**
   * Calculate average gap between sorted position values
   */
  private calculateAverageGap(sortedPositions: number[]): number {
    if (sortedPositions.length < 2) return 0;

    const gaps: number[] = [];
    for (let i = 0; i < sortedPositions.length - 1; i++) {
      gaps.push(sortedPositions[i + 1] - sortedPositions[i]);
    }

    return Math.round(this.average(gaps));
  }

  /**
   * Reset internal counters for memory cleanup
   *
   * Resets the group counter to prevent ID accumulation across
   * multiple generation runs.
   */
  reset(): void {
    this.groupCounter = 0;
  }
}
