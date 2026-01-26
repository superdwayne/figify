/**
 * FigmaGenerator - Orchestrates the creation of Figma nodes from UI analysis
 *
 * This is the main entry point for converting structured UI analysis data
 * into editable Figma designs with proper styling and hierarchy.
 */

import type {
  UIAnalysisResponse,
  UIElement,
  GenerationResult,
  GenerationOptions,
  ProgressCallback,
  NodeMap,
  NodeGenerationResult,
} from './types';
import { NodeFactory } from './nodeFactory';
import { StyleApplier } from './styleApplier';
import { LayoutAnalyzer, type LayoutConfig } from './layoutAnalyzer';
import { ShadcnComponentFactory, COMPONENT_SPECS, inferVariant } from '../shadcn';

// Default generation options
const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  scaleFactor: 1,
  maxElements: 100,
  batchSize: 10,
  applyAutoLayout: true,
};

/**
 * Element tree node for processing hierarchy
 */
interface ElementTreeNode {
  element: UIElement;
  children: ElementTreeNode[];
  depth: number;
}

/**
 * Counters for semantic naming per component type
 */
type ComponentCounters = Map<string, number>;

/**
 * Main generator class that orchestrates Figma node creation
 */
export class FigmaGenerator {
  private nodeFactory: NodeFactory;
  private styleApplier: StyleApplier;
  private layoutAnalyzer: LayoutAnalyzer;
  private shadcnFactory: ShadcnComponentFactory;
  private options: Required<GenerationOptions>;
  private nodeMap: NodeMap;
  private progressCallback?: ProgressCallback;
  private componentCounters: ComponentCounters;
  private elementMap: Map<string, UIElement>;

  constructor(options: GenerationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.nodeFactory = new NodeFactory(this.options.scaleFactor);
    this.styleApplier = new StyleApplier();
    this.layoutAnalyzer = new LayoutAnalyzer(this.options.scaleFactor);
    this.shadcnFactory = new ShadcnComponentFactory(this.styleApplier, this.nodeFactory);
    this.nodeMap = new Map();
    this.componentCounters = new Map();
    this.elementMap = new Map();
  }

  /**
   * Set progress callback for generation updates
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Generate Figma design from UI analysis response
   */
  async generate(analysis: UIAnalysisResponse): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      // Validate input
      if (!analysis.elements || analysis.elements.length === 0) {
        return {
          rootNodeId: '',
          elementCount: 0,
          nodeResults: [],
          success: false,
          error: 'No elements to generate',
          duration: Date.now() - startTime,
        };
      }

      // Pre-load fonts before generation
      await this.styleApplier.preloadFonts();

      // Limit elements if needed
      const elements = analysis.elements.slice(0, this.options.maxElements);
      const totalElements = elements.length;

      this.reportProgress('Preparing generation', 0, totalElements);

      // Reset component counters for fresh naming
      this.componentCounters.clear();

      // Build element map for quick lookup
      this.elementMap.clear();
      for (const element of elements) {
        this.elementMap.set(element.id, element);
      }

      // Build element tree for hierarchical processing
      const elementTree = this.buildElementTree(elements);

      // Create root frame with viewport dimensions
      const rootFrame = this.createRootFrame(analysis);
      this.reportProgress('Created root frame', 1, totalElements);

      // Process elements with hierarchy (depth-first)
      const nodeResults: NodeGenerationResult[] = [];
      const rootElements = this.getRootElements(elements, elementTree);
      
      // Optionally apply Auto Layout to root frame if it contains multiple root elements
      let rootHasAutoLayout = false;
      if (this.options.applyAutoLayout && rootElements.length > 1) {
        const rootChildElements = rootElements.map(node => node.element);
        const rootLayoutConfig = this.layoutAnalyzer.analyzeLayout(
          { x: 0, y: 0, width: analysis.viewport.width, height: analysis.viewport.height },
          rootChildElements
        );
        
        if (rootLayoutConfig.mode !== 'NONE') {
          rootFrame.layoutMode = rootLayoutConfig.mode;
          this.applyAutoLayoutConfig(rootFrame, rootLayoutConfig);
          rootHasAutoLayout = true;
        }
      }

      let processedCount = 0;
      for (const treeNode of rootElements) {
        const results = await this.processElementWithChildren(treeNode, rootFrame, rootHasAutoLayout);
        nodeResults.push(...results);
        processedCount += this.countNodes(treeNode);
        this.reportProgress('Processing elements', processedCount, totalElements);

        // Yield to event loop between root elements to prevent freezing
        await this.yieldToEventLoop();
      }

      // Position root frame in view
      this.positionInView(rootFrame);

      this.reportProgress('Generation complete', totalElements, totalElements);

      return {
        rootNodeId: rootFrame.id,
        elementCount: totalElements,
        nodeResults,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        rootNodeId: '',
        elementCount: 0,
        nodeResults: [],
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Build element tree from flat array using children references
   */
  private buildElementTree(elements: UIElement[]): Map<string, ElementTreeNode> {
    const elementMap = new Map<string, UIElement>();
    const treeMap = new Map<string, ElementTreeNode>();

    // First pass: create map of all elements
    for (const element of elements) {
      elementMap.set(element.id, element);
    }

    // Second pass: build tree nodes
    for (const element of elements) {
      const treeNode: ElementTreeNode = {
        element,
        children: [],
        depth: 0,
      };
      treeMap.set(element.id, treeNode);
    }

    // Third pass: establish parent-child relationships
    for (const element of elements) {
      if (element.children && element.children.length > 0) {
        const parentNode = treeMap.get(element.id)!;
        for (const childId of element.children) {
          const childNode = treeMap.get(childId);
          if (childNode) {
            childNode.depth = parentNode.depth + 1;
            parentNode.children.push(childNode);
          }
        }
      }
    }

    return treeMap;
  }

  /**
   * Get root elements (elements that are not children of any other element)
   */
  private getRootElements(elements: UIElement[], treeMap: Map<string, ElementTreeNode>): ElementTreeNode[] {
    // Collect all child IDs
    const childIds = new Set<string>();
    for (const element of elements) {
      if (element.children) {
        for (const childId of element.children) {
          childIds.add(childId);
        }
      }
    }

    // Root elements are those not in childIds
    const rootElements: ElementTreeNode[] = [];
    for (const element of elements) {
      if (!childIds.has(element.id)) {
        const treeNode = treeMap.get(element.id);
        if (treeNode) {
          rootElements.push(treeNode);
        }
      }
    }

    return rootElements;
  }

  /**
   * Count total nodes in a tree (including children)
   */
  private countNodes(node: ElementTreeNode): number {
    let count = 1;
    for (const child of node.children) {
      count += this.countNodes(child);
    }
    return count;
  }

  /**
   * Process an element and its children recursively (depth-first)
   */
  private async processElementWithChildren(
    treeNode: ElementTreeNode,
    parent: FrameNode,
    parentHasAutoLayout: boolean = false
  ): Promise<NodeGenerationResult[]> {
    const results: NodeGenerationResult[] = [];
    const { element, children } = treeNode;

    try {
      // Create the current element
      const node = await this.createElement(element, parent, children.length > 0);
      this.nodeMap.set(element.id, node);

      // Apply child constraints if parent has Auto Layout
      if (parentHasAutoLayout && node.type === 'FRAME') {
        this.applyChildConstraints(node as FrameNode, parent, element);
      }

      results.push({
        nodeId: node.id,
        elementId: element.id,
        success: true,
      });

      // Determine if this node has Auto Layout for its children
      const nodeHasAutoLayout = 
        node.type === 'FRAME' && 
        (node as FrameNode).layoutMode !== 'NONE';

      // If this element is a container with children, process children
      if (children.length > 0 && node.type === 'FRAME') {
        for (const childNode of children) {
          const childResults = await this.processElementWithChildren(
            childNode, 
            node as FrameNode,
            nodeHasAutoLayout
          );
          results.push(...childResults);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        nodeId: '',
        elementId: element.id,
        success: false,
        error: errorMessage,
      });
    }

    return results;
  }

  /**
   * Apply constraints to child elements within Auto Layout parents
   */
  private applyChildConstraints(
    child: FrameNode,
    parent: FrameNode,
    element: UIElement
  ): void {
    const parentLayoutMode = parent.layoutMode;
    
    if (parentLayoutMode === 'NONE') return;

    // Determine if child should fill or hug based on its relative size
    const parentContentWidth = parent.width - parent.paddingLeft - parent.paddingRight;
    const parentContentHeight = parent.height - parent.paddingTop - parent.paddingBottom;
    
    const widthRatio = element.bounds.width / parentContentWidth;
    const heightRatio = element.bounds.height / parentContentHeight;

    // If child takes up most of the parent's content area, set to FILL
    const FILL_THRESHOLD = 0.9;

    if (parentLayoutMode === 'HORIZONTAL') {
      // In horizontal layout, check if child should fill vertical space
      if (heightRatio >= FILL_THRESHOLD) {
        child.layoutSizingVertical = 'FILL';
      } else {
        child.layoutSizingVertical = 'FIXED';
      }
      // Horizontal sizing is usually fixed in horizontal layout
      child.layoutSizingHorizontal = 'FIXED';
    } else if (parentLayoutMode === 'VERTICAL') {
      // In vertical layout, check if child should fill horizontal space
      if (widthRatio >= FILL_THRESHOLD) {
        child.layoutSizingHorizontal = 'FILL';
      } else {
        child.layoutSizingHorizontal = 'FIXED';
      }
      // Vertical sizing is usually fixed in vertical layout
      child.layoutSizingVertical = 'FIXED';
    }
  }

  /**
   * Create the root frame with viewport dimensions
   */
  private createRootFrame(analysis: UIAnalysisResponse): FrameNode {
    const { viewport } = analysis;
    const scaledWidth = viewport.width * this.options.scaleFactor;
    const scaledHeight = viewport.height * this.options.scaleFactor;

    const frame = this.nodeFactory.createFrame({
      name: 'Generated Design',
      bounds: {
        x: 0,
        y: 0,
        width: scaledWidth,
        height: scaledHeight,
      },
    });

    // Apply white background
    this.styleApplier.applyFills(frame, '#FFFFFF');

    return frame;
  }

  /**
   * Create a single UI element as a Figma node
   *
   * For supported Shadcn components (Button, Card, Badge, Input), uses
   * ShadcnComponentFactory for proper variant-based styling. For other
   * components, falls back to generic styling.
   */
  private async createElement(
    element: UIElement,
    parent: FrameNode,
    hasChildren: boolean = false
  ): Promise<SceneNode> {
    // Check if this is a supported Shadcn component (Button, Card, Badge, Input)
    const hasShadcnSpec = element.component in COMPONENT_SPECS;

    // For supported Shadcn components without children, use the Shadcn factory
    if (hasShadcnSpec && !hasChildren) {
      // Infer variant if not provided by Claude's analysis
      const enhancedElement = this.enhanceElementWithVariant(element);
      return await this.shadcnFactory.createComponent(enhancedElement, parent);
    }

    // Determine if this is a text-only element or a container
    const hasTextContent = element.content && element.content.trim().length > 0;
    const isTextElement = element.component === 'Typography' ||
      (hasTextContent && !hasChildren && !element.children?.length);

    if (isTextElement && element.content) {
      // Create text node
      const textNode = this.nodeFactory.createText({
        name: this.generateSemanticName(element),
        content: element.content,
        bounds: element.bounds,
        styles: element.styles,
      });

      // Apply text styles
      await this.styleApplier.applyTextStyles(textNode, element.styles);

      parent.appendChild(textNode);
      return textNode;
    } else {
      // Create frame node (container)
      const name = hasChildren
        ? `${this.generateSemanticName(element)}-container`
        : this.generateSemanticName(element);

      // Analyze layout if this element has children and Auto Layout is enabled
      let layoutConfig: LayoutConfig | null = null;
      if (this.options.applyAutoLayout && hasChildren && element.children?.length) {
        const childElements = this.getChildElements(element.children);
        if (childElements.length > 0) {
          layoutConfig = this.layoutAnalyzer.analyzeLayout(element.bounds, childElements);
        }
      }

      const frame = this.nodeFactory.createFrame({
        name,
        bounds: element.bounds,
        styles: element.styles,
        layoutMode: layoutConfig?.mode,
        padding: layoutConfig?.padding,
        itemSpacing: layoutConfig?.itemSpacing,
      });

      // Apply Auto Layout properties if detected
      if (layoutConfig && layoutConfig.mode !== 'NONE') {
        this.applyAutoLayoutConfig(frame, layoutConfig);
      }

      // Apply visual styles
      if (element.styles.backgroundColor) {
        this.styleApplier.applyFills(frame, element.styles.backgroundColor);
      }
      if (element.styles.borderColor) {
        this.styleApplier.applyStrokes(frame, element.styles.borderColor, 1);
      }
      if (element.styles.borderRadius) {
        this.styleApplier.applyCornerRadius(frame, element.styles.borderRadius);
      }

      // Add text content if present and no children (for buttons, badges, etc.)
      if (hasTextContent && !hasChildren && element.content) {
        // For elements with text (like buttons), apply Auto Layout for centering
        if (this.options.applyAutoLayout) {
          frame.layoutMode = 'HORIZONTAL';
          frame.primaryAxisAlignItems = 'CENTER';
          frame.counterAxisAlignItems = 'CENTER';
          frame.primaryAxisSizingMode = 'FIXED';
          frame.counterAxisSizingMode = 'FIXED';

          // Apply padding from styles or calculate from bounds
          const padding = element.styles.padding || { top: 8, right: 16, bottom: 8, left: 16 };
          frame.paddingTop = padding.top;
          frame.paddingRight = padding.right;
          frame.paddingBottom = padding.bottom;
          frame.paddingLeft = padding.left;
        }

        const textNode = this.nodeFactory.createText({
          name: `${name}-text`,
          content: element.content,
          bounds: {
            x: 0,
            y: 0,
            width: element.bounds.width,
            height: element.bounds.height,
          },
          styles: element.styles,
        });
        await this.styleApplier.applyTextStyles(textNode, element.styles);
        frame.appendChild(textNode);
      }

      parent.appendChild(frame);
      return frame;
    }
  }

  /**
   * Enhance element with inferred variant if not provided
   *
   * When Claude's analysis doesn't include a variant, uses visual properties
   * (background color, border) to infer the most likely variant.
   */
  private enhanceElementWithVariant(element: UIElement): UIElement {
    // If variant is already provided, use element as-is
    if (element.variant) {
      return element;
    }

    // Try to infer variant from visual properties
    const inferredVariant = inferVariant(element.component, element.styles);

    // If no variant could be inferred, return original element
    if (!inferredVariant) {
      return element;
    }

    // Return enhanced element with inferred variant
    return {
      ...element,
      variant: inferredVariant,
    };
  }

  /**
   * Get child UIElement objects from their IDs
   */
  private getChildElements(childIds: string[]): UIElement[] {
    const children: UIElement[] = [];
    for (const id of childIds) {
      const element = this.elementMap.get(id);
      if (element) {
        children.push(element);
      }
    }
    return children;
  }

  /**
   * Apply Auto Layout configuration to a frame
   */
  private applyAutoLayoutConfig(frame: FrameNode, config: LayoutConfig): void {
    // Layout mode is already set by NodeFactory
    
    // Apply alignment
    frame.primaryAxisAlignItems = config.primaryAxisAlignItems;
    frame.counterAxisAlignItems = config.counterAxisAlignItems;
    
    // Apply sizing modes
    frame.primaryAxisSizingMode = config.primaryAxisSizingMode;
    frame.counterAxisSizingMode = config.counterAxisSizingMode;
    
    // Note: padding and itemSpacing are already set by NodeFactory
  }

  /**
   * Generate semantic name for an element
   * Pattern: {component}-{variant}-{index}
   * Uses counters per component type for consistent numbering
   */
  private generateSemanticName(element: UIElement): string {
    const component = element.component.toLowerCase();
    const variant = element.variant ? `-${element.variant.toLowerCase()}` : '';
    
    // Get and increment counter for this component type
    const key = `${component}${variant}`;
    const count = (this.componentCounters.get(key) || 0) + 1;
    this.componentCounters.set(key, count);

    return `${component}${variant}-${count}`;
  }

  /**
   * Split elements into batches
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Yield to event loop to prevent UI freezing
   */
  private async yieldToEventLoop(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Position the root frame in the current viewport
   */
  private positionInView(frame: FrameNode): void {
    // Position at current viewport center
    const viewport = figma.viewport.center;
    frame.x = viewport.x - frame.width / 2;
    frame.y = viewport.y - frame.height / 2;
  }

  /**
   * Report progress to callback
   */
  private reportProgress(step: string, current: number, total: number): void {
    if (this.progressCallback) {
      this.progressCallback(step, current, total);
    }
  }

  /**
   * Get the node map for external access
   */
  getNodeMap(): NodeMap {
    return this.nodeMap;
  }
}
