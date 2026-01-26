/**
 * NodeFactory - Creates Figma nodes with proper dimensions and configuration
 *
 * Handles the creation of frames, text nodes, and rectangles with
 * appropriate sizing and positioning based on analysis data.
 */

import type { FrameConfig, TextConfig, Bounds } from './types';

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
   */
  createFrame(config: FrameConfig): FrameNode {
    const frame = figma.createFrame();

    // Apply name
    frame.name = config.name;

    // Apply scaled bounds
    const scaledBounds = this.scaleBounds(config.bounds);
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
   */
  createText(config: TextConfig): TextNode {
    const textNode = figma.createText();

    // Apply name
    textNode.name = config.name;

    // Apply scaled position
    const scaledBounds = this.scaleBounds(config.bounds);
    textNode.x = scaledBounds.x;
    textNode.y = scaledBounds.y;

    // Load font before setting characters
    // Note: This is synchronous as figma.loadFontAsync should be called first
    // The StyleApplier will handle font loading
    textNode.characters = config.content;

    // Resize to fit bounds
    textNode.resize(scaledBounds.width, scaledBounds.height);

    // Set text auto-resize behavior
    textNode.textAutoResize = 'HEIGHT';

    return textNode;
  }

  /**
   * Create a rectangle node
   */
  createRectangle(name: string, bounds: Bounds): RectangleNode {
    const rect = figma.createRectangle();

    rect.name = name;

    const scaledBounds = this.scaleBounds(bounds);
    rect.x = scaledBounds.x;
    rect.y = scaledBounds.y;
    rect.resize(scaledBounds.width, scaledBounds.height);

    return rect;
  }

  /**
   * Create an ellipse node (for avatars, icons)
   */
  createEllipse(name: string, bounds: Bounds): EllipseNode {
    const ellipse = figma.createEllipse();

    ellipse.name = name;

    const scaledBounds = this.scaleBounds(bounds);
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
   * Scale bounds by the scale factor
   */
  private scaleBounds(bounds: Bounds): Bounds {
    return {
      x: bounds.x * this.scaleFactor,
      y: bounds.y * this.scaleFactor,
      width: Math.max(1, bounds.width * this.scaleFactor),
      height: Math.max(1, bounds.height * this.scaleFactor),
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
