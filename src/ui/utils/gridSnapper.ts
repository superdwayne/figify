/**
 * Grid snapping and sibling alignment post-processor
 *
 * Refines AI-estimated element positions by:
 * 1. Snapping coordinates to common design system grid values (4px, 8px)
 * 2. Aligning siblings that are visually at the same level
 * 3. Normalizing sizes of elements that should be the same size
 */

import type { UIAnalysisResponse, UIElement } from '../types/analysis';

/**
 * Common grid values used in design systems (multiples of 4)
 */
const GRID_UNIT = 4;

/**
 * Alignment tolerance: if two siblings are within this many pixels,
 * snap them to the same value
 */
const ALIGNMENT_TOLERANCE = 5;

/**
 * Size normalization tolerance: if two sibling elements have sizes
 * within this threshold, normalize to the same size
 */
const SIZE_TOLERANCE = 4;

/**
 * Snap a value to the nearest grid unit
 */
function snapToGrid(value: number, gridUnit: number = GRID_UNIT): number {
  return Math.round(value / gridUnit) * gridUnit;
}

/**
 * Align siblings that share approximately the same Y position (same row)
 * or same X position (same column)
 */
function alignSiblings(elements: UIElement[]): UIElement[] {
  if (elements.length < 2) return elements;

  const result = elements.map(el => ({
    ...el,
    bounds: { ...el.bounds },
    styles: { ...el.styles },
  }));

  // Group siblings by parent
  const parentGroups = new Map<string, number[]>();

  for (let i = 0; i < result.length; i++) {
    const el = result[i];
    // Find parent by checking which elements list this element as a child
    let parentId = 'root';
    for (const other of result) {
      if (other.children?.includes(el.id)) {
        parentId = other.id;
        break;
      }
    }
    if (!parentGroups.has(parentId)) {
      parentGroups.set(parentId, []);
    }
    parentGroups.get(parentId)!.push(i);
  }

  // For each group of siblings, align those at similar positions
  for (const [_parentId, indices] of parentGroups) {
    if (indices.length < 2) continue;

    // Align Y positions (elements in the same row)
    alignAxis(result, indices, 'y');

    // Align X positions (elements in the same column)
    alignAxis(result, indices, 'x');

    // Normalize heights for elements in the same row
    normalizeSizes(result, indices, 'height', 'y');

    // Normalize widths for elements in the same column
    normalizeSizes(result, indices, 'width', 'x');
  }

  return result;
}

/**
 * Align elements along a specific axis
 */
function alignAxis(
  elements: UIElement[],
  indices: number[],
  axis: 'x' | 'y'
): void {
  // Group indices by similar axis value
  const groups: number[][] = [];

  for (const idx of indices) {
    const value = elements[idx].bounds[axis];
    let foundGroup = false;

    for (const group of groups) {
      const groupValue = elements[group[0]].bounds[axis];
      if (Math.abs(value - groupValue) <= ALIGNMENT_TOLERANCE) {
        group.push(idx);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      groups.push([idx]);
    }
  }

  // For each group with multiple elements, align to the average value
  for (const group of groups) {
    if (group.length < 2) continue;

    const values = group.map(idx => elements[idx].bounds[axis]);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const snapped = snapToGrid(avg);

    for (const idx of group) {
      elements[idx].bounds[axis] = snapped;
    }
  }
}

/**
 * Normalize sizes for elements that are approximately the same size
 */
function normalizeSizes(
  elements: UIElement[],
  indices: number[],
  sizeKey: 'width' | 'height',
  posKey: 'x' | 'y'
): void {
  // Group by similar position (same row/column)
  const posGroups: number[][] = [];

  for (const idx of indices) {
    const pos = elements[idx].bounds[posKey];
    let foundGroup = false;

    for (const group of posGroups) {
      const groupPos = elements[group[0]].bounds[posKey];
      if (Math.abs(pos - groupPos) <= ALIGNMENT_TOLERANCE) {
        group.push(idx);
        foundGroup = true;
        break;
      }
    }

    if (!foundGroup) {
      posGroups.push([idx]);
    }
  }

  // For each row/column group, normalize sizes
  for (const group of posGroups) {
    if (group.length < 2) continue;

    const sizes = group.map(idx => elements[idx].bounds[sizeKey]);
    const maxDiff = Math.max(...sizes) - Math.min(...sizes);

    if (maxDiff <= SIZE_TOLERANCE && maxDiff > 0) {
      // All sizes are similar — normalize to the snapped average
      const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      const snapped = snapToGrid(avg);

      for (const idx of group) {
        elements[idx].bounds[sizeKey] = snapped;
      }
    }
  }
}

/**
 * Snap all element positions and sizes to the nearest grid unit
 */
function snapElementsToGrid(elements: UIElement[]): UIElement[] {
  return elements.map(el => ({
    ...el,
    bounds: {
      x: snapToGrid(el.bounds.x),
      y: snapToGrid(el.bounds.y),
      width: Math.max(GRID_UNIT, snapToGrid(el.bounds.width)),
      height: Math.max(GRID_UNIT, snapToGrid(el.bounds.height)),
    },
    styles: {
      ...el.styles,
      // Snap border radius and padding to grid
      borderRadius: el.styles.borderRadius !== undefined
        ? snapToGrid(el.styles.borderRadius)
        : undefined,
      padding: el.styles.padding
        ? {
            top: snapToGrid(el.styles.padding.top),
            right: snapToGrid(el.styles.padding.right),
            bottom: snapToGrid(el.styles.padding.bottom),
            left: snapToGrid(el.styles.padding.left),
          }
        : undefined,
    },
  }));
}

/**
 * Ensure child elements are contained within their parent's bounds
 *
 * If a child extends beyond its parent, clamp it to fit.
 */
function enforceContainment(elements: UIElement[]): UIElement[] {
  const elementMap = new Map<string, UIElement>();
  for (const el of elements) {
    elementMap.set(el.id, el);
  }

  return elements.map(el => {
    // Find parent
    let parent: UIElement | undefined;
    for (const other of elements) {
      if (other.children?.includes(el.id)) {
        parent = other;
        break;
      }
    }

    if (!parent) return el;

    const pb = parent.bounds;
    const eb = el.bounds;

    // Clamp child to parent bounds
    const clampedX = Math.max(pb.x, Math.min(eb.x, pb.x + pb.width - GRID_UNIT));
    const clampedY = Math.max(pb.y, Math.min(eb.y, pb.y + pb.height - GRID_UNIT));
    const maxWidth = Math.max(GRID_UNIT, pb.x + pb.width - clampedX);
    const maxHeight = Math.max(GRID_UNIT, pb.y + pb.height - clampedY);

    return {
      ...el,
      bounds: {
        x: clampedX,
        y: clampedY,
        width: Math.min(eb.width, maxWidth),
        height: Math.min(eb.height, maxHeight),
      },
    };
  });
}

/**
 * Equalize spacing between siblings in a row or column
 *
 * If siblings in a row/column have inconsistent spacing,
 * normalizes to the median spacing value.
 */
function equalizeSpacing(elements: UIElement[]): UIElement[] {
  const result = elements.map(el => ({
    ...el,
    bounds: { ...el.bounds },
  }));

  // Group siblings by parent
  const parentGroups = new Map<string, number[]>();

  for (let i = 0; i < result.length; i++) {
    let parentId = 'root';
    for (const other of result) {
      if (other.children?.includes(result[i].id)) {
        parentId = other.id;
        break;
      }
    }
    if (!parentGroups.has(parentId)) {
      parentGroups.set(parentId, []);
    }
    parentGroups.get(parentId)!.push(i);
  }

  for (const [_parentId, indices] of parentGroups) {
    if (indices.length < 3) continue;

    // Check if siblings form a row (similar Y) or column (similar X)
    const yValues = indices.map(i => result[i].bounds.y);
    const xValues = indices.map(i => result[i].bounds.x);
    const yRange = Math.max(...yValues) - Math.min(...yValues);
    const xRange = Math.max(...xValues) - Math.min(...xValues);

    if (yRange < ALIGNMENT_TOLERANCE * 2 && xRange > 0) {
      // Horizontal row - equalize horizontal spacing
      equalizeAxisSpacing(result, indices, 'x', 'width');
    } else if (xRange < ALIGNMENT_TOLERANCE * 2 && yRange > 0) {
      // Vertical column - equalize vertical spacing
      equalizeAxisSpacing(result, indices, 'y', 'height');
    }
  }

  return result;
}

/**
 * Equalize spacing along a specific axis
 */
function equalizeAxisSpacing(
  elements: UIElement[],
  indices: number[],
  posKey: 'x' | 'y',
  sizeKey: 'width' | 'height'
): void {
  // Sort by position
  const sorted = [...indices].sort(
    (a, b) => elements[a].bounds[posKey] - elements[b].bounds[posKey]
  );

  if (sorted.length < 3) return;

  // Calculate gaps between consecutive elements
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = elements[sorted[i - 1]].bounds[posKey] + elements[sorted[i - 1]].bounds[sizeKey];
    const nextStart = elements[sorted[i]].bounds[posKey];
    gaps.push(nextStart - prevEnd);
  }

  // Check if gaps are inconsistent
  const maxGap = Math.max(...gaps);
  const minGap = Math.min(...gaps);
  if (maxGap - minGap <= GRID_UNIT) return; // Already consistent enough

  // Use median gap, snapped to grid
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap = sortedGaps[Math.floor(sortedGaps.length / 2)];
  const normalizedGap = snapToGrid(medianGap);

  // Reposition elements with consistent spacing (keep first element fixed)
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = elements[sorted[i - 1]].bounds[posKey] + elements[sorted[i - 1]].bounds[sizeKey];
    elements[sorted[i]].bounds[posKey] = prevEnd + normalizedGap;
  }
}

/**
 * Apply all grid snapping and alignment refinements to an analysis response
 *
 * Pipeline:
 * 1. Snap to grid
 * 2. Align siblings
 * 3. Equalize spacing
 * 4. Enforce containment
 *
 * @param analysis - The UI analysis response to refine
 * @returns Refined analysis with snapped/aligned coordinates
 */
export function refinePositions(analysis: UIAnalysisResponse): UIAnalysisResponse {
  let elements = [...analysis.elements];

  // Step 1: Snap all positions to grid
  elements = snapElementsToGrid(elements);

  // Step 2: Align siblings at similar positions
  elements = alignSiblings(elements);

  // Step 3: Equalize spacing between siblings
  elements = equalizeSpacing(elements);

  // Step 4: Enforce parent-child containment
  elements = enforceContainment(elements);

  const changedCount = analysis.elements.filter((orig, i) => {
    const refined = elements[i];
    return orig.bounds.x !== refined.bounds.x ||
           orig.bounds.y !== refined.bounds.y ||
           orig.bounds.width !== refined.bounds.width ||
           orig.bounds.height !== refined.bounds.height;
  }).length;

  console.log(`[gridSnapper] Refined ${changedCount}/${elements.length} element positions`);

  return {
    ...analysis,
    elements,
  };
}
