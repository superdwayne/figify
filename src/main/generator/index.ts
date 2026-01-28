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
  Bounds,
  VirtualContainer,
} from './types';
import { NodeFactory } from './nodeFactory';
import { StyleApplier } from './styleApplier';
import { LayoutAnalyzer, type LayoutConfig } from './layoutAnalyzer';
import { LayoutStructurer } from './layoutStructurer';
import { ShadcnComponentFactory, COMPONENT_SPECS, inferVariant } from '../shadcn';

// Default generation options
const DEFAULT_OPTIONS: Required<GenerationOptions> = {
  scaleFactor: 1,
  maxElements: 100,
  batchSize: 10,
  applyAutoLayout: true,
};

// Performance constants
const PROGRESS_THROTTLE_MS = 100; // Max 10 updates per second
const GENERATION_TIMEOUT_MS = 30000; // 30 second timeout

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
  private layoutStructurer: LayoutStructurer;
  private shadcnFactory: ShadcnComponentFactory;
  private options: Required<GenerationOptions>;
  private nodeMap: NodeMap;
  private progressCallback?: ProgressCallback;
  private componentCounters: ComponentCounters;
  private elementMap: Map<string, UIElement>;
  private containerMap: Map<string, VirtualContainer>;

  // Performance tracking
  private lastProgressTime: number = 0;
  private generationStartTime: number = 0;

  constructor(options: GenerationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.nodeFactory = new NodeFactory(this.options.scaleFactor);
    this.styleApplier = new StyleApplier();
    this.layoutAnalyzer = new LayoutAnalyzer(this.options.scaleFactor);
    this.layoutStructurer = new LayoutStructurer();
    this.shadcnFactory = new ShadcnComponentFactory(this.styleApplier, this.nodeFactory);
    this.nodeMap = new Map();
    this.componentCounters = new Map();
    this.elementMap = new Map();
    this.containerMap = new Map();
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
    this.generationStartTime = startTime;
    this.lastProgressTime = 0; // Reset throttle timer

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

      // Check for timeout after font loading
      if (this.hasTimedOut()) {
        return {
          rootNodeId: '',
          elementCount: 0,
          nodeResults: [],
          success: false,
          error: 'Generation timed out during font loading',
          duration: Date.now() - startTime,
        };
      }

      // Filter out elements with invalid bounds and log what was filtered
      const invalidBoundsElements: string[] = [];
      const validElements = analysis.elements.filter(el => {
        const isValid = el.bounds &&
          typeof el.bounds.width === 'number' &&
          typeof el.bounds.height === 'number' &&
          el.bounds.width > 0 &&
          el.bounds.height > 0;
        if (!isValid) {
          invalidBoundsElements.push(`${el.id} (${el.component}): bounds=${JSON.stringify(el.bounds)}`);
        }
        return isValid;
      });

      if (invalidBoundsElements.length > 0) {
        console.warn(`[FigmaGenerator] Filtered ${invalidBoundsElements.length} elements with invalid bounds:`, invalidBoundsElements);
      }

      // Limit elements if needed
      const limitedElements = validElements.slice(0, this.options.maxElements);
      if (validElements.length > this.options.maxElements) {
        console.warn(`[FigmaGenerator] Limited from ${validElements.length} to ${this.options.maxElements} elements`);
      }

      if (limitedElements.length === 0) {
        return {
          rootNodeId: '',
          elementCount: 0,
          nodeResults: [],
          success: false,
          error: 'No valid elements to generate (all elements had invalid bounds)',
          duration: Date.now() - startTime,
        };
      }

      this.reportProgress('Analyzing layout structure', 0, limitedElements.length);

      // Use LayoutStructurer to detect spatial patterns and create virtual containers
      // This automatically groups elements into rows, columns, or grids
      const structuredResult = this.layoutStructurer.structure(limitedElements);

      // Log layout analysis results for debugging
      const containersCreated = structuredResult.containers.length;
      console.log(`[FigmaGenerator] Layout analysis: ${containersCreated} containers created`);
      if (structuredResult.metadata) {
        console.log('[FigmaGenerator] Layout metadata:', structuredResult.metadata);
      }

      // Decide which elements to use:
      // - If containers were created, use structuredResult.elements (includes virtual containers)
      // - If no containers, use original limitedElements to preserve Claude's hierarchy
      const hasContainers = structuredResult.containers.length > 0;
      const elements = hasContainers ? structuredResult.elements : limitedElements;
      const totalElements = elements.length;

      console.log(`[FigmaGenerator] Using ${hasContainers ? 'restructured' : 'original'} elements (${totalElements} total)`);

      this.reportProgress('Preparing generation', 0, totalElements);

      // Reset component counters for fresh naming
      this.componentCounters.clear();

      // Build element map for quick lookup
      this.elementMap.clear();
      for (const element of elements) {
        this.elementMap.set(element.id, element);
      }

      // Build container map for spacing lookup
      this.containerMap.clear();
      for (const container of structuredResult.containers) {
        this.containerMap.set(container.id, container);
      }

      // Build element tree for hierarchical processing
      const elementTree = this.buildElementTree(elements);

      // Create root frame with viewport dimensions
      const rootFrame = this.createRootFrame(analysis);
      this.reportProgress('Created root frame', 1, totalElements);

      // Process elements with hierarchy (depth-first)
      const nodeResults: NodeGenerationResult[] = [];
      const rootElements = this.getRootElements(elements, elementTree);

      // Log root elements for debugging
      console.log(`[FigmaGenerator] Root elements (${rootElements.length}):`,
        rootElements.map(n => `${n.element.id} (${n.element.component})`).join(', '));

      // Optionally apply Auto Layout to root frame if it contains multiple root elements
      // Only apply if elements form a simple linear layout (single row or column)
      // NOT when they're scattered across 2D space (which would cause them to line up incorrectly)
      let rootHasAutoLayout = false;
      if (this.options.applyAutoLayout && rootElements.length > 1) {
        const rootChildElements = rootElements.map(node => node.element);
        
        // Only apply Auto Layout if elements truly form a single row OR column
        if (this.isSimpleLinearLayout(rootChildElements)) {
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
      }

      let processedCount = 0;
      let timedOut = false;
      
      for (const treeNode of rootElements) {
        // Check for timeout before processing each root element
        if (this.hasTimedOut()) {
          timedOut = true;
          break;
        }

        // Root elements have no parent element for coordinate conversion (use absolute coords)
        const results = await this.processElementWithChildren(
          treeNode, 
          rootFrame, 
          undefined, // No parent element for root-level elements
          rootHasAutoLayout
        );
        nodeResults.push(...results);
        processedCount += this.countNodes(treeNode);
        this.reportProgress('Processing elements', processedCount, totalElements);

        // Yield to event loop between root elements to prevent freezing
        await this.yieldToEventLoop();
      }

      // If timed out, still return partial results
      if (timedOut) {
        this.positionInView(rootFrame);
        return {
          rootNodeId: rootFrame.id,
          elementCount: processedCount,
          nodeResults,
          success: true, // Partial success
          duration: Date.now() - startTime,
          error: `Generation timed out after ${processedCount} elements. Partial design created.`,
        };
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
   *
   * @param treeNode - Current element tree node to process
   * @param parent - Parent Figma frame to append to
   * @param parentElement - Parent UIElement for coordinate conversion (undefined for root-level elements)
   * @param parentHasAutoLayout - Whether parent has Auto Layout enabled
   */
  private async processElementWithChildren(
    treeNode: ElementTreeNode,
    parent: FrameNode,
    parentElement?: UIElement,
    parentHasAutoLayout: boolean = false
  ): Promise<NodeGenerationResult[]> {
    const results: NodeGenerationResult[] = [];
    const { element, children } = treeNode;

    try {
      // Create the current element with relative coords if inside a parent
      const node = await this.createElement(element, parent, children.length > 0, parentElement?.bounds);
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
            element, // Current element becomes parent for children (for coordinate conversion)
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
   *
   * @param element - The UI element to create
   * @param parent - Parent Figma frame to append to
   * @param hasChildren - Whether this element has children
   * @param parentBounds - Parent element's bounds for relative coordinate conversion
   *                       When provided, element.bounds are treated as absolute and
   *                       converted to relative coordinates within the parent
   */
  private async createElement(
    element: UIElement,
    parent: FrameNode,
    hasChildren: boolean = false,
    parentBounds?: Bounds
  ): Promise<SceneNode> {
    // Handle Image elements - create placeholder rectangles
    if (element.component === 'Image') {
      const imageName = element.imageDescription
        ? `image-${element.imageDescription.slice(0, 30).replace(/\s+/g, '-')}`
        : this.generateSemanticName(element);

      const imageNode = this.nodeFactory.createImagePlaceholder(
        imageName,
        element.bounds,
        parentBounds
      );

      // Apply border radius if specified
      if (element.styles.borderRadius) {
        this.styleApplier.applyCornerRadius(imageNode, element.styles.borderRadius);
      }

      parent.appendChild(imageNode);
      return imageNode;
    }

    // Handle Icon elements - create smaller placeholder rectangles
    if (element.component === 'Icon') {
      const iconName = element.iconName
        ? `icon-${element.iconName}`
        : this.generateSemanticName(element);

      const iconNode = this.nodeFactory.createIconPlaceholder(
        iconName,
        element.bounds,
        parentBounds
      );

      // Apply icon color if specified (textColor is used for icon fill)
      if (element.styles.textColor) {
        this.styleApplier.applyFills(iconNode, element.styles.textColor);
      }

      parent.appendChild(iconNode);
      return iconNode;
    }

    // Handle Shape elements - create styled rectangles
    if (element.component === 'Shape') {
      const shapeNode = this.nodeFactory.createRectangle(
        this.generateSemanticName(element),
        element.bounds,
        parentBounds
      );

      // Apply visual styles
      if (element.styles.backgroundColor) {
        this.styleApplier.applyFills(shapeNode, element.styles.backgroundColor);
      }
      if (element.styles.borderColor) {
        this.styleApplier.applyStrokes(shapeNode, element.styles.borderColor, 1);
      }
      if (element.styles.borderRadius) {
        this.styleApplier.applyCornerRadius(shapeNode, element.styles.borderRadius);
      }

      parent.appendChild(shapeNode);
      return shapeNode;
    }

    // Handle virtual Container elements (created by LayoutStructurer)
    // These have variant='row'|'column'|'grid' indicating the layout type
    if (element.component === 'Container') {
      const containerName = element.variant
        ? `${element.variant}-container-${element.id.split('-').pop()}`
        : this.generateSemanticName(element);

      // Determine layout mode from variant
      let layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE' = 'NONE';
      const isGrid = element.variant === 'grid';
      if (element.variant === 'row' || isGrid) {
        layoutMode = 'HORIZONTAL';
      } else if (element.variant === 'column') {
        layoutMode = 'VERTICAL';
      }

      const frame = this.nodeFactory.createFrame({
        name: containerName,
        bounds: element.bounds,
        styles: element.styles,
        layoutMode: this.options.applyAutoLayout ? layoutMode : 'NONE',
      }, parentBounds);

      // Apply Auto Layout with detected spacing from containerMap
      if (this.options.applyAutoLayout && layoutMode !== 'NONE') {
        frame.layoutMode = layoutMode;
        frame.primaryAxisAlignItems = 'MIN';
        frame.counterAxisAlignItems = 'MIN';
        frame.primaryAxisSizingMode = 'FIXED';
        frame.counterAxisSizingMode = 'FIXED';
        frame.clipsContent = false; // Allow children to be visible during development

        // Get spacing from containerMap if available
        const container = this.containerMap.get(element.id);
        if (container) {
          if (element.variant === 'row') {
            // Row: horizontal spacing between items
            frame.itemSpacing = container.horizontalSpacing;
          } else if (element.variant === 'column') {
            // Column: vertical spacing between items
            frame.itemSpacing = container.verticalSpacing;
          } else if (isGrid) {
            // Grid: enable wrapping with horizontal and vertical spacing
            frame.layoutWrap = 'WRAP';
            frame.itemSpacing = container.horizontalSpacing; // Horizontal gaps
            frame.counterAxisSpacing = container.verticalSpacing; // Row gaps
          }
        } else {
          // Fallback: calculate spacing from children if container not found
          if (element.children && element.children.length > 1) {
            const childElements = this.getChildElements(element.children);
            if (childElements.length > 1) {
              const spacing = this.calculateChildSpacing(childElements, layoutMode);
              frame.itemSpacing = spacing;
            }
          }
        }
      }

      parent.appendChild(frame);
      return frame;
    }

    // Check if this is a supported Shadcn component (Button, Card, Badge, Input)
    const hasShadcnSpec = element.component in COMPONENT_SPECS;

    // For supported Shadcn components, use the Shadcn factory for proper variant styling
    // The factory creates a styled container; children are processed by processElementWithChildren
    if (hasShadcnSpec) {
      // Infer variant if not provided by Claude's analysis
      const enhancedElement = this.enhanceElementWithVariant(element);
      const shadcnNode = await this.shadcnFactory.createComponent(enhancedElement, parent, parentBounds);

      // For components with children, the styled node becomes the container
      // Children will be processed by processElementWithChildren which calls createElement
      // for each child with this node as parent
      if (hasChildren) {
        return shadcnNode;
      }

      // For leaf components (no children), check if we need to add text content
      const hasTextContent = element.content && element.content.trim().length > 0;

      if (hasTextContent && shadcnNode.type === 'FRAME') {
        const textNode = this.nodeFactory.createText({
          name: `${this.generateSemanticName(element)}-text`,
          content: element.content!,
          bounds: {
            x: 0,
            y: 0,
            width: element.bounds.width,
            height: element.bounds.height,
          },
          styles: element.styles,
        });
        await this.styleApplier.applyTextStyles(textNode, element.styles);
        (shadcnNode as FrameNode).appendChild(textNode);
      }

      return shadcnNode;
    }

    // Determine if this is a text-only element or a container
    const hasTextContent = element.content && element.content.trim().length > 0;
    const isTextElement = element.component === 'Typography' ||
      (hasTextContent && !hasChildren && !element.children?.length);

    if (isTextElement && element.content) {
      // Create text node with relative coordinates if inside a parent
      const textNode = this.nodeFactory.createText({
        name: this.generateSemanticName(element),
        content: element.content,
        bounds: element.bounds,
        styles: element.styles,
      }, parentBounds);

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
      }, parentBounds);

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
   * Calculate spacing between child elements
   * Used for Auto Layout item spacing in virtual containers
   */
  private calculateChildSpacing(
    children: UIElement[],
    layoutMode: 'HORIZONTAL' | 'VERTICAL'
  ): number {
    if (children.length < 2) return 0;

    // Sort children by position
    const sorted = [...children].sort((a, b) => {
      if (layoutMode === 'HORIZONTAL') {
        return a.bounds.x - b.bounds.x;
      } else {
        return a.bounds.y - b.bounds.y;
      }
    });

    // Calculate gaps between consecutive children
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (layoutMode === 'HORIZONTAL') {
        const gap = next.bounds.x - (current.bounds.x + current.bounds.width);
        if (gap > 0) gaps.push(gap);
      } else {
        const gap = next.bounds.y - (current.bounds.y + current.bounds.height);
        if (gap > 0) gaps.push(gap);
      }
    }

    if (gaps.length === 0) return 0;

    // Return average gap, rounded to nearest integer
    const sum = gaps.reduce((a, b) => a + b, 0);
    return Math.round(sum / gaps.length);
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
   * Report progress to callback with throttling
   * Always reports first and last updates, throttles intermediate ones
   */
  private reportProgress(step: string, current: number, total: number): void {
    if (!this.progressCallback) return;

    const now = Date.now();
    const isFirstUpdate = current === 0 || current === 1;
    const isLastUpdate = current >= total;
    const timeSinceLastUpdate = now - this.lastProgressTime;

    // Always report first/last updates, throttle intermediate ones
    if (isFirstUpdate || isLastUpdate || timeSinceLastUpdate >= PROGRESS_THROTTLE_MS) {
      this.progressCallback(step, current, total);
      this.lastProgressTime = now;
    }
  }

  /**
   * Check if generation has exceeded timeout
   */
  private hasTimedOut(): boolean {
    return Date.now() - this.generationStartTime > GENERATION_TIMEOUT_MS;
  }

  /**
   * Get the node map for external access
   */
  getNodeMap(): NodeMap {
    return this.nodeMap;
  }

  /**
   * Check if elements form a simple linear layout (single row or column)
   * Returns false for complex 2D layouts that should preserve absolute positions
   *
   * Used to prevent Auto Layout from being applied to root frame when elements
   * are scattered across 2D space (which would cause them to line up incorrectly)
   */
  private isSimpleLinearLayout(elements: UIElement[]): boolean {
    if (elements.length < 2) return true;

    const centers = elements.map(el => ({
      x: el.bounds.x + el.bounds.width / 2,
      y: el.bounds.y + el.bounds.height / 2,
    }));

    // Calculate ranges
    const xValues = centers.map(c => c.x);
    const yValues = centers.map(c => c.y);
    const xRange = Math.max(...xValues) - Math.min(...xValues);
    const yRange = Math.max(...yValues) - Math.min(...yValues);

    // Threshold for "aligned" - elements in a row/column should have
    // very low variance on one axis
    const ALIGNMENT_THRESHOLD = 50; // pixels

    // Single row: minimal Y variance, significant X variance
    if (yRange < ALIGNMENT_THRESHOLD && xRange > ALIGNMENT_THRESHOLD) {
      return true;
    }

    // Single column: minimal X variance, significant Y variance
    if (xRange < ALIGNMENT_THRESHOLD && yRange > ALIGNMENT_THRESHOLD) {
      return true;
    }

    // Elements scattered in 2D - don't apply Auto Layout
    return false;
  }
}
