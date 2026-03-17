/**
 * StyleApplier - Applies visual styles to Figma nodes
 *
 * Handles color conversion, fills, strokes, typography, and other
 * visual properties for generated Figma nodes.
 * All dimension values are rounded to whole pixels for crisp rendering.
 */

import type { ElementStyles, FigmaRGB, FigmaRGBA } from './types';
import type { GradientDef, BoxShadowDef } from '../../ui/types/analysis';
import { roundToPixel } from './constants';

/**
 * Default font family
 */
const DEFAULT_FONT_FAMILY = 'Inter';

/**
 * Font weight to style name mapping
 * Works for Inter and most standard fonts
 */
const FONT_WEIGHT_TO_STYLE: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
};

/**
 * Font family fallback chains
 * Maps detected font families to ordered fallback lists
 */
const FONT_FALLBACK_CHAINS: Record<string, string[]> = {
  'SF Pro': ['SF Pro Display', 'SF Pro Text', 'SF Pro', 'Inter', 'Helvetica'],
  'SF Pro Display': ['SF Pro Display', 'SF Pro', 'Inter'],
  'SF Pro Text': ['SF Pro Text', 'SF Pro', 'Inter'],
  'Helvetica': ['Helvetica', 'Helvetica Neue', 'Arial', 'Inter'],
  'Arial': ['Arial', 'Helvetica', 'Inter'],
  'Roboto': ['Roboto', 'Inter', 'Arial'],
  'Open Sans': ['Open Sans', 'Inter', 'Arial'],
  'Poppins': ['Poppins', 'Inter'],
  'Geist': ['Geist', 'Inter'],
  'Geist Sans': ['Geist Sans', 'Geist', 'Inter'],
  'Georgia': ['Georgia', 'Times New Roman'],
  'Times New Roman': ['Times New Roman', 'Georgia'],
  'Merriweather': ['Merriweather', 'Georgia'],
  'Playfair Display': ['Playfair Display', 'Georgia'],
  'JetBrains Mono': ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas'],
  'Fira Code': ['Fira Code', 'JetBrains Mono', 'SF Mono'],
  'SF Mono': ['SF Mono', 'JetBrains Mono', 'Fira Code', 'Consolas'],
  'Consolas': ['Consolas', 'SF Mono', 'JetBrains Mono'],
};

/**
 * Get the font style name for a given weight
 */
function getFontStyleForWeight(weight: number): string {
  // Find the closest weight
  const weights = Object.keys(FONT_WEIGHT_TO_STYLE).map(Number);
  const closest = weights.reduce((prev, curr) =>
    Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev
  );
  return FONT_WEIGHT_TO_STYLE[closest] || 'Regular';
}

/**
 * Cache of loaded fonts to avoid redundant loading
 */
const loadedFonts = new Set<string>();

/**
 * Cache of fonts that failed to load
 */
const failedFonts = new Set<string>();

/**
 * Class for applying styles to Figma nodes
 */
export class StyleApplier {
  private scaleFactor: number;

  constructor(scaleFactor: number = 1) {
    this.scaleFactor = scaleFactor;
  }
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
   * Apply stroke/border to a node (stroke weight rounded to whole pixels)
   */
  applyStrokes(node: GeometryMixin & MinimalStrokesMixin, color: string, width: number = 1): void {
    const rgb = this.hexToRgb(color);
    node.strokes = [
      {
        type: 'SOLID',
        color: rgb,
      },
    ];
    node.strokeWeight = roundToPixel(width);
  }

  /**
   * Apply corner radius to a node (rounded to whole pixels)
   */
  applyCornerRadius(node: CornerMixin, radius: number): void {
    node.cornerRadius = roundToPixel(radius);
  }

  /**
   * Apply individual corner radii (rounded to whole pixels)
   */
  applyIndividualCornerRadius(
    node: RectangleCornerMixin,
    topLeft: number,
    topRight: number,
    bottomRight: number,
    bottomLeft: number
  ): void {
    node.topLeftRadius = roundToPixel(topLeft);
    node.topRightRadius = roundToPixel(topRight);
    node.bottomRightRadius = roundToPixel(bottomRight);
    node.bottomLeftRadius = roundToPixel(bottomLeft);
  }

  /**
   * Apply text styles to a text node
   * 
   * Applies font family, weight, size, and color for pixel-perfect reproduction.
   * Supports detected font family with fallback chain.
   */
  async applyTextStyles(textNode: TextNode, styles: ElementStyles): Promise<void> {
    // Determine font style based on weight
    const fontWeight = styles.fontWeight || 400;
    const fontStyle = getFontStyleForWeight(fontWeight);

    // Try detected font family first, then fallback chain
    const font = await this.resolveFontWithFallback(
      styles.fontFamily || DEFAULT_FONT_FAMILY,
      fontStyle
    );

    // Apply font
    textNode.fontName = font;

    // Apply font size (required for pixel-perfect sizing)
    // Use exact value (Figma supports fractional font sizes) scaled by scaleFactor
    if (styles.fontSize) {
      textNode.fontSize = styles.fontSize * this.scaleFactor;
    } else {
      // Smart fallback: estimate fontSize from text node height
      // For single-line text, fontSize ≈ height / 1.25 (assuming ~1.25 line-height)
      // This is far better than Figma's default 12px
      const estimatedSize = Math.max(10, textNode.height / 1.25);
      textNode.fontSize = Math.round(estimatedSize);
    }

    // Apply text color - ALWAYS apply for pixel-perfect reproduction
    if (styles.textColor) {
      const rgb = this.hexToRgb(styles.textColor);
      textNode.fills = [
        {
          type: 'SOLID',
          color: rgb,
        },
      ];
    } else {
      // Default to black if no text color specified
      textNode.fills = [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 0 },
        },
      ];
    }

    // Apply line height if available (improves text positioning)
    // Use exact value scaled by scaleFactor (Figma supports fractional line heights)
    if (styles.lineHeight) {
      textNode.lineHeight = { value: styles.lineHeight * this.scaleFactor, unit: 'PIXELS' };
    }

    // Apply letter spacing if available, scaled by scaleFactor
    if (styles.letterSpacing) {
      textNode.letterSpacing = { value: styles.letterSpacing * this.scaleFactor, unit: 'PIXELS' };
    }

    // Apply text alignment if available
    if (styles.textAlign) {
      const alignmentMap: Record<string, 'LEFT' | 'CENTER' | 'RIGHT'> = {
        'left': 'LEFT',
        'center': 'CENTER',
        'right': 'RIGHT',
      };
      textNode.textAlignHorizontal = alignmentMap[styles.textAlign] || 'LEFT';
    }

    // Apply text decoration
    if (styles.textDecoration) {
      const decorationMap: Record<string, TextDecoration> = {
        'underline': 'UNDERLINE',
        'line-through': 'STRIKETHROUGH',
        'none': 'NONE',
      };
      textNode.textDecoration = decorationMap[styles.textDecoration] || 'NONE';
    }
  }

  /**
   * Resolve a font family with fallback chain
   * Tries the requested family, then fallbacks, then Inter as last resort
   */
  private async resolveFontWithFallback(
    family: string,
    style: string
  ): Promise<FontName> {
    // Build fallback chain
    const chain = FONT_FALLBACK_CHAINS[family] || [family, DEFAULT_FONT_FAMILY];
    // Ensure Inter is always at the end as ultimate fallback
    if (!chain.includes(DEFAULT_FONT_FAMILY)) {
      chain.push(DEFAULT_FONT_FAMILY);
    }

    for (const fontFamily of chain) {
      const font: FontName = { family: fontFamily, style };
      const fontKey = `${fontFamily}-${style}`;

      // Skip already-failed fonts
      if (failedFonts.has(fontKey)) continue;

      // Use cached successful load
      if (loadedFonts.has(fontKey)) return font;

      try {
        await figma.loadFontAsync(font);
        loadedFonts.add(fontKey);
        return font;
      } catch {
        failedFonts.add(fontKey);
      }
    }

    // Absolute last resort: Inter Regular
    const fallback: FontName = { family: DEFAULT_FONT_FAMILY, style: 'Regular' };
    const fallbackKey = `${DEFAULT_FONT_FAMILY}-Regular`;
    if (!loadedFonts.has(fallbackKey)) {
      await figma.loadFontAsync(fallback);
      loadedFonts.add(fallbackKey);
    }
    return fallback;
  }

  /**
   * Load a font asynchronously
   */
  async loadFont(font: FontName): Promise<void> {
    const fontKey = `${font.family}-${font.style}`;
    
    if (loadedFonts.has(fontKey)) {
      return;
    }

    if (failedFonts.has(fontKey)) {
      return;
    }

    try {
      await figma.loadFontAsync(font);
      loadedFonts.add(fontKey);
    } catch (error) {
      failedFonts.add(fontKey);
      // Fall back to default font if requested font unavailable
      console.warn(`Failed to load font ${fontKey}, using fallback`);
      if (font.family !== DEFAULT_FONT_FAMILY) {
        const fallback: FontName = { family: DEFAULT_FONT_FAMILY, style: 'Regular' };
        const fallbackKey = `${DEFAULT_FONT_FAMILY}-Regular`;
        if (!loadedFonts.has(fallbackKey)) {
          await figma.loadFontAsync(fallback);
          loadedFonts.add(fallbackKey);
        }
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
   * Apply drop shadow effect (legacy single shadow)
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
        color: { ...rgba, a: rgba.a !== 1 ? rgba.a : 0.1 },
        offset: { x: offsetX, y: offsetY },
        radius: blur,
        spread: spread,
        visible: true,
        blendMode: 'NORMAL',
      },
    ];
  }

  /**
   * Apply multiple box shadows from analysis
   * Supports both drop shadows and inner shadows
   */
  applyBoxShadows(node: BlendMixin, shadows: BoxShadowDef[]): void {
    const effects: Effect[] = [];

    for (const shadow of shadows) {
      const rgba = this.hexToRgba(shadow.color);
      effects.push({
        type: shadow.inset ? 'INNER_SHADOW' : 'DROP_SHADOW',
        color: rgba,
        offset: { x: shadow.offsetX, y: shadow.offsetY },
        radius: shadow.blur,
        spread: shadow.spread,
        visible: true,
        blendMode: 'NORMAL',
      });
    }

    // Merge with existing effects (e.g., backdrop blur)
    const existing = (node.effects || []).filter(
      (e: Effect) => e.type !== 'DROP_SHADOW' && e.type !== 'INNER_SHADOW'
    );
    node.effects = [...existing, ...effects];
  }

  /**
   * Apply a gradient fill to a node
   * Supports linear and radial gradients
   */
  applyGradientFill(node: GeometryMixin, gradient: GradientDef): void {
    const stops: ColorStop[] = gradient.stops.map(stop => ({
      position: stop.position,
      color: this.hexToRgba(stop.color),
    }));

    if (gradient.type === 'linear') {
      // Convert angle to gradient transform
      // Figma uses a 2x3 transform matrix for gradient direction
      const angleRad = ((gradient.angle || 180) * Math.PI) / 180;
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);

      // Map angle to start/end points (0.5, 0.5 is center)
      const cx = 0.5;
      const cy = 0.5;

      node.fills = [
        {
          type: 'GRADIENT_LINEAR',
          gradientTransform: [
            [cos, sin, cx - (cos + sin) * 0.5],
            [-sin, cos, cy - (-sin + cos) * 0.5],
          ],
          gradientStops: stops,
        },
      ];
    } else {
      // Radial gradient
      node.fills = [
        {
          type: 'GRADIENT_RADIAL',
          gradientTransform: [
            [1, 0, 0],
            [0, 1, 0],
          ],
          gradientStops: stops,
        },
      ];
    }
  }

  /**
   * Apply backdrop blur effect (frosted glass)
   */
  applyBackdropBlur(node: BlendMixin, radius: number): void {
    const blurEffect = {
      type: 'BACKGROUND_BLUR',
      radius: roundToPixel(radius),
      visible: true,
      blurType: 'LAYER_BLUR',
    } as unknown as Effect;

    // Merge with existing effects
    const existing = (node.effects || []).filter(
      (e: Effect) => e.type !== 'BACKGROUND_BLUR'
    );
    node.effects = [...existing, blurEffect];
  }

  /**
   * Apply all relevant styles from ElementStyles to a frame
   * Supports the full range of style properties for pixel-perfect reproduction
   */
  applyElementStyles(node: FrameNode, styles: ElementStyles): void {
    // Apply gradient or solid background
    if (styles.gradient) {
      this.applyGradientFill(node, styles.gradient);
    } else if (styles.backgroundColor) {
      this.applyFills(node, styles.backgroundColor);
    }

    // Apply border with detected width
    if (styles.borderColor) {
      this.applyStrokes(node, styles.borderColor, styles.borderWidth || 1);
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

    // Apply opacity
    if (styles.opacity !== undefined && styles.opacity < 1) {
      this.applyOpacity(node, styles.opacity);
    }

    // Apply box shadows
    if (styles.boxShadow && styles.boxShadow.length > 0) {
      this.applyBoxShadows(node, styles.boxShadow);
    }

    // Apply backdrop blur
    if (styles.backdropBlur && styles.backdropBlur > 0) {
      this.applyBackdropBlur(node, styles.backdropBlur);
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
   * Loads all Inter font weights for pixel-perfect text reproduction
   */
  async preloadFonts(): Promise<void> {
    const fonts: FontName[] = [
      { family: DEFAULT_FONT_FAMILY, style: 'Thin' },
      { family: DEFAULT_FONT_FAMILY, style: 'Extra Light' },
      { family: DEFAULT_FONT_FAMILY, style: 'Light' },
      { family: DEFAULT_FONT_FAMILY, style: 'Regular' },
      { family: DEFAULT_FONT_FAMILY, style: 'Medium' },
      { family: DEFAULT_FONT_FAMILY, style: 'Semi Bold' },
      { family: DEFAULT_FONT_FAMILY, style: 'Bold' },
      { family: DEFAULT_FONT_FAMILY, style: 'Extra Bold' },
      { family: DEFAULT_FONT_FAMILY, style: 'Black' },
    ];

    // Load fonts in parallel, continue on failures (some weights may not be available)
    await Promise.allSettled(fonts.map((font) => this.loadFont(font)));
  }
}
