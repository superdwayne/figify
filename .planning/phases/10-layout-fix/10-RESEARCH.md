# Phase 10: Layout Fix - Research

**Researched:** 2026-01-28
**Domain:** Figma Plugin API coordinate systems, Auto Layout, spatial pattern detection
**Confidence:** HIGH

## Summary

This research investigates the core issue causing layout positioning problems in the Figma plugin: the mismatch between absolute coordinates from Claude's analysis and Figma's relative coordinate system for nested children. The codebase already has partial implementations for coordinate conversion (`coordinateUtils.ts`), spatial analysis (`spatialAnalyzer.ts`), and layout structuring (`layoutStructurer.ts`), but these need to be properly integrated into the two-pass generation flow.

The key findings are:
1. **Figma's coordinate system** uses relative coordinates for children within frames - `x` and `y` are always relative to the parent's origin, not the canvas
2. **Auto Layout fundamentally changes positioning** - when `layoutMode` is HORIZONTAL or VERTICAL, child `x/y` coordinates are computed automatically and writing to them has no effect
3. **The existing codebase has the right primitives** - `toRelativeBounds()`, `SpatialAnalyzer`, and `LayoutStructurer` exist but are not fully utilized in the generation pipeline

**Primary recommendation:** Complete the two-pass generation integration by ensuring Pass 1 uses absolute-to-relative coordinate conversion for all nested children, and Pass 2 properly applies Auto Layout only after visual positioning is verified.

## Standard Stack

This is a bug fix phase working with existing code - no new libraries needed.

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Figma Plugin API | Latest | Node creation, Auto Layout | Required for Figma plugins |
| TypeScript | 5.x | Type safety | Already configured |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| coordinateUtils.ts | Internal | Coordinate conversion | toRelativeBounds(), clampRelativeBounds() |
| spatialAnalyzer.ts | Internal | Pattern detection | Row/column/grid detection |
| layoutStructurer.ts | Internal | Pass 2 grouping | Create virtual containers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom coordinate math | Figma's absoluteTransform | More complex but handles rotation |
| Manual spatial grouping | AI-provided hierarchy | Requires prompt changes, less reliable |

**Installation:** None required - all code is internal.

## Architecture Patterns

### Recommended Two-Pass Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Analysis                           │
│  elements[] with absolute bounds (relative to screenshot)    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│            PASS 1: Coordinate Normalization                  │
│  For each element with parentBounds:                         │
│    relativeBounds = toRelativeBounds(childBounds, parent)    │
│    clampedBounds = clampRelativeBounds(relative, parent)     │
│    frame.x = clampedBounds.x                                 │
│    frame.y = clampedBounds.y                                 │
│  Result: Visually accurate flat positioning                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│            PASS 2: Layout Application                        │
│  Detect spatial patterns (rows, columns, grids)              │
│  Apply Auto Layout to detected groups                        │
│  Note: Child x/y ignored when layoutMode !== NONE            │
│  Result: Editable, responsive layouts                        │
└─────────────────────────────────────────────────────────────┘
```

### Pattern 1: Relative Coordinate Conversion
**What:** Convert absolute screenshot coordinates to parent-relative coordinates
**When to use:** Every time a child element is appended to a parent frame with layoutMode === 'NONE'

```typescript
// Source: Existing coordinateUtils.ts
import { toRelativeBounds, clampRelativeBounds } from './coordinateUtils';

function createChildElement(
  element: UIElement,
  parent: FrameNode,
  parentElement: UIElement
): SceneNode {
  // Convert absolute to relative
  const relativeBounds = toRelativeBounds(element.bounds, parentElement.bounds);
  const safeBounds = clampRelativeBounds(
    relativeBounds,
    parentElement.bounds.width,
    parentElement.bounds.height
  );

  // Now safe to use for positioning
  frame.x = safeBounds.x;
  frame.y = safeBounds.y;
}
```

### Pattern 2: Auto Layout Coordinate Awareness
**What:** When Auto Layout is applied, child coordinates become computed values
**When to use:** Understanding when NOT to set x/y manually

```typescript
// Source: Figma Plugin API docs
// CRITICAL: In Auto Layout frames, setting x/y is a no-op
if (parent.layoutMode !== 'NONE') {
  // Child x/y will be computed by Auto Layout
  // Setting them manually does nothing
  // Instead, control positioning through:
  // - parent.itemSpacing
  // - parent.paddingTop/Right/Bottom/Left
  // - parent.primaryAxisAlignItems
  // - parent.counterAxisAlignItems
}
```

### Pattern 3: layoutPositioning for Manual Control
**What:** Use ABSOLUTE positioning to opt out of Auto Layout flow
**When to use:** Elements that need manual positioning inside Auto Layout parents

```typescript
// Source: Figma Plugin API docs
// Only applicable for direct children of Auto Layout frames
child.layoutPositioning = 'ABSOLUTE';

// Now x, y, width, height can be set manually
child.x = manualX;
child.y = manualY;

// Constraints are respected for absolute positioning
child.constraints = { horizontal: 'MIN', vertical: 'MIN' };
```

### Anti-Patterns to Avoid

- **Setting x/y on Auto Layout children:** Writing to x/y when parent has layoutMode !== 'NONE' is a no-op. Position is computed automatically.

- **Toggling layoutMode expecting position preservation:** Setting `frame.layoutMode = 'VERTICAL'; frame.layoutMode = 'NONE'` does NOT restore original child positions.

- **Using absolute coordinates for nested children:** Claude returns absolute coordinates (screenshot origin). These must be converted to parent-relative coordinates.

- **Applying Auto Layout without considering 2D scatter:** If elements are scattered in 2D (not a clear row/column), Auto Layout will line them up incorrectly.

## Don't Hand-Roll

Problems with existing solutions in the codebase:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coordinate conversion | New math functions | `toRelativeBounds()` in coordinateUtils.ts | Already handles edge cases |
| Bounds clamping | Custom clamping | `clampRelativeBounds()` | Handles negative values, min 1px |
| Containment detection | Custom overlap math | `isContainedWithin()` | Has tolerance parameter |
| Row detection | Custom Y-grouping | `SpatialAnalyzer.detectRows()` | Handles varying heights |
| Column detection | Custom X-grouping | `SpatialAnalyzer.detectColumns()` | Handles varying widths |
| Grid detection | Custom 2D grouping | `SpatialAnalyzer.detectGrid()` | Handles incomplete grids |

**Key insight:** The codebase already has well-implemented utilities. The bug is in how they're wired together in the generation pipeline, not in the primitives themselves.

## Common Pitfalls

### Pitfall 1: Auto Layout Child Coordinate No-Op
**What goes wrong:** Setting frame.x and frame.y on children of Auto Layout frames has no effect
**Why it happens:** Figma computes child positions automatically when layoutMode is HORIZONTAL or VERTICAL
**How to avoid:**
- Check `parent.layoutMode !== 'NONE'` before setting x/y
- Use itemSpacing, padding, and alignment properties instead
- Use `layoutPositioning = 'ABSOLUTE'` only for elements that truly need manual position
**Warning signs:** Elements appearing stacked at 0,0 or in unexpected positions after Auto Layout applied

### Pitfall 2: Absolute Coordinates Used as Relative
**What goes wrong:** Children positioned way outside their parent frames
**Why it happens:** Claude returns coordinates relative to screenshot origin (0, 0). When a child is at (200, 150) absolute but its parent is at (180, 130), the child should be at (20, 20) relative to parent.
**How to avoid:** Always call `toRelativeBounds(childBounds, parentBounds)` before setting x/y
**Warning signs:** Elements appearing outside their containers, overlapping incorrectly

### Pitfall 3: Layout Mode Toggle Destroys Positions
**What goes wrong:** Toggling Auto Layout on/off scrambles element positions
**Why it happens:** Per Figma docs, "Removing auto-layout from a frame does not restore the children to their original positions"
**How to avoid:**
- Never toggle layoutMode as a "fix" attempt
- Decide layout mode before creating children
- If needed, store original positions and restore after toggle
**Warning signs:** Elements suddenly stacking when toggling layout modes

### Pitfall 4: 2D Scatter Detected as Row/Column
**What goes wrong:** Auto Layout applied to elements that aren't actually in a row/column
**Why it happens:** Layout detection uses thresholds that may match scattered elements
**How to avoid:**
- Use `isSimpleLinearLayout()` check (already in codebase)
- Verify Y-range is small for rows, X-range is small for columns
- Don't apply Auto Layout when pattern confidence is low
**Warning signs:** Dashboard-style layouts collapsing into single row/column

### Pitfall 5: Negative Relative Bounds
**What goes wrong:** Child positioned at negative coordinates (outside parent top-left)
**Why it happens:** Child element partially extends outside parent in Claude's analysis
**How to avoid:** Use `clampRelativeBounds()` which ensures x >= 0, y >= 0
**Warning signs:** Elements partially cut off or positioned at 0,0

### Pitfall 6: Grid vs Wrap Confusion
**What goes wrong:** Grid layouts not rendering correctly
**Why it happens:** Figma's `layoutMode = 'GRID'` is different from wrapping horizontal layouts
**How to avoid:**
- For true grids, use layoutWrap = 'WRAP' with layoutMode = 'HORIZONTAL'
- Set counterAxisSpacing for row gaps in wrapped layouts
- layoutWrap only works with HORIZONTAL mode
**Warning signs:** Grid items not wrapping, appearing in single row

## Code Examples

### Example 1: Safe Child Creation with Coordinate Conversion
```typescript
// Source: Based on existing nodeFactory.ts pattern
private async createElement(
  element: UIElement,
  parent: FrameNode,
  hasChildren: boolean,
  parentBounds?: Bounds // CRITICAL: Must pass parent bounds for nested children
): Promise<SceneNode> {
  // For root-level elements: use absolute coordinates (no parent bounds)
  // For nested elements: convert to relative coordinates

  const frame = this.nodeFactory.createFrame({
    name: element.id,
    bounds: element.bounds, // nodeFactory will convert if parentBounds provided
    styles: element.styles,
  }, parentBounds); // <-- This triggers relative conversion

  parent.appendChild(frame);
  return frame;
}
```

### Example 2: Applying Auto Layout After Position Verification
```typescript
// Source: Figma Plugin API best practices
function applyAutoLayoutSafely(
  frame: FrameNode,
  config: LayoutConfig
): void {
  // ONLY apply Auto Layout if we have a clear linear pattern
  // Otherwise, preserve absolute positioning

  if (config.mode === 'NONE') {
    return; // Keep manual positioning
  }

  // When we set layoutMode, Figma will recompute all child positions
  // based on their order and the Auto Layout settings
  frame.layoutMode = config.mode;
  frame.itemSpacing = config.itemSpacing;
  frame.paddingTop = config.padding.top;
  frame.paddingRight = config.padding.right;
  frame.paddingBottom = config.padding.bottom;
  frame.paddingLeft = config.padding.left;
  frame.primaryAxisAlignItems = config.primaryAxisAlignItems;
  frame.counterAxisAlignItems = config.counterAxisAlignItems;
}
```

### Example 3: Wrapping Layout for Grids
```typescript
// Source: Figma Plugin API docs
function applyGridLayout(
  frame: FrameNode,
  horizontalSpacing: number,
  verticalSpacing: number
): void {
  // CRITICAL: layoutWrap only works with HORIZONTAL
  frame.layoutMode = 'HORIZONTAL';
  frame.layoutWrap = 'WRAP';

  // itemSpacing controls horizontal gaps
  frame.itemSpacing = horizontalSpacing;

  // counterAxisSpacing controls gaps between wrapped rows
  frame.counterAxisSpacing = verticalSpacing;

  // Size modes should usually be FIXED for grid containers
  frame.primaryAxisSizingMode = 'FIXED';
  frame.counterAxisSizingMode = 'FIXED';
}
```

### Example 4: Absolute Positioning Inside Auto Layout
```typescript
// Source: Figma Plugin API docs
function addFloatingElement(
  parent: FrameNode,
  element: UIElement
): FrameNode {
  const child = figma.createFrame();
  child.name = 'floating-element';

  // Opt out of Auto Layout flow
  child.layoutPositioning = 'ABSOLUTE';

  // Now x/y actually work
  child.x = element.bounds.x;
  child.y = element.bounds.y;
  child.resize(element.bounds.width, element.bounds.height);

  // Constraints are respected for absolute positioned elements
  child.constraints = { horizontal: 'MIN', vertical: 'MIN' };

  parent.appendChild(child);
  return child;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| layoutMode only H/V/NONE | layoutMode includes GRID | Config 2025 | Native grid support (still maturing) |
| Manual wrap calculation | layoutWrap property | 2023 | Easier card grids |
| Separate counter spacing | counterAxisSpacing | With layoutWrap | Proper row gaps in wrapped layouts |

**Deprecated/outdated:**
- Using groups for layout structure: Use frames with Auto Layout instead
- Manual position calculation in Auto Layout: Use spacing/padding/alignment properties

## Open Questions

1. **Grid Auto Layout maturity**
   - What we know: Figma added layoutMode = 'GRID' at Config 2025
   - What's unclear: API stability, whether it's better than HORIZONTAL + WRAP
   - Recommendation: Stick with HORIZONTAL + layoutWrap for now (proven approach)

2. **Optimal tolerance values**
   - What we know: SpatialAnalyzer uses ROW_TOLERANCE = 25, COLUMN_TOLERANCE = 25
   - What's unclear: Whether these values work well for all screenshot types
   - Recommendation: Make tolerances configurable, test with real data

3. **Two-pass timing**
   - What we know: Pass 1 should create positions, Pass 2 applies layout
   - What's unclear: Best point to transition between passes
   - Recommendation: Complete all element creation first, then apply Auto Layout top-down

## Sources

### Primary (HIGH confidence)
- [Figma Plugin API: layoutPositioning](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutpositioning/) - AUTO vs ABSOLUTE behavior
- [Figma Plugin API: layoutMode](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutmode/) - HORIZONTAL, VERTICAL, NONE, GRID
- [Figma Plugin API: layoutWrap](https://developers.figma.com/docs/plugins/api/properties/nodes-layoutwrap/) - WRAP behavior and requirements
- [Figma Plugin API: Node Properties](https://developers.figma.com/docs/plugins/api/node-properties/) - x, y, relativeTransform
- Existing codebase: coordinateUtils.ts, spatialAnalyzer.ts, layoutStructurer.ts, nodeFactory.ts

### Secondary (MEDIUM confidence)
- [Guide to Auto Layout](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout) - Design best practices
- [Adjust alignment, rotation, position, and dimensions](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions) - Coordinate system explanation

### Tertiary (LOW confidence)
- Figma Forum discussions on coordinate issues - Community workarounds

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase, well-documented Figma API
- Architecture: HIGH - Two-pass pattern already designed in codebase, just needs completion
- Pitfalls: HIGH - Verified against official Figma documentation

**Research date:** 2026-01-28
**Valid until:** 60 days (Figma Plugin API is stable, internal code is under our control)
