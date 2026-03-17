/**
 * ShadcnComponentFactory - Creates Figma nodes with Shadcn styling
 *
 * Transforms UIElement data from AI analysis into styled Figma nodes
 * using component specifications. Handles both known Shadcn components
 * and unknown elements with graceful fallback.
 *
 * Supports coordinate conversion for elements nested inside parent frames.
 */

import type { UIElement, Bounds } from '../../ui/types/analysis';
import type { ResolvedStyles, ShadowSpec } from './types';
import { COMPONENT_SPECS } from './specs/index';
import { resolveStyles, mergeWithOverrides } from './variantResolver';
import type { StyleApplier } from '../generator/styleApplier';
import type { NodeFactory } from '../generator/nodeFactory';

/**
 * Factory for creating Figma nodes with Shadcn component styling
 */
export class ShadcnComponentFactory {
  private styleApplier: StyleApplier;
  private nodeFactory: NodeFactory;

  /**
   * Create a new ShadcnComponentFactory
   *
   * @param styleApplier - StyleApplier instance for applying visual styles
   * @param nodeFactory - NodeFactory instance for creating Figma nodes
   */
  constructor(styleApplier: StyleApplier, nodeFactory: NodeFactory) {
    this.styleApplier = styleApplier;
    this.nodeFactory = nodeFactory;
  }

  /**
   * Create a Figma node for a UI element using Shadcn styling
   *
   * Looks up the component spec, resolves variant/size styles, and applies
   * them to the created node. Falls back to generic styling for unknown components.
   *
   * @param element - UI element from analysis
   * @param parent - Parent frame to append the node to
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   * @returns Created scene node (Promise due to async font loading for text)
   */
  async createComponent(element: UIElement, parent: FrameNode, parentBounds?: Bounds): Promise<SceneNode> {
    // Look up component spec
    const spec = COMPONENT_SPECS[element.component];

    if (!spec) {
      // Unknown component - use generic styling
      return this.createGenericElement(element, parent, parentBounds);
    }

    // Resolve styles from spec using variant and size
    const variant = element.variant || spec.defaultVariant;
    const size = element.size || spec.defaultSize;
    const resolvedStyles = resolveStyles(spec, variant, size);

    // Merge with AI-detected styles (preserves custom colors)
    const finalStyles = mergeWithOverrides(resolvedStyles, element.styles);

    // Create appropriate node based on component type
    if (element.component === 'Typography') {
      return await this.createTextNode(element, finalStyles, parent, parentBounds);
    }

    // Default: create a frame for container components
    return await this.createFrameNode(element, finalStyles, parent, parentBounds);
  }

  /**
   * Create a generic element when no component spec is available
   *
   * Uses raw element.styles directly without spec transformation.
   * This handles unknown component types gracefully.
   *
   * @param element - UI element from analysis
   * @param parent - Parent frame to append the node to
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   * @returns Created frame node
   */
  createGenericElement(element: UIElement, parent: FrameNode, parentBounds?: Bounds): FrameNode {
    // Create frame with element bounds (converted to relative if parent provided)
    const frame = this.nodeFactory.createFrame({
      name: `${element.component} (${element.id})`,
      bounds: element.bounds,
    }, parentBounds);

    // Apply all visual styles (bg, gradient, border, radius, opacity, shadows, blur)
    this.styleApplier.applyElementStyles(frame, element.styles);

    // Append to parent
    parent.appendChild(frame);

    return frame;
  }

  /**
   * Create a styled frame node for container components
   *
   * @param element - UI element from analysis
   * @param styles - Resolved styles to apply
   * @param parent - Parent frame to append the node to
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   * @returns Created frame node
   */
  private async createFrameNode(
    element: UIElement,
    styles: ResolvedStyles,
    parent: FrameNode,
    parentBounds?: Bounds
  ): Promise<FrameNode> {
    // Create frame with element bounds (converted to relative if parent provided)
    const frame = this.nodeFactory.createFrame({
      name: `${element.component} (${element.id})`,
      bounds: element.bounds,
    }, parentBounds);

    // Apply resolved styles
    this.applyResolvedStyles(frame, styles);

    // Set up Auto Layout if padding is specified (for buttons, badges, etc.)
    if (styles.paddingX !== undefined || styles.paddingY !== undefined) {
      frame.layoutMode = 'HORIZONTAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
      frame.primaryAxisAlignItems = 'CENTER';
      frame.counterAxisAlignItems = 'CENTER';
      frame.clipsContent = false; // Allow content to be visible
    }

    // For Button and Badge components with text content, create the text node here
    // This ensures we use the resolved variant styles (e.g., white text on dark button)
    const isTextComponent = element.component === 'Button' || element.component === 'Badge';
    if (isTextComponent && element.content && element.content.trim()) {
      await this.createComponentText(frame, element.content, styles, element.component);
    }

    // Append to parent
    parent.appendChild(frame);

    return frame;
  }

  /**
   * Create text node inside a component with proper Auto Layout sizing
   *
   * Used for Button and Badge components where text needs to be centered
   * and use the resolved variant styles (e.g., white text on dark background).
   *
   * @param parent - Parent frame (button or badge)
   * @param content - Text content
   * @param styles - Resolved component styles (includes textColor from variant)
   * @param componentType - Type of component for naming
   */
  private async createComponentText(
    parent: FrameNode,
    content: string,
    styles: ResolvedStyles,
    componentType: string
  ): Promise<TextNode> {
    const textNode = figma.createText();
    textNode.name = `${componentType.toLowerCase()}-text`;

    // Load font before setting characters
    await this.styleApplier.applyTextStyles(textNode, {
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      textColor: styles.textColor,
      fontFamily: styles.fontFamily,
      textAlign: 'center',
    });

    // Set text content after font is loaded
    textNode.characters = content;

    // Use WIDTH_AND_HEIGHT so text hugs its content
    // This allows Auto Layout to properly center the text
    textNode.textAutoResize = 'WIDTH_AND_HEIGHT';

    // Append to component frame
    parent.appendChild(textNode);

    return textNode;
  }

  /**
   * Create a text node for Typography components
   *
   * @param element - UI element from analysis
   * @param styles - Resolved styles to apply
   * @param parent - Parent frame to append the node to
   * @param parentBounds - Optional parent bounds for relative coordinate conversion
   * @returns Created text node
   */
  private async createTextNode(
    element: UIElement,
    styles: ResolvedStyles,
    parent: FrameNode,
    parentBounds?: Bounds
  ): Promise<TextNode> {
    const textNode = this.nodeFactory.createText({
      name: `Typography (${element.id})`,
      content: element.content || 'Text',
      bounds: element.bounds,
    }, parentBounds);

    // Apply text-specific styles - always use resolved styles which now 
    // prioritize AI-detected values for pixel-perfect reproduction
    await this.styleApplier.applyTextStyles(textNode, {
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      textColor: styles.textColor,
      fontFamily: styles.fontFamily || element.styles.fontFamily,
      textAlign: styles.textAlign || element.styles.textAlign,
      // Pass through line height and letter spacing from original element
      lineHeight: element.styles.lineHeight,
      letterSpacing: element.styles.letterSpacing,
    });

    // Append to parent
    parent.appendChild(textNode);

    return textNode;
  }

  /**
   * Apply resolved styles to a frame node
   *
   * @param node - Frame node to style
   * @param styles - Resolved styles to apply
   */
  private applyResolvedStyles(node: FrameNode, styles: ResolvedStyles): void {
    // Apply background color
    if (styles.backgroundColor) {
      this.styleApplier.applyFills(node, styles.backgroundColor);
    }

    // Apply border
    if (styles.borderColor && styles.borderWidth) {
      this.styleApplier.applyStrokes(node, styles.borderColor, styles.borderWidth);
    }

    // Apply corner radius
    if (styles.borderRadius !== undefined) {
      this.styleApplier.applyCornerRadius(node, styles.borderRadius);
    }

    // Apply padding (requires Auto Layout to be enabled first)
    if (styles.paddingX !== undefined || styles.paddingY !== undefined) {
      const paddingX = styles.paddingX || 0;
      const paddingY = styles.paddingY || 0;
      node.paddingTop = paddingY;
      node.paddingRight = paddingX;
      node.paddingBottom = paddingY;
      node.paddingLeft = paddingX;
    }

    // Apply drop shadow
    if (styles.shadow) {
      this.applyDropShadow(node, styles.shadow);
    }
  }

  /**
   * Apply drop shadow effect to a node
   *
   * @param node - Node to apply shadow to
   * @param shadow - Shadow specification
   */
  private applyDropShadow(node: FrameNode, shadow: ShadowSpec): void {
    this.styleApplier.applyDropShadow(node, {
      color: shadow.color,
      offsetX: shadow.offsetX,
      offsetY: shadow.offsetY,
      blur: shadow.blur,
      spread: shadow.spread,
    });
  }
}
