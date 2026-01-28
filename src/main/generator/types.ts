/**
 * Types for Figma design generation from UI analysis
 */

import type { UIElement, UIAnalysisResponse, Bounds, ElementStyles } from '../../ui/types/analysis';

/**
 * Result of generating a single Figma node
 */
export interface NodeGenerationResult {
  /** The created Figma node ID */
  nodeId: string;
  /** The source element ID from analysis */
  elementId: string;
  /** Whether generation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Result of the complete generation process
 */
export interface GenerationResult {
  /** Root frame node ID */
  rootNodeId: string;
  /** Total elements processed */
  elementCount: number;
  /** Individual node results */
  nodeResults: NodeGenerationResult[];
  /** Overall success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Time taken in milliseconds */
  duration: number;
}

/**
 * Options for the generation process
 */
export interface GenerationOptions {
  /** Scale factor for retina screenshots (default: 1) */
  scaleFactor?: number;
  /** Maximum elements to process (default: 100) */
  maxElements?: number;
  /** Batch size for processing (default: 10) */
  batchSize?: number;
  /** Whether to apply Auto Layout (default: true) */
  applyAutoLayout?: boolean;
}

/**
 * Progress callback for generation updates
 */
export type ProgressCallback = (step: string, current: number, total: number) => void;

/**
 * RGB color in Figma format (0-1 range)
 */
export interface FigmaRGB {
  r: number;
  g: number;
  b: number;
}

/**
 * RGBA color in Figma format (0-1 range)
 */
export interface FigmaRGBA extends FigmaRGB {
  a: number;
}

/**
 * Padding values for Auto Layout
 */
export interface LayoutPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Configuration for creating a frame node
 */
export interface FrameConfig {
  name: string;
  bounds: Bounds;
  styles?: ElementStyles;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  padding?: LayoutPadding;
  itemSpacing?: number;
}

/**
 * Configuration for creating a text node
 */
export interface TextConfig {
  name: string;
  content: string;
  bounds: Bounds;
  styles?: ElementStyles;
}

/**
 * Map of element IDs to their created Figma nodes
 */
export type NodeMap = Map<string, SceneNode>;

/**
 * Auto Layout configuration detected from element positions
 */
export interface LayoutConfig {
  /** Layout direction: HORIZONTAL, VERTICAL, or NONE */
  mode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  /** Primary axis alignment */
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  /** Counter axis alignment */
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX';
  /** Spacing between items in pixels */
  itemSpacing: number;
  /** Padding from container edges */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** Primary axis sizing mode */
  primaryAxisSizingMode: 'FIXED' | 'AUTO';
  /** Counter axis sizing mode */
  counterAxisSizingMode: 'FIXED' | 'AUTO';
}

/**
 * A group of spatially related elements (from SpatialAnalyzer)
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
 * A virtual container created by LayoutStructurer to group elements
 * These are converted to actual UIElements before generation
 */
export interface VirtualContainer {
  /** Unique identifier for the container */
  id: string;
  /** Type of layout container */
  type: 'row' | 'column' | 'grid';
  /** Bounding box encompassing all children */
  bounds: Bounds;
  /** IDs of child elements */
  childIds: string[];
  /** Spacing between children */
  spacing: number;
  /** Parent container ID (if nested) */
  parentId?: string;
  /** For grids: number of columns */
  columns?: number;
  /** For grids: number of rows */
  rows?: number;
}

/**
 * Metadata about pattern detection in LayoutStructurer
 * Used for debugging and understanding why layouts are grouped
 */
export interface StructuredResultMetadata {
  /** Number of row patterns detected */
  rowsDetected: number;
  /** Number of column patterns detected */
  columnsDetected: number;
  /** Whether a grid pattern was detected */
  gridDetected: boolean;
  /** Number of row containers created (passed all validations) */
  rowsCreated: number;
  /** Number of column containers created (passed all validations) */
  columnsCreated: number;
  /** Reason if no containers created */
  noContainersReason?: string;
}

/**
 * Result of LayoutStructurer.structure() operation
 * Contains restructured elements ready for Figma generation
 */
export interface StructuredResult {
  /** All elements with updated children arrays */
  elements: UIElement[];
  /** Virtual containers created from spatial analysis */
  containers: VirtualContainer[];
  /** IDs of root-level elements (not children of any other element) */
  rootIds: string[];
  /** Metadata about pattern detection for debugging */
  metadata?: StructuredResultMetadata;
}

// Re-export analysis types for convenience
export type { UIElement, UIAnalysisResponse, Bounds, ElementStyles };
