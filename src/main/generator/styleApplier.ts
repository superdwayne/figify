/**
 * StyleApplier - Applies visual styles to Figma nodes
 *
 * Handles color conversion, fills, strokes, typography, and other
 * visual properties for generated Figma nodes.
 */

import type { ElementStyles, FigmaRGB, FigmaRGBA } from './types';

/**
 * Default font to use for text nodes
 */
const DEFAULT_FONT: FontName = { family: 'Inter', style: 'Regular' };
const DEFAULT_FONT_BOLD: FontName = { family: 'Inter', style: 'Semi Bold' };

/**
 * Cache of loaded fonts to avoid redundant loading
 */
const loadedFonts = new Set<string>();

/**
 * Class for applying styles to Figma nodes
 */
export class StyleApplier {
  /**
   * Convert hex color string to Figma RGB format
   * Supports #RGB, #RRGGBB, and #RRGGBBAA formats
   */
  hexToRgb(hex: string): FigmaRGB {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Handle short hex format (#RGB)
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    return { r, g, b };
  }

  /**
   * Convert hex color string to Figma RGBA format
   */
  hexToRgba(hex: string): FigmaRGBA {
    const rgb = this.hexToRgb(hex);
    
    // Check for alpha in hex
    const cleanHex = hex.replace(/^#/, '');
    let a = 1;
    if (cleanHex.length === 8) {
      a = parseInt(cleanHex.substring(6, 8), 16) / 255;
    }

    return { ...rgb, a };
  }

  /**
   * Apply solid fill to a node
   */
  applyFills(node: GeometryMixin, color: string): void {
    const rgb = this.hexToRgb(color);
    node.fills = [
      {
        type: 'SOLID',
        color: rgb,
      },
    ];
  }

  /**
   * Apply stroke/border to a node
   */
  applyStrokes(node: GeometryMixin & MinimalStrokesMixin, color: string, width: number = 1): void {
    const rgb = this.hexToRgb(color);
    node.strokes = [
      {
        type: 'SOLID',
        color: rgb,
      },
    ];
    node.strokeWeight = width;
  }

  /**
   * Apply corner radius to a node
   */
  applyCornerRadius(node: CornerMixin, radius: number): void {
    node.cornerRadius = radius;
  }

  /**
   * Apply individual corner radii
   */
  applyIndividualCornerRadius(
    node: IndividualCornersMixin,
    topLeft: number,
    topRight: number,
    bottomRight: number,
    bottomLeft: number
  ): void {
    node.topLeftRadius = topLeft;
    node.topRightRadius = topRight;
    node.bottomRightRadius = bottomRight;
    node.bottomLeftRadius = bottomLeft;
  }

  /**
   * Apply text styles to a text node
   */
  async applyTextStyles(textNode: TextNode, styles: ElementStyles): Promise<void> {
    // Determine font based on weight
    const fontWeight = styles.fontWeight || 400;
    const font = fontWeight >= 600 ? DEFAULT_FONT_BOLD : DEFAULT_FONT;

    // Load font if not already loaded
    await this.loadFont(font);

    // Apply font
    textNode.fontName = font;

    // Apply font size
    if (styles.fontSize) {
      textNode.fontSize = styles.fontSize;
    }

    // Apply text color
    if (styles.textColor) {
      const rgb = this.hexToRgb(styles.textColor);
      textNode.fills = [
        {
          type: 'SOLID',
          color: rgb,
        },
      ];
    }
  }

  /**
   * Load a font asynchronously
   */
  async loadFont(font: FontName): Promise<void> {
    const fontKey = `${font.family}-${font.style}`;
    
    if (loadedFonts.has(fontKey)) {
      return;
    }

    try {
      await figma.loadFontAsync(font);
      loadedFonts.add(fontKey);
    } catch (error) {
      // Fall back to default font if requested font unavailable
      console.warn(`Failed to load font ${fontKey}, using fallback`);
      if (font.family !== 'Inter') {
        await figma.loadFontAsync(DEFAULT_FONT);
        loadedFonts.add('Inter-Regular');
      }
    }
  }

  /**
   * Apply opacity to a node
   */
  applyOpacity(node: BlendMixin, opacity: number): void {
    node.opacity = Math.max(0, Math.min(1, opacity));
  }

  /**
   * Apply drop shadow effect
   */
  applyDropShadow(
    node: BlendMixin,
    options: {
      color?: string;
      offsetX?: number;
      offsetY?: number;
      blur?: number;
      spread?: number;
    } = {}
  ): void {
    const {
      color = '#000000',
      offsetX = 0,
      offsetY = 4,
      blur = 8,
      spread = 0,
    } = options;

    const rgba = this.hexToRgba(color);

    node.effects = [
      {
        type: 'DROP_SHADOW',
        color: { ...rgba, a: 0.1 },
        offset: { x: offsetX, y: offsetY },
        radius: blur,
        spread: spread,
        visible: true,
        blendMode: 'NORMAL',
      },
    ];
  }

  /**
   * Apply all relevant styles from ElementStyles to a frame
   */
  applyElementStyles(node: FrameNode, styles: ElementStyles): void {
    if (styles.backgroundColor) {
      this.applyFills(node, styles.backgroundColor);
    }

    if (styles.borderColor) {
      this.applyStrokes(node, styles.borderColor, 1);
    }

    if (styles.borderRadius) {
      this.applyCornerRadius(node, styles.borderRadius);
    }

    if (styles.padding) {
      node.paddingTop = styles.padding.top;
      node.paddingRight = styles.padding.right;
      node.paddingBottom = styles.padding.bottom;
      node.paddingLeft = styles.padding.left;
    }
  }

  /**
   * Apply Auto Layout settings to a frame
   */
  applyAutoLayout(
    node: FrameNode,
    options: {
      mode: 'HORIZONTAL' | 'VERTICAL';
      padding?: { top: number; right: number; bottom: number; left: number };
      itemSpacing?: number;
      primaryAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
      counterAxisAlign?: 'MIN' | 'CENTER' | 'MAX';
      wrap?: boolean;
    }
  ): void {
    node.layoutMode = options.mode;
    node.primaryAxisSizingMode = 'FIXED';
    node.counterAxisSizingMode = 'FIXED';

    if (options.padding) {
      node.paddingTop = options.padding.top;
      node.paddingRight = options.padding.right;
      node.paddingBottom = options.padding.bottom;
      node.paddingLeft = options.padding.left;
    }

    if (options.itemSpacing !== undefined) {
      node.itemSpacing = options.itemSpacing;
    }

    if (options.primaryAxisAlign) {
      node.primaryAxisAlignItems = options.primaryAxisAlign;
    }

    if (options.counterAxisAlign) {
      node.counterAxisAlignItems = options.counterAxisAlign;
    }

    if (options.wrap !== undefined) {
      node.layoutWrap = options.wrap ? 'WRAP' : 'NO_WRAP';
    }
  }

  /**
   * Apply gap (spacing) between children in an Auto Layout frame
   */
  applyItemSpacing(node: FrameNode, spacing: number): void {
    if (node.layoutMode !== 'NONE') {
      node.itemSpacing = spacing;
    }
  }

  /**
   * Center content both horizontally and vertically
   */
  applyCenteredLayout(node: FrameNode): void {
    node.layoutMode = 'HORIZONTAL';
    node.primaryAxisAlignItems = 'CENTER';
    node.counterAxisAlignItems = 'CENTER';
    node.primaryAxisSizingMode = 'FIXED';
    node.counterAxisSizingMode = 'FIXED';
  }

  /**
   * Pre-load common fonts used in Shadcn components
   */
  async preloadFonts(): Promise<void> {
    const fonts: FontName[] = [
      DEFAULT_FONT,
      DEFAULT_FONT_BOLD,
      { family: 'Inter', style: 'Medium' },
    ];

    await Promise.all(fonts.map((font) => this.loadFont(font)));
  }
}
