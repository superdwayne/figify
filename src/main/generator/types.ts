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

// Re-export analysis types for convenience
export type { UIElement, UIAnalysisResponse, Bounds, ElementStyles };
