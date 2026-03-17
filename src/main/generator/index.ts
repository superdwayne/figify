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
  StructuredResult,
} from './types';
import type { ExtractedImage } from '../../shared/messages';
import { mainLogger, LogLevel } from '../../shared/logger';
import { NodeFactory } from './nodeFactory';
import { StyleApplier } from './styleApplier';
import { LayoutAnalyzer, type LayoutConfig } from './layoutAnalyzer';
import { LayoutStructurer } from './layoutStructurer';
import { ShadcnComponentFactory, COMPONENT_SPECS, inferVariant } from '../shadcn';
import { TOLERANCES, LAYOUT_THRESHOLDS, roundToPixel } from './constants';

// Create a child logger for the generator module
const logger = mainLogger.child('generator');

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

// Safety constants
const MAX_NESTING_DEPTH = 10; // Prevent infinite loops in tree traversal

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
  private extractedImagesMap: Map<string, ExtractedImage>;

  // Performance tracking
  private lastProgressTime: number = 0;
  private generationStartTime: number = 0;

  // Generation state tracking for cancellation
  private isGenerating: boolean = false;
  private isCancelled: boolean = false;

  constructor(options: GenerationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.nodeFactory = new NodeFactory(this.options.scaleFactor);
    this.styleApplier = new StyleApplier(this.options.scaleFactor);
    this.layoutAnalyzer = new LayoutAnalyzer(this.options.scaleFactor);
    this.layoutStructurer = new LayoutStructurer();
    this.shadcnFactory = new ShadcnComponentFactory(this.styleApplier, this.nodeFactory);
    this.nodeMap = new Map();
    this.componentCounters = new Map();
    this.elementMap = new Map();
    this.containerMap = new Map();
    this.extractedImagesMap = new Map();
  }

  /**
   * Set progress callback for generation updates
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Generate Figma design from UI analysis response
   * @param analysis - The UI analysis response from Claude
   * @param extractedImages - Optional array of cropped images from the screenshot
   */
  async generate(
    analysis: UIAnalysisResponse,
    extractedImages?: ExtractedImage[]
  ): Promise<GenerationResult> {
    // Prevent concurrent generation
    if (this.isGenerating) {
      return {
        rootNodeId: '',
        elementCount: 0,
        nodeResults: [],
        success: false,
        error: 'Generation already in progress',
        duration: 0,
      };
    }

    this.isGenerating = true;
    this.isCancelled = false;
    const startTime = Date.now();
    this.generationStartTime = startTime;
    this.lastProgressTime = 0; // Reset throttle timer

    // Build extracted images map for quick lookup by element ID
    this.extractedImagesMap.clear();
    if (extractedImages) {
      for (const img of extractedImages) {
        this.extractedImagesMap.set(img.id, img);
      }
      logger.debug(`Loaded ${extractedImages.length} extracted images`);
    }

    try {
      // Log input summary for debugging
      logger.info('Starting generation', {
        elementCount: analysis.elements?.length || 0,
        viewport: analysis.viewport,
        applyAutoLayout: this.options.applyAutoLayout,
        extractedImages: extractedImages?.length || 0,
      });

      // Validate input
      if (!analysis.elements || analysis.elements.length === 0) {
        this.cleanup();
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
        this.cleanup();
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
        logger.warn(`Filtered ${invalidBoundsElements.length} elements with invalid bounds`, invalidBoundsElements);
      }

      // Limit elements if needed
      const limitedElements = validElements.slice(0, this.options.maxElements);
      if (validElements.length > this.options.maxElements) {
        logger.warn(`Limited from ${validElements.length} to ${this.options.maxElements} elements`);
      }

      if (limitedElements.length === 0) {
        this.cleanup();
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

      // For pixel-perfect mode (Auto Layout disabled), skip LayoutStructurer entirely
      // and use original elements with their exact coordinates
      let structuredResult: StructuredResult;

      if (this.options.applyAutoLayout) {
        // Use LayoutStructurer to detect spatial patterns and create virtual containers
        // This automatically groups elements into rows, columns, or grids
        structuredResult = this.layoutStructurer.structure(limitedElements);

        // Validate structured result - fall back to original if empty
        if (structuredResult.elements.length === 0) {
          logger.warn('LayoutStructurer returned empty elements, using original');
          structuredResult.elements = limitedElements;
          structuredResult.rootIds = limitedElements.map(el => el.id);
        }

        // Log layout analysis results for debugging
        logger.info('Layout analysis complete', {
          originalElements: limitedElements.length,
          restructuredElements: structuredResult.elements.length,
          containersCreated: structuredResult.containers.length,
          rootIds: structuredResult.rootIds,
          metadata: structuredResult.metadata,
        });
      } else {
        // Pixel-perfect mode: use original elements exactly as Claude analyzed them
        logger.info('Pixel-perfect mode: skipping LayoutStructurer, using absolute positioning');
        structuredResult = {
          elements: limitedElements,
          containers: [],
          rootIds: limitedElements.filter(el => !el.parentId).map(el => el.id),
          metadata: {
            totalElements: limitedElements.length,
            containersCreated: 0,
            patternsDetected: [],
          },
        };
      }

      // Decide which elements to use:
      // - If containers were created, use structuredResult.elements (includes virtual containers)
      // - If no containers, use original limitedElements to preserve Claude's hierarchy
      const hasContainers = structuredResult.containers.length > 0;
      const elements = hasContainers ? structuredResult.elements : limitedElements;
      const totalElements = elements.length;

      logger.debug(`Using ${hasContainers ? 'restructured' : 'original'} elements (${totalElements} total)`);

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
      logger.debug(`Root elements (${rootElements.length}): ${rootElements.map(n => `${n.element.id} (${n.element.component})`).join(', ')}`);

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

      // PIXEL-PERFECT MODE: Flat structure with absolute positioning
      if (!this.options.applyAutoLayout) {
        logger.info('Pixel-perfect mode: creating flat structure with absolute coordinates');

        // Sort elements by z-order using explicit zIndex when available,
        // falling back to area-based heuristic (larger = behind)
        const sortedByZOrder = [...elements].sort((a, b) => {
          // Prefer explicit zIndex from AI analysis
          const zA = a.zIndex ?? -1;
          const zB = b.zIndex ?? -1;
          if (zA !== -1 && zB !== -1) {
            if (zA !== zB) return zA - zB; // Lower zIndex drawn first (behind)
          } else if (zA !== -1) {
            return 1; // a has zIndex, draw after b
          } else if (zB !== -1) {
            return -1; // b has zIndex, draw after a
          }

          // Fallback: larger area elements (backgrounds) first
          const areaA = a.bounds.width * a.bounds.height;
          const areaB = b.bounds.width * b.bounds.height;
          if (Math.abs(areaA - areaB) > 100) {
            return areaB - areaA; // Larger first
          }
          return a.bounds.y - b.bounds.y; // Top to bottom
        });

        for (const element of sortedByZOrder) {
          if (this.hasTimedOut() || this.wasCancelled()) {
            timedOut = true;
            break;
          }

          try {
            // Create element with absolute coordinates (no parent bounds conversion)
            const node = await this.createElement(element, rootFrame, false, undefined);
            this.nodeMap.set(element.id, node);

            nodeResults.push({
              nodeId: node.id,
              elementId: element.id,
              success: true,
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            nodeResults.push({
              nodeId: '',
              elementId: element.id,
              success: false,
              error: errorMessage,
            });
          }

          processedCount++;
          this.reportProgress('Processing elements', processedCount, totalElements);

          // Yield periodically to prevent freezing
          if (processedCount % 10 === 0) {
            await this.yieldToEventLoop();
          }
        }
      } else {
        // AUTO LAYOUT MODE: Hierarchical structure with relative positioning
        // Sort root elements for correct Auto Layout order
        const sortedRootElements = this.sortChildrenForLayout(rootElements, rootFrame);

        // Log sorting result for debugging
        if (rootHasAutoLayout) {
          logger.debug(`Root frame has ${rootFrame.layoutMode} layout, sorted ${rootElements.length} root elements`);
        }

        for (const treeNode of sortedRootElements) {
          // Check for timeout or cancellation before processing each root element
          if (this.hasTimedOut() || this.wasCancelled()) {
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
      }

      // If timed out or cancelled, still return partial results
      if (timedOut) {
        this.positionInView(rootFrame);
        this.cleanup();
        const reason = this.isCancelled ? 'cancelled' : 'timed out';
        return {
          rootNodeId: rootFrame.id,
          elementCount: processedCount,
          nodeResults,
          success: true, // Partial success
          duration: Date.now() - startTime,
          error: `Generation ${reason} after ${processedCount} elements. Partial design created.`,
        };
      }

      // Position root frame in view
      this.positionInView(rootFrame);

      this.reportProgress('Generation complete', totalElements, totalElements);

      // Log completion summary
      logger.info('Generation complete', {
        nodesCreated: nodeResults.length,
        successful: nodeResults.filter(r => r.success).length,
        failed: nodeResults.filter(r => !r.success).length,
        duration: Date.now() - startTime,
      });

      // Cleanup temporary data structures on success
      this.cleanup();

      return {
        rootNodeId: rootFrame.id,
        elementCount: totalElements,
        nodeResults,
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Cleanup on failure
      this.cleanup();
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
    // Track orphaned references for debugging
    const orphanedRefs: { parentId: string; parentComponent: string; missingChildId: string }[] = [];

    for (const element of elements) {
      if (element.children && element.children.length > 0) {
        const parentNode = treeMap.get(element.id)!;
        for (const childId of element.children) {
          const childNode = treeMap.get(childId);
          if (childNode) {
            childNode.depth = parentNode.depth + 1;
            parentNode.children.push(childNode);
          } else {
            // Child ID referenced but not found in elements array
            orphanedRefs.push({
              parentId: element.id,
              parentComponent: element.component,
              missingChildId: childId,
            });
          }
        }
      }
    }

    // Log orphaned references - this indicates Claude didn't include children in flat array
    if (orphanedRefs.length > 0) {
      logger.error(`MISSING CHILDREN: ${orphanedRefs.length} child references not found in elements array!`);
      logger.error('This means Claude referenced children that don\'t exist as separate elements.');
      logger.error('Orphaned references:', orphanedRefs);
    }

    // Fourth pass: Spatial containment fallback
    // Find elements that exist but weren't assigned to any parent, and infer parent from bounds
    const assignedChildren = new Set<string>();
    for (const node of treeMap.values()) {
      for (const child of node.children) {
        assignedChildren.add(child.element.id);
      }
    }

    // Find orphaned elements (exist in array but not assigned as children)
    const orphanedElements: ElementTreeNode[] = [];
    for (const [id, node] of treeMap) {
      if (!assignedChildren.has(id)) {
        // This element is not a child of anything - check if it should be
        orphanedElements.push(node);
      }
    }

    // For each orphaned element, find the smallest container that fully encloses it
    const inferredRelationships: { childId: string; parentId: string; reason: string }[] = [];

    for (const orphan of orphanedElements) {
      const orphanBounds = orphan.element.bounds;
      let bestParent: ElementTreeNode | null = null;
      let bestParentArea = Infinity;

      for (const [id, potentialParent] of treeMap) {
        // Skip self
        if (id === orphan.element.id) continue;

        // Skip elements that are already children of the orphan (would create cycle)
        if (this.isDescendant(orphan, potentialParent)) continue;

        const parentBounds = potentialParent.element.bounds;

        // Check if orphan is fully contained within potential parent
        if (this.isFullyContained(orphanBounds, parentBounds)) {
          const parentArea = parentBounds.width * parentBounds.height;

          // Prefer the smallest containing parent (most specific container)
          if (parentArea < bestParentArea) {
            bestParent = potentialParent;
            bestParentArea = parentArea;
          }
        }
      }

      // If we found a containing parent, establish the relationship
      if (bestParent && bestParent.element.id !== orphan.element.id) {
        orphan.depth = bestParent.depth + 1;
        bestParent.children.push(orphan);
        assignedChildren.add(orphan.element.id);

        // IMPORTANT: Also update the parent element's children array
        // This ensures layout analysis and other code that checks element.children works correctly
        if (!bestParent.element.children) {
          bestParent.element.children = [];
        }
        if (!bestParent.element.children.includes(orphan.element.id)) {
          bestParent.element.children.push(orphan.element.id);
        }

        inferredRelationships.push({
          childId: orphan.element.id,
          parentId: bestParent.element.id,
          reason: `bounds (${Math.round(orphanBounds.x)},${Math.round(orphanBounds.y)}) contained in ${bestParent.element.component}`,
        });
      }
    }

    // Log inferred relationships
    if (inferredRelationships.length > 0) {
      logger.info(`SPATIAL FALLBACK: Inferred ${inferredRelationships.length} parent-child relationships from bounds`);
      for (const rel of inferredRelationships) {
        logger.debug(`  - ${rel.childId} -> parent: ${rel.parentId} (${rel.reason})`);
      }
    }

    // Log final tree structure for debugging
    logger.debug('Final tree structure:');
    for (const [id, node] of treeMap) {
      if (node.children.length > 0) {
        logger.debug(`  ${id} (${node.element.component}) has ${node.children.length} children: ${node.children.map(c => c.element.id).join(', ')}`);
      }
    }

    return treeMap;
  }

  /**
   * Check if element A is fully contained within element B's bounds
   */
  private isFullyContained(inner: Bounds, outer: Bounds): boolean {
    // Use centralized tolerance for containment checks
    const tolerance = TOLERANCES.CONTAINMENT;
    return (
      inner.x >= outer.x - tolerance &&
      inner.y >= outer.y - tolerance &&
      inner.x + inner.width <= outer.x + outer.width + tolerance &&
      inner.y + inner.height <= outer.y + outer.height + tolerance
    );
  }

  /**
   * Check if potentialDescendant is a descendant of ancestor in the tree
   * Used to prevent creating cycles when inferring relationships
   */
  private isDescendant(ancestor: ElementTreeNode, potentialDescendant: ElementTreeNode): boolean {
    for (const child of ancestor.children) {
      if (child.element.id === potentialDescendant.element.id) {
        return true;
      }
      if (this.isDescendant(child, potentialDescendant)) {
        return true;
      }
    }
    return false;
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
    const { element, children, depth } = treeNode;

    // Safety check: prevent infinite loops from circular references
    if (depth > MAX_NESTING_DEPTH) {
      logger.warn(`Max nesting depth (${MAX_NESTING_DEPTH}) reached for element ${element.id}, skipping children`);
      return results;
    }

    try {
      // Create the current element
      // ALWAYS convert to relative coordinates when there's a parent element
      // Auto Layout will override position, but we still need correct relative coords
      // for cases where Auto Layout is disabled or for proper size calculations
      const boundsForConversion = parentElement?.bounds;

      // Debug logging for coordinate conversion
      if (parentElement) {
        logger.debug(`Creating ${element.id} (${element.component}) inside ${parentElement.id}`, {
          absoluteBounds: `(${element.bounds.x}, ${element.bounds.y}) ${element.bounds.width}x${element.bounds.height}`,
          parentBounds: `(${parentElement.bounds.x}, ${parentElement.bounds.y}) ${parentElement.bounds.width}x${parentElement.bounds.height}`,
          parentHasAutoLayout,
          relativePosition: boundsForConversion
            ? `(${element.bounds.x - parentElement.bounds.x}, ${element.bounds.y - parentElement.bounds.y})`
            : undefined,
        });
      }

      const node = await this.createElement(element, parent, children.length > 0, boundsForConversion);
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
        const frame = node as FrameNode;

        // Sort children by position for correct Auto Layout order
        // For Auto Layout frames, child order determines visual order
        const sortedChildren = this.sortChildrenForLayout(children, frame);

        for (const childNode of sortedChildren) {
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
   *
   * For wrapped layouts (grids), children use FIXED sizing on both axes.
   * For regular Auto Layout, children maintain their dimensions unless
   * they clearly span the full parent width/height (90%+ threshold).
   */
  private applyChildConstraints(
    child: FrameNode,
    parent: FrameNode,
    element: UIElement
  ): void {
    const parentLayoutMode = parent.layoutMode;

    if (parentLayoutMode === 'NONE') return;

    // For wrapped layouts (grids), use fixed sizing on both axes
    // This ensures grid items maintain their original dimensions
    if (parent.layoutWrap === 'WRAP') {
      child.layoutSizingHorizontal = 'FIXED';
      child.layoutSizingVertical = 'FIXED';
      return;
    }

    // Determine if child should fill or hug based on its relative size
    const parentContentWidth = parent.width - parent.paddingLeft - parent.paddingRight;
    const parentContentHeight = parent.height - parent.paddingTop - parent.paddingBottom;

    // Avoid division by zero
    const widthRatio = parentContentWidth > 0
      ? element.bounds.width / parentContentWidth
      : 0;
    const heightRatio = parentContentHeight > 0
      ? element.bounds.height / parentContentHeight
      : 0;

    // Only use FILL if child takes up threshold% of parent's content area
    // This is conservative to prevent unexpected stretching
    const FILL_THRESHOLD = LAYOUT_THRESHOLDS.FILL_THRESHOLD;

    if (parentLayoutMode === 'HORIZONTAL') {
      // In horizontal layout, check if child should fill vertical space
      if (heightRatio >= FILL_THRESHOLD) {
        child.layoutSizingVertical = 'FILL';
      } else {
        child.layoutSizingVertical = 'FIXED';
      }
      // Horizontal sizing is always fixed in horizontal layout
      child.layoutSizingHorizontal = 'FIXED';
    } else if (parentLayoutMode === 'VERTICAL') {
      // In vertical layout, check if child should fill horizontal space
      if (widthRatio >= FILL_THRESHOLD) {
        child.layoutSizingHorizontal = 'FILL';
      } else {
        child.layoutSizingHorizontal = 'FIXED';
      }
      // Vertical sizing is always fixed in vertical layout
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
    // Handle Image elements - use real images if available, otherwise create placeholders
    if (element.component === 'Image') {
      const imageName = element.imageDescription
        ? `image-${element.imageDescription.slice(0, 30).replace(/\s+/g, '-')}`
        : this.generateSemanticName(element);

      // Check if we have extracted image data for this element
      const extractedImage = this.extractedImagesMap.get(element.id);

      let imageNode: RectangleNode;

      if (extractedImage) {
        // Create real image node with the cropped image data
        imageNode = await this.nodeFactory.createImageNode(
          imageName,
          element.bounds,
          extractedImage.data,
          parentBounds
        );
        logger.debug(`Created real image for ${element.id}`);
      } else {
        // Fall back to placeholder
        imageNode = this.nodeFactory.createImagePlaceholder(
          imageName,
          element.bounds,
          parentBounds
        );
      }

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

      // Apply all visual styles (gradient, opacity, shadows, etc.)
      if (element.styles.gradient) {
        this.styleApplier.applyGradientFill(shapeNode, element.styles.gradient);
      } else if (element.styles.backgroundColor) {
        this.styleApplier.applyFills(shapeNode, element.styles.backgroundColor);
      }
      if (element.styles.borderColor) {
        this.styleApplier.applyStrokes(shapeNode, element.styles.borderColor, element.styles.borderWidth || 1);
      }
      if (element.styles.borderRadius) {
        this.styleApplier.applyCornerRadius(shapeNode, element.styles.borderRadius);
      }
      if (element.styles.opacity !== undefined && element.styles.opacity < 1) {
        this.styleApplier.applyOpacity(shapeNode, element.styles.opacity);
      }
      if (element.styles.boxShadow && element.styles.boxShadow.length > 0) {
        this.styleApplier.applyBoxShadows(shapeNode, element.styles.boxShadow);
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

      // Log container creation details
      logger.debug('Creating container', {
        id: element.id,
        type: element.variant,
        childCount: element.children?.length || 0,
        bounds: element.bounds,
      });

      // Validate container has valid children
      if (element.children && element.children.length > 0) {
        const validChildren = element.children.filter(id => this.elementMap.has(id));
        if (validChildren.length === 0) {
          logger.warn(`Container ${element.id} has no valid children, creating empty frame`);
        }
      }

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
      // Wrapped in try-catch to prevent crashes from Auto Layout errors
      if (this.options.applyAutoLayout && layoutMode !== 'NONE') {
        try {
          frame.layoutMode = layoutMode;
          frame.primaryAxisAlignItems = 'MIN';
          frame.counterAxisAlignItems = 'MIN';
          frame.primaryAxisSizingMode = 'FIXED';
          frame.counterAxisSizingMode = 'FIXED';
          frame.clipsContent = false; // Allow children to be visible during development

          // Get spacing from containerMap if available
          const container = this.containerMap.get(element.id);
          // Default spacing if not provided
          const defaultSpacing = 8;

          if (container) {
            if (element.variant === 'row') {
              // Row: horizontal spacing between items
              frame.itemSpacing = container.horizontalSpacing || defaultSpacing;
            } else if (element.variant === 'column') {
              // Column: vertical spacing between items
              frame.itemSpacing = container.verticalSpacing || defaultSpacing;
            } else if (isGrid) {
              // Grid: enable wrapping with horizontal and vertical spacing
              frame.layoutWrap = 'WRAP';
              frame.itemSpacing = container.horizontalSpacing || defaultSpacing; // Horizontal gaps
              frame.counterAxisSpacing = container.verticalSpacing || defaultSpacing; // Row gaps
            }
          } else {
            // Fallback: calculate spacing from children if container not found
            if (element.children && element.children.length > 1) {
              const childElements = this.getChildElements(element.children);
              if (childElements.length > 1) {
                const spacing = this.calculateChildSpacing(childElements, layoutMode);
                frame.itemSpacing = spacing || defaultSpacing;
              } else {
                frame.itemSpacing = defaultSpacing;
              }
            } else {
              frame.itemSpacing = defaultSpacing;
            }
          }
        } catch (error) {
          logger.error('Failed to apply Auto Layout to container', error);
          // Continue without Auto Layout - frame is still valid
        }
      }

      // Apply all visual styles (bg, gradient, border, radius, opacity, shadows, blur)
      this.styleApplier.applyElementStyles(frame, element.styles);

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
      // Note: Button and Badge text is handled by ShadcnComponentFactory with proper variant styling
      const hasTextContent = element.content && element.content.trim().length > 0;
      const hasFactoryText = element.component === 'Button' || element.component === 'Badge';

      if (hasTextContent && shadcnNode.type === 'FRAME' && !hasFactoryText) {
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

      // Apply all visual styles (bg, gradient, border, radius, opacity, shadows, blur)
      this.styleApplier.applyElementStyles(frame, element.styles);

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
   * Uses median for outlier resistance and rounds to whole pixels
   */
  private calculateChildSpacing(
    children: UIElement[],
    layoutMode: 'HORIZONTAL' | 'VERTICAL'
  ): number {
    if (children.length < 2) return 0;

    // Sort children by position (using rounded values for stability)
    const sorted = [...children].sort((a, b) => {
      if (layoutMode === 'HORIZONTAL') {
        return roundToPixel(a.bounds.x) - roundToPixel(b.bounds.x);
      } else {
        return roundToPixel(a.bounds.y) - roundToPixel(b.bounds.y);
      }
    });

    // Calculate gaps between consecutive children
    const gaps: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (layoutMode === 'HORIZONTAL') {
        const gap = roundToPixel(next.bounds.x) - roundToPixel(current.bounds.x + current.bounds.width);
        if (gap > 0) gaps.push(gap);
      } else {
        const gap = roundToPixel(next.bounds.y) - roundToPixel(current.bounds.y + current.bounds.height);
        if (gap > 0) gaps.push(gap);
      }
    }

    if (gaps.length === 0) return 0;

    // Use median for outlier resistance (e.g., one large gap shouldn't skew spacing)
    gaps.sort((a, b) => a - b);
    const medianIndex = Math.floor(gaps.length / 2);
    const medianGap = gaps.length % 2 === 0
      ? Math.round((gaps[medianIndex - 1] + gaps[medianIndex]) / 2)
      : gaps[medianIndex];

    return medianGap;
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
   * Sort children by position for correct Auto Layout ordering
   *
   * In Figma Auto Layout, the order children are added determines their
   * visual position. For HORIZONTAL layout, children should be sorted
   * left-to-right (by X). For VERTICAL layout, top-to-bottom (by Y).
   *
   * For frames WITHOUT Auto Layout (NONE), we don't sort since position
   * is determined by x,y coordinates, not append order.
   *
   * @param children - Array of child tree nodes to sort
   * @param parentFrame - The parent frame (to check layout mode)
   * @returns Sorted array of children
   */
  private sortChildrenForLayout(
    children: ElementTreeNode[],
    parentFrame: FrameNode
  ): ElementTreeNode[] {
    if (children.length < 2) return children;

    const layoutMode = parentFrame.layoutMode;

    // Don't sort for NONE layouts - position is determined by x,y coordinates
    if (layoutMode === 'NONE') {
      return children;
    }

    // Sort by position based on layout direction
    // Round values to whole pixels for stable sorting (avoids floating-point instability)
    const sorted = [...children].sort((a, b) => {
      if (layoutMode === 'HORIZONTAL') {
        // Sort by X position (left to right), use Y as tiebreaker
        const xDiff = roundToPixel(a.element.bounds.x) - roundToPixel(b.element.bounds.x);
        if (xDiff !== 0) return xDiff;
        return roundToPixel(a.element.bounds.y) - roundToPixel(b.element.bounds.y);
      } else {
        // VERTICAL: Sort by Y position (top to bottom), use X as tiebreaker
        const yDiff = roundToPixel(a.element.bounds.y) - roundToPixel(b.element.bounds.y);
        if (yDiff !== 0) return yDiff;
        return roundToPixel(a.element.bounds.x) - roundToPixel(b.element.bounds.x);
      }
    });

    // Debug log the sort result
    const sortKey = layoutMode === 'HORIZONTAL' ? 'x' : 'y';
    const beforeOrder = children.map(c => c.element.id).join(', ');
    const afterOrder = sorted.map(c => c.element.id).join(', ');

    if (beforeOrder !== afterOrder) {
      logger.debug(`Sorted ${children.length} children for ${layoutMode} layout in "${parentFrame.name}"`, {
        before: beforeOrder,
        after: afterOrder,
      });
    }

    return sorted;
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

  /**
   * Cancel an ongoing generation operation
   *
   * Sets a cancellation flag that is checked during generation.
   * The current operation will complete, but no further elements
   * will be processed.
   */
  cancel(): void {
    if (this.isGenerating) {
      this.isCancelled = true;
      logger.info('Generation cancellation requested');
    }
  }

  /**
   * Check if generation has been cancelled
   */
  private wasCancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Clear all internal Maps and temporary data structures
   *
   * This method should be called after generation completes (success or failure)
   * to prevent memory leaks from accumulated data across multiple generations.
   *
   * Note: nodeMap is intentionally not cleared here as it may be needed
   * after generation for reference. Use clearNodeMap() separately if needed.
   */
  cleanup(): void {
    // Clear element-related maps
    this.elementMap.clear();
    this.containerMap.clear();
    this.extractedImagesMap.clear();
    this.componentCounters.clear();

    // Reset layout structurer counters
    this.layoutStructurer.reset();

    // Reset generation state
    this.isGenerating = false;
    this.isCancelled = false;
    this.lastProgressTime = 0;
    this.generationStartTime = 0;

    logger.debug('Generator cleanup completed', {
      elementMapSize: this.elementMap.size,
      containerMapSize: this.containerMap.size,
      extractedImagesMapSize: this.extractedImagesMap.size,
      componentCountersSize: this.componentCounters.size,
    });
  }

  /**
   * Clear the node map (element ID -> Figma node mapping)
   *
   * This is separated from cleanup() because the node map may be needed
   * for post-generation operations. Call this when you're done referencing
   * the generated nodes.
   */
  clearNodeMap(): void {
    const previousSize = this.nodeMap.size;
    this.nodeMap.clear();
    logger.debug(`Node map cleared (was ${previousSize} entries)`);
  }

  /**
   * Perform full cleanup including node map
   *
   * Use this for complete memory release when the generator instance
   * will be reused for a new generation.
   */
  fullCleanup(): void {
    this.cleanup();
    this.clearNodeMap();
    logger.debug('Full generator cleanup completed');
  }
}
