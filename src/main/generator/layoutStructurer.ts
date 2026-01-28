/**
 * LayoutStructurer - Orchestrates Pass 2 of two-pass generation
 *
 * Uses SpatialAnalyzer to detect patterns in flat element lists and
 * creates virtual containers to establish proper hierarchy for Auto Layout.
 *
 * Flow:
 * 1. Analyze containment relationships (which elements are inside others)
 * 2. For sibling elements at each level, detect row/column/grid patterns
 * 3. Create virtual containers to group related elements
 * 4. Return structured result with updated hierarchy
 */

import type {
  UIElement,
  Bounds,
  VirtualContainer,
  StructuredResult,
  StructuredResultMetadata,
  SpatialGroup,
  GridPattern,
  ContainmentNode,
} from './types';
import { SpatialAnalyzer } from './spatialAnalyzer';

/**
 * Minimum elements needed to form a meaningful group
 * Increased from 2 to 3 - rows/columns with 2 elements are often false positives
 */
const MIN_GROUP_SIZE = 3;

/**
 * Minimum coverage ratio to create containers
 * Only create containers when pattern covers at least 70% of sibling elements
 */
const MIN_COVERAGE_RATIO = 0.7;

/**
 * Maximum ratio between largest and smallest gaps for uniform spacing
 * E.g., 2 means max gap can be at most 2x the min gap
 */
const MAX_SPACING_VARIANCE = 2;

/**
 * Maximum size variance for consistent element sizes
 * E.g., 0.5 means heights (for rows) or widths (for columns) must be within 50%
 */
const MAX_SIZE_VARIANCE = 0.5;

/**
 * Counter for generating unique container IDs
 */
let containerCounter = 0;

/**
 * Generate a unique container ID
 */
function generateContainerId(type: string): string {
  containerCounter++;
  return `virtual-${type}-${containerCounter}`;
}

/**
 * Reset container counter (for testing or new sessions)
 */
export function resetContainerCounter(): void {
  containerCounter = 0;
}

/**
 * Main class for restructuring flat element lists into hierarchical layouts
 */
export class LayoutStructurer {
  private analyzer: SpatialAnalyzer;

  constructor() {
    this.analyzer = new SpatialAnalyzer();
  }

  /**
   * Main entry point - restructure flat elements into proper hierarchy
   *
   * @param elements - Flat list of UI elements from Claude's analysis
   * @returns StructuredResult with updated elements, containers, and root IDs
   */
  structure(elements: UIElement[]): StructuredResult {
    // Initialize metadata tracking
    const metadata: StructuredResultMetadata = {
      rowsDetected: 0,
      columnsDetected: 0,
      gridDetected: false,
      rowsCreated: 0,
      columnsCreated: 0,
    };

    if (elements.length === 0) {
      metadata.noContainersReason = 'No elements provided';
      return { elements: [], containers: [], rootIds: [], metadata };
    }

    if (elements.length === 1) {
      metadata.noContainersReason = 'Only 1 element (need >= 3 for grouping)';
      return {
        elements: [...elements],
        containers: [],
        rootIds: [elements[0].id],
        metadata,
      };
    }

    if (elements.length < MIN_GROUP_SIZE) {
      metadata.noContainersReason = `Only ${elements.length} elements (need >= ${MIN_GROUP_SIZE} for grouping)`;
      return {
        elements: [...elements],
        containers: [],
        rootIds: elements.map(el => el.id),
        metadata,
      };
    }

    // Build containment tree to understand existing hierarchy
    const containmentTree = this.analyzer.buildContainmentTree(elements);

    // Get elements with hierarchy info
    const elementsWithHierarchy = this.analyzer.flattenWithHierarchy(containmentTree);

    // Create element map for quick lookup
    const elementMap = new Map<string, UIElement>();
    for (const el of elementsWithHierarchy) {
      elementMap.set(el.id, { ...el });
    }

    // Track all virtual containers we create
    const containers: VirtualContainer[] = [];

    // Process each level of the hierarchy
    // Start with root elements (those not contained in others)
    const rootElements = containmentTree.map(node => node.element);
    const rootContainers = this.processLevel(rootElements, elementMap, containers, metadata);

    // Determine final root IDs
    // If we created containers for root elements, those become the new roots
    const rootIds = rootContainers.length > 0
      ? rootContainers.map(c => c.id)
      : rootElements.map(el => el.id);

    // Process children of each container recursively
    for (const node of containmentTree) {
      this.processContainmentNode(node, elementMap, containers, metadata);
    }

    // Convert containers to UIElements and add to result
    const containerElements = containers.map(c => this.containerToElement(c));
    const allElements = [...elementMap.values(), ...containerElements];

    // Set reason if no containers were created
    if (containers.length === 0 && !metadata.noContainersReason) {
      if (metadata.rowsDetected === 0 && metadata.columnsDetected === 0 && !metadata.gridDetected) {
        metadata.noContainersReason = 'No row, column, or grid patterns detected';
      } else {
        metadata.noContainersReason = 'Patterns detected but failed validation (coverage, spacing, or size consistency)';
      }
    }

    return {
      elements: allElements,
      containers,
      rootIds,
      metadata,
    };
  }

  /**
   * Process a level of sibling elements to detect patterns and create containers
   *
   * Uses stricter validation:
   * - MIN_GROUP_SIZE (3) for meaningful groups
   * - MIN_COVERAGE_RATIO (0.7) for pattern coverage
   * - Spacing uniformity check
   * - Size consistency check
   *
   * @param siblings - Elements at the same hierarchy level
   * @param elementMap - Map of all elements (updated in place)
   * @param containers - Array of containers (appended to)
   * @param metadata - Metadata tracking object (updated in place)
   * @returns Created containers at this level
   */
  private processLevel(
    siblings: UIElement[],
    elementMap: Map<string, UIElement>,
    containers: VirtualContainer[],
    metadata: StructuredResultMetadata
  ): VirtualContainer[] {
    if (siblings.length < MIN_GROUP_SIZE) {
      return [];
    }

    const createdContainers: VirtualContainer[] = [];

    // Try to detect grid pattern first (most specific)
    const gridPattern = this.analyzer.detectGrid(siblings);
    if (gridPattern && gridPattern.isGrid) {
      metadata.gridDetected = true;
    }
    if (this.isValidGrid(gridPattern)) {
      const gridContainer = this.createGridContainer(gridPattern!, siblings);
      containers.push(gridContainer);
      createdContainers.push(gridContainer);

      // Update children to point to grid container
      for (const childId of gridContainer.childIds) {
        const child = elementMap.get(childId);
        if (child) {
          // Remove from any previous parent's children array
          // (will be handled by the container)
        }
      }

      return createdContainers;
    }

    // Detect rows (elements with similar Y positions)
    const rows = this.analyzer.detectRows(siblings);
    metadata.rowsDetected += rows.filter(r => r.members.length >= 2).length;

    // Filter rows by stricter criteria: size, spacing uniformity, size consistency
    const validRows = rows.filter(row => this.shouldCreateContainer(row, siblings.length, 'row'));

    if (validRows.length > 0) {
      // Check if all elements fit into rows nicely
      const elementsInRows = validRows.reduce((acc, row) => acc + row.members.length, 0);
      const coverageRatio = elementsInRows / siblings.length;

      // Only create row containers if they cover most elements (70% threshold)
      if (coverageRatio >= MIN_COVERAGE_RATIO) {
        for (const row of validRows) {
          const rowContainer = this.createRowContainer(row);
          containers.push(rowContainer);
          createdContainers.push(rowContainer);
          metadata.rowsCreated++;
        }

        return createdContainers;
      }
    }

    // Detect columns (elements with similar X positions)
    const columns = this.analyzer.detectColumns(siblings);
    metadata.columnsDetected += columns.filter(c => c.members.length >= 2).length;

    // Filter columns by stricter criteria
    const validColumns = columns.filter(col => this.shouldCreateContainer(col, siblings.length, 'column'));

    if (validColumns.length > 0) {
      const elementsInColumns = validColumns.reduce((acc, col) => acc + col.members.length, 0);
      const coverageRatio = elementsInColumns / siblings.length;

      if (coverageRatio >= MIN_COVERAGE_RATIO) {
        for (const column of validColumns) {
          const columnContainer = this.createColumnContainer(column);
          containers.push(columnContainer);
          createdContainers.push(columnContainer);
          metadata.columnsCreated++;
        }

        return createdContainers;
      }
    }

    // No confident pattern found at this level - preserve original hierarchy
    return [];
  }

  /**
   * Recursively process children within a containment node
   */
  private processContainmentNode(
    node: ContainmentNode,
    elementMap: Map<string, UIElement>,
    containers: VirtualContainer[],
    metadata: StructuredResultMetadata
  ): void {
    // Process children of this node
    if (node.children.length >= MIN_GROUP_SIZE) {
      const childElements = node.children.map(child => child.element);
      const childContainers = this.processLevel(childElements, elementMap, containers, metadata);

      // If we created containers, update the parent's children array
      if (childContainers.length > 0) {
        const parent = elementMap.get(node.element.id);
        if (parent) {
          // Container IDs become the new children
          const containerIds = childContainers.map(c => c.id);
          // Elements not in any container remain as direct children
          const elementsInContainers = new Set(
            childContainers.flatMap(c => c.childIds)
          );
          const remainingChildren = (parent.children || []).filter(
            id => !elementsInContainers.has(id)
          );

          parent.children = [...containerIds, ...remainingChildren];
          elementMap.set(parent.id, parent);
        }
      }
    }

    // Recursively process grandchildren
    for (const child of node.children) {
      this.processContainmentNode(child, elementMap, containers, metadata);
    }
  }

  /**
   * Create a row container from a spatial group
   */
  private createRowContainer(row: SpatialGroup): VirtualContainer {
    return {
      id: generateContainerId('row'),
      type: 'row',
      bounds: row.bounds,
      childIds: row.members.map(m => m.id),
      horizontalSpacing: row.spacing,
      verticalSpacing: 0,
    };
  }

  /**
   * Create a column container from a spatial group
   */
  private createColumnContainer(column: SpatialGroup): VirtualContainer {
    return {
      id: generateContainerId('column'),
      type: 'column',
      bounds: column.bounds,
      childIds: column.members.map(m => m.id),
      horizontalSpacing: 0,
      verticalSpacing: column.spacing,
    };
  }

  /**
   * Create a grid container from a detected grid pattern
   */
  private createGridContainer(grid: GridPattern, elements: UIElement[]): VirtualContainer {
    // Calculate bounds from all grid elements
    const bounds = this.calculateBounds(elements);

    // Get all element IDs in grid order (row by row)
    const childIds = grid.cells.flat().map(el => el.id);

    return {
      id: generateContainerId('grid'),
      type: 'grid',
      bounds,
      childIds,
      horizontalSpacing: grid.horizontalSpacing,
      verticalSpacing: grid.verticalSpacing,
      columns: grid.columnCount,
      rows: grid.rowCount,
    };
  }

  /**
   * Convert a virtual container to a UIElement
   * This allows containers to be processed by FigmaGenerator
   */
  private containerToElement(container: VirtualContainer): UIElement {
    // Determine layout mode based on container type
    const layoutMode = container.type === 'row' ? 'HORIZONTAL'
      : container.type === 'column' ? 'VERTICAL'
      : 'HORIZONTAL'; // Grid uses horizontal with wrap (approximation)

    return {
      id: container.id,
      component: 'Container',
      bounds: container.bounds,
      content: '',
      styles: {
        backgroundColor: undefined, // Transparent by default
      },
      children: container.childIds,
      // Store layout hint in variant field for FigmaGenerator to use
      variant: container.type,
    };
  }

  /**
   * Calculate bounding box from array of elements
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
   * Check if a group should have a container created
   * Validates coverage, spacing uniformity, and size consistency
   *
   * @param group - The spatial group to validate
   * @param totalSiblings - Total number of sibling elements
   * @param direction - 'row' or 'column' for size consistency check
   * @returns Whether to create a container for this group
   */
  private shouldCreateContainer(
    group: SpatialGroup,
    totalSiblings: number,
    direction: 'row' | 'column'
  ): boolean {
    // Check minimum group size
    if (group.members.length < MIN_GROUP_SIZE) {
      return false;
    }

    // Check coverage ratio (not used per-group, but included for completeness)
    // Coverage is checked at the level of all significant groups combined

    // Check spacing uniformity
    if (!this.isSpacingUniform(group, direction)) {
      return false;
    }

    // Check size consistency
    if (!this.areSizesConsistent(group, direction)) {
      return false;
    }

    return true;
  }

  /**
   * Check if spacing between elements is uniform
   * Max gap should be at most MAX_SPACING_VARIANCE times the min gap
   *
   * @param group - The spatial group to check
   * @param direction - 'row' (horizontal spacing) or 'column' (vertical spacing)
   * @returns Whether spacing is reasonably uniform
   */
  private isSpacingUniform(group: SpatialGroup, direction: 'row' | 'column'): boolean {
    if (group.members.length < 2) return true;

    // Sort by position
    const sorted = [...group.members].sort((a, b) => {
      if (direction === 'row') {
        return a.bounds.x - b.bounds.x;
      } else {
        return a.bounds.y - b.bounds.y;
      }
    });

    // Calculate gaps between consecutive elements
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      let gap: number;
      if (direction === 'row') {
        gap = next.bounds.x - (current.bounds.x + current.bounds.width);
      } else {
        gap = next.bounds.y - (current.bounds.y + current.bounds.height);
      }

      // Only consider positive gaps (elements shouldn't overlap significantly)
      if (gap > 0) {
        gaps.push(gap);
      }
    }

    // If no positive gaps, elements are overlapping - not a good group
    if (gaps.length === 0) return false;

    // Check variance: max/min ratio should be <= MAX_SPACING_VARIANCE
    const minGap = Math.min(...gaps);
    const maxGap = Math.max(...gaps);

    // Avoid division by zero; if minGap is very small, be lenient
    if (minGap < 1) {
      // If gaps are near-zero, just check they're all small
      return maxGap < 20;
    }

    return (maxGap / minGap) <= MAX_SPACING_VARIANCE;
  }

  /**
   * Check if element sizes are consistent
   * For rows: heights should be within MAX_SIZE_VARIANCE of each other
   * For columns: widths should be within MAX_SIZE_VARIANCE of each other
   *
   * @param group - The spatial group to check
   * @param direction - 'row' (check heights) or 'column' (check widths)
   * @returns Whether sizes are reasonably consistent
   */
  private areSizesConsistent(group: SpatialGroup, direction: 'row' | 'column'): boolean {
    if (group.members.length < 2) return true;

    // Get the relevant dimension for each element
    const sizes = group.members.map(el => {
      if (direction === 'row') {
        return el.bounds.height;
      } else {
        return el.bounds.width;
      }
    });

    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    // Avoid division by zero
    if (minSize < 1) {
      return maxSize < 20; // If sizes are near-zero, just check they're all small
    }

    // Check variance: (max - min) / min should be <= MAX_SIZE_VARIANCE
    const variance = (maxSize - minSize) / minSize;
    return variance <= MAX_SIZE_VARIANCE;
  }

  /**
   * Check if a grid pattern is valid with stricter requirements
   * - Minimum 2x2 (4 elements)
   * - Consistent row counts (no partial grids except last row)
   *
   * @param grid - The grid pattern to validate
   * @returns Whether the grid is valid
   */
  private isValidGrid(grid: GridPattern | null): boolean {
    if (!grid || !grid.isGrid) return false;

    // Require at least 2x2 = 4 elements
    const totalElements = grid.cells.flat().length;
    if (totalElements < 4) return false;
    if (grid.rowCount < 2 || grid.columnCount < 2) return false;

    // Check for consistent row counts (all rows same length, or last row can be partial)
    for (let i = 0; i < grid.cells.length - 1; i++) {
      if (grid.cells[i].length !== grid.columnCount) {
        return false; // Non-last row doesn't have full columns
      }
    }

    return true;
  }
}
