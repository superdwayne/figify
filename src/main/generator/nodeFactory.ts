/**
 * NodeFactory - Creates Figma nodes with proper dimensions and configuration
 *
 * Handles the creation of frames, text nodes, and rectangles with
 * appropriate sizing and positioning based on analysis data.
 *
 * Supports both absolute and relative coordinate modes:
 * - Absolute: Direct coordinates from Claude's analysis (for root-level elements)
 * - Relative: Converted coordinates for elements nested inside parent frames
 */

import type { FrameConfig, TextConfig, Bounds } from './types';
import { toRelativeBounds, clampRelativeBounds } from './coordinateUtils';
import { roundToPixel } from './constants';

/**
 * Factory class for creating Figma nodes
 */
export class NodeFactory {
  private scaleFactor: number;

  constructor(scaleFactor: number = 1) {
    this.scaleFactor = scaleFactor;
  }

  /**
   * Create a frame node with specified configuration
   *
   * @param config - Frame configuration including bounds and styles
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   *                       When provided, config.bounds are treated as absolute and
   *                       converted to relative coordinates within the parent
   */
  createFrame(config: FrameConfig, parentBounds?: Bounds): FrameNode {
    const frame = figma.createFrame();

    // Apply name
    frame.name = config.name;

    // Convert to relative bounds if parent provided, then clamp to prevent overflow
    let bounds = config.bounds;
    if (parentBounds) {
      const relativeBounds = toRelativeBounds(config.bounds, parentBounds);
      bounds = clampRelativeBounds(relativeBounds, parentBounds.width, parentBounds.height, config.name);
    }

    // Apply scaled bounds (already rounded to whole pixels)
    const scaledBounds = this.scaleBounds(bounds);
    frame.x = scaledBounds.x;
    frame.y = scaledBounds.y;
    frame.resize(scaledBounds.width, scaledBounds.height);

    // Disable default fills (white background)
    frame.fills = [];

    // Apply layout mode if specified
    if (config.layoutMode && config.layoutMode !== 'NONE') {
      frame.layoutMode = config.layoutMode;
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
    }

    // Apply padding if specified
    if (config.padding) {
      frame.paddingTop = config.padding.top;
      frame.paddingRight = config.padding.right;
      frame.paddingBottom = config.padding.bottom;
      frame.paddingLeft = config.padding.left;
    }

    // Apply item spacing if specified
    if (config.itemSpacing !== undefined) {
      frame.itemSpacing = config.itemSpacing;
    }

    return frame;
  }

  /**
   * Create a text node with specified configuration
   *
   * For pixel-perfect placement, we position text exactly where Claude analyzed it.
   * Text sizing uses NONE mode to preserve exact bounds from analysis.
   *
   * @param config - Text configuration including content and bounds
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   */
  createText(config: TextConfig, parentBounds?: Bounds): TextNode {
    const textNode = figma.createText();

    // Apply name
    textNode.name = config.name;

    // Convert to relative bounds if parent provided, then clamp to prevent overflow
    let bounds = config.bounds;
    if (parentBounds) {
      const relativeBounds = toRelativeBounds(config.bounds, parentBounds);
      bounds = clampRelativeBounds(relativeBounds, parentBounds.width, parentBounds.height, config.name);
    }

    // Apply scaled position (already rounded to whole pixels)
    const scaledBounds = this.scaleBounds(bounds);
    textNode.x = scaledBounds.x;
    textNode.y = scaledBounds.y;

    // Set text content
    // Handle escaped newlines from JSON (\\n -> actual newline)
    const processedContent = config.content.replace(/\\n/g, '\n');
    textNode.characters = processedContent;

    // Resize to exact bounds from analysis
    // Use the exact dimensions Claude measured for pixel-perfect placement
    textNode.resize(scaledBounds.width, scaledBounds.height);

    // Use HEIGHT auto-resize: keeps the analyzed width but lets height
    // adjust to fit actual rendered text. This prevents truncation and
    // ensures proper font rendering regardless of font metric differences.
    textNode.textAutoResize = 'HEIGHT';

    return textNode;
  }

  /**
   * Create a rectangle node
   *
   * @param name - Node name
   * @param bounds - Rectangle bounds (absolute)
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   */
  createRectangle(name: string, bounds: Bounds, parentBounds?: Bounds): RectangleNode {
    const rect = figma.createRectangle();

    rect.name = name;

    // Convert to relative bounds if parent provided, then clamp to prevent overflow
    let effectiveBounds = bounds;
    if (parentBounds) {
      const relativeBounds = toRelativeBounds(bounds, parentBounds);
      effectiveBounds = clampRelativeBounds(relativeBounds, parentBounds.width, parentBounds.height, name);
    }

    const scaledBounds = this.scaleBounds(effectiveBounds);
    rect.x = scaledBounds.x;
    rect.y = scaledBounds.y;
    rect.resize(scaledBounds.width, scaledBounds.height);

    return rect;
  }

  /**
   * Create an ellipse node (for avatars, icons)
   *
   * @param name - Node name
   * @param bounds - Ellipse bounds (absolute)
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   */
  createEllipse(name: string, bounds: Bounds, parentBounds?: Bounds): EllipseNode {
    const ellipse = figma.createEllipse();

    ellipse.name = name;

    // Convert to relative bounds if parent provided, then clamp to prevent overflow
    let effectiveBounds = bounds;
    if (parentBounds) {
      const relativeBounds = toRelativeBounds(bounds, parentBounds);
      effectiveBounds = clampRelativeBounds(relativeBounds, parentBounds.width, parentBounds.height, name);
    }

    const scaledBounds = this.scaleBounds(effectiveBounds);
    ellipse.x = scaledBounds.x;
    ellipse.y = scaledBounds.y;
    ellipse.resize(scaledBounds.width, scaledBounds.height);

    return ellipse;
  }

  /**
   * Create a line node (for separators)
   */
  createLine(name: string, x: number, y: number, length: number, horizontal: boolean = true): LineNode {
    const line = figma.createLine();

    line.name = name;
    line.x = x * this.scaleFactor;
    line.y = y * this.scaleFactor;

    if (horizontal) {
      line.resize(length * this.scaleFactor, 0);
    } else {
      line.rotation = 90;
      line.resize(length * this.scaleFactor, 0);
    }

    return line;
  }

  /**
   * Create an image placeholder rectangle
   * Since we can't extract actual pixels from screenshots, creates a styled placeholder
   *
   * @param name - Node name (ideally descriptive of the image content)
   * @param bounds - Image bounds (absolute)
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   */
  createImagePlaceholder(name: string, bounds: Bounds, parentBounds?: Bounds): RectangleNode {
    const rect = this.createRectangle(name, bounds, parentBounds);

    // Apply placeholder styling (light gray with subtle border)
    rect.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.92 } }];
    rect.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.82 } }];
    rect.strokeWeight = 1;

    return rect;
  }

  /**
   * Create a real image node from image data
   * Uses Figma's createImage() API to create an actual image fill
   *
   * @param name - Node name (ideally descriptive of the image content)
   * @param bounds - Image bounds (absolute)
   * @param imageData - Image bytes (PNG or JPG)
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   * @returns Rectangle node with image fill
   */
  async createImageNode(
    name: string,
    bounds: Bounds,
    imageData: Uint8Array,
    parentBounds?: Bounds
  ): Promise<RectangleNode> {
    const rect = this.createRectangle(name, bounds, parentBounds);

    try {
      // Create image from bytes using Figma's API
      const image = figma.createImage(imageData);

      // Apply image as fill with proper scaling
      rect.fills = [
        {
          type: 'IMAGE',
          imageHash: image.hash,
          scaleMode: 'FILL', // Fill the bounds, cropping if needed to maintain aspect ratio
        },
      ];
    } catch (error) {
      console.warn(`[NodeFactory] Failed to create image for ${name}:`, error);
      // Fall back to placeholder styling
      rect.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.92 } }];
      rect.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.82 } }];
      rect.strokeWeight = 1;
    }

    return rect;
  }

  /**
   * Create an icon placeholder (smaller, with rounded corners)
   *
   * @param name - Node name (ideally the icon name like "menu", "search")
   * @param bounds - Icon bounds (absolute)
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   */
  createIconPlaceholder(name: string, bounds: Bounds, parentBounds?: Bounds): RectangleNode {
    const rect = this.createRectangle(name, bounds, parentBounds);

    // Apply icon placeholder styling (slightly darker gray)
    rect.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.88 } }];

    // Apply corner radius based on size (quarter of the smaller dimension)
    // Use scaled bounds since rect dimensions are already scaled
    const scaledSize = Math.min(bounds.width, bounds.height) * this.scaleFactor;
    rect.cornerRadius = scaledSize / 4;

    return rect;
  }

  /**
   * Scale bounds by the scale factor and round to whole pixels
   * Figma requires whole pixel values for crisp rendering
   */
  private scaleBounds(bounds: Bounds): Bounds {
    return {
      x: roundToPixel(bounds.x * this.scaleFactor),
      y: roundToPixel(bounds.y * this.scaleFactor),
      width: Math.max(1, roundToPixel(bounds.width * this.scaleFactor)),
      height: Math.max(1, roundToPixel(bounds.height * this.scaleFactor)),
    };
  }

  /**
   * Get the current scale factor
   */
  getScaleFactor(): number {
    return this.scaleFactor;
  }

  /**
   * Set a new scale factor
   */
  setScaleFactor(factor: number): void {
    this.scaleFactor = factor;
  }
}
