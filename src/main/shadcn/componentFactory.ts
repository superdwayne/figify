/**
 * ShadcnComponentFactory - Creates Figma nodes with Shadcn styling
 *
 * Transforms UIElement data from AI analysis into styled Figma nodes
 * using component specifications. Handles both known Shadcn components
 * and unknown elements with graceful fallback.
 */

import type { UIElement } from '../../ui/types/analysis';
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
   * @returns Created scene node (Promise due to async font loading for text)
   */
  async createComponent(element: UIElement, parent: FrameNode): Promise<SceneNode> {
    // Look up component spec
    const spec = COMPONENT_SPECS[element.component];

    if (!spec) {
      // Unknown component - use generic styling
      return this.createGenericElement(element, parent);
    }

    // Resolve styles from spec using variant and size
    const variant = element.variant || spec.defaultVariant;
    const size = element.size || spec.defaultSize;
    const resolvedStyles = resolveStyles(spec, variant, size);

    // Merge with AI-detected styles (preserves custom colors)
    const finalStyles = mergeWithOverrides(resolvedStyles, element.styles);

    // Create appropriate node based on component type
    if (element.component === 'Typography') {
      return await this.createTextNode(element, finalStyles, parent);
    }

    // Default: create a frame for container components
    return this.createFrameNode(element, finalStyles, parent);
  }

  /**
   * Create a generic element when no component spec is available
   *
   * Uses raw element.styles directly without spec transformation.
   * This handles unknown component types gracefully.
   *
   * @param element - UI element from analysis
   * @param parent - Parent frame to append the node to
   * @returns Created frame node
   */
  createGenericElement(element: UIElement, parent: FrameNode): FrameNode {
    // Create frame with element bounds
    const frame = this.nodeFactory.createFrame({
      name: `${element.component} (${element.id})`,
      bounds: element.bounds,
    });

    // Apply raw element styles directly
    if (element.styles.backgroundColor) {
      this.styleApplier.applyFills(frame, element.styles.backgroundColor);
    }

    if (element.styles.borderColor) {
      this.styleApplier.applyStrokes(frame, element.styles.borderColor, 1);
    }

    if (element.styles.borderRadius !== undefined) {
      this.styleApplier.applyCornerRadius(frame, element.styles.borderRadius);
    }

    if (element.styles.padding) {
      frame.paddingTop = element.styles.padding.top;
      frame.paddingRight = element.styles.padding.right;
      frame.paddingBottom = element.styles.padding.bottom;
      frame.paddingLeft = element.styles.padding.left;
    }

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
   * @returns Created frame node
   */
  private createFrameNode(
    element: UIElement,
    styles: ResolvedStyles,
    parent: FrameNode
  ): FrameNode {
    // Create frame with element bounds
    const frame = this.nodeFactory.createFrame({
      name: `${element.component} (${element.id})`,
      bounds: element.bounds,
    });

    // Apply resolved styles
    this.applyResolvedStyles(frame, styles);

    // Set up Auto Layout if padding is specified
    if (styles.paddingX !== undefined || styles.paddingY !== undefined) {
      frame.layoutMode = 'HORIZONTAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'FIXED';
      frame.primaryAxisAlignItems = 'CENTER';
      frame.counterAxisAlignItems = 'CENTER';
    }

    // Append to parent
    parent.appendChild(frame);

    return frame;
  }

  /**
   * Create a text node for Typography components
   *
   * @param element - UI element from analysis
   * @param styles - Resolved styles to apply
   * @param parent - Parent frame to append the node to
   * @returns Created text node
   */
  private async createTextNode(
    element: UIElement,
    styles: ResolvedStyles,
    parent: FrameNode
  ): Promise<TextNode> {
    const textNode = this.nodeFactory.createText({
      name: `Typography (${element.id})`,
      content: element.content || 'Text',
      bounds: element.bounds,
    });

    // Apply text-specific styles
    await this.styleApplier.applyTextStyles(textNode, {
      fontSize: styles.fontSize,
      fontWeight: styles.fontWeight,
      textColor: styles.textColor,
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
