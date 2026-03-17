# Phase 10: Two-Pass Layout Generation

## Problem Summary

The current layout generation produces incorrectly positioned elements because:

1. **Absolute coordinates used as relative** - Claude returns positions relative to screenshot origin (0,0), but these are used directly when appending children to parent frames in Figma, which expects relative coordinates

2. **No 2D layout support** - LayoutAnalyzer only detects HORIZONTAL or VERTICAL single-axis layouts, not grids or complex multi-column designs

3. **Parent-child coordinate mismatch** - When layoutMode is NONE, Figma expects relative coords. When Auto Layout is on, coords are ignored entirely. Neither case is handled correctly.

4. **Missing layout context from AI** - Claude doesn't identify layout type (grid, flex, absolute)

## Solution: Two-Pass Generation

### Pass 1: Absolute Positioning Layer
Create all elements with correct absolute positions from Claude's analysis, maintaining visual accuracy.

### Pass 2: Layout Structuring Layer  
Analyze spatial relationships, detect layout patterns, group into containers, and apply Auto Layout with relative coordinates.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Analysis                       │
│  (elements with absolute bounds, parent-child refs)      │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 PASS 1: Position Layer                   │
│  - Create flat structure with absolute coords            │
│  - All elements as direct children of root frame         │
│  - Validate visual accuracy matches screenshot           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 PASS 2: Structure Layer                  │
│  - Detect layout patterns (grid, rows, columns)          │
│  - Create container groups                               │
│  - Convert absolute → relative coordinates               │
│  - Apply Auto Layout with proper spacing                 │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Final Output                           │
│  - Properly nested hierarchy                             │
│  - Auto Layout with correct spacing                      │
│  - Editable, designer-friendly structure                 │
└─────────────────────────────────────────────────────────┘
```

## Key Files to Modify

| File | Changes |
|------|---------|
| `src/main/generator/index.ts` | Split into two-pass architecture |
| `src/main/generator/layoutAnalyzer.ts` | Add grid/wrap/multi-column detection |
| `src/main/generator/nodeFactory.ts` | Support relative coordinate mode |
| NEW: `src/main/generator/layoutStructurer.ts` | Pass 2 layout grouping logic |
| NEW: `src/main/generator/spatialAnalyzer.ts` | Detect 2D patterns |

## Implementation Plan

### Plan 10-01: Coordinate System Fix
- Add relative coordinate conversion in nodeFactory
- Create helper to convert absolute→relative based on parent bounds
- Test with existing analysis data

### Plan 10-02: Spatial Pattern Detection  
- Create spatialAnalyzer.ts for 2D layout detection
- Detect grid patterns (regular spacing in X and Y)
- Detect row groups (elements with similar Y positions)
- Detect column groups (elements with similar X positions)

### Plan 10-03: Layout Structurer
- Create layoutStructurer.ts for Pass 2 grouping
- Group elements into logical containers
- Determine optimal container hierarchy
- Calculate container bounds from children

### Plan 10-04: Two-Pass Integration
- Refactor FigmaGenerator.generate() to use two passes
- Pass 1: Create elements with validated positions
- Pass 2: Apply structure and Auto Layout
- Ensure output is editable

### Plan 10-05: Testing & Validation
- Test with news website screenshot (the failing case)
- Test with simple layouts (buttons in a row)
- Test with complex grids (card layouts)
- Verify Auto Layout properties are correct

## Success Criteria

- [ ] News website layout generates with correct multi-column structure
- [ ] Featured article on left, grid on right are properly positioned
- [ ] Navigation menu is a proper horizontal Auto Layout container
- [ ] Card elements have correct internal structure
- [ ] All elements maintain visual accuracy from screenshot
- [ ] Output is fully editable (Auto Layout adjustable)
- [ ] No overlapping or mispositioned elements

## Test Case: News Website

Original structure detected:
- NavigationMenu (1372x45) at top
- 7 card containers with typography and badges
- Total 32 elements

Expected output:
```
Generated Design (root frame)
├── NavigationMenu (horizontal auto-layout)
│   └── nav items...
├── ContentArea (horizontal auto-layout)
│   ├── FeaturedArticle (vertical auto-layout)
│   │   └── card content...
│   └── ArticleGrid (wrap or grid layout)
│       ├── Card 1
│       ├── Card 2
│       └── ...
```

## Reference: Current Code Issues

### nodeFactory.ts line 30-33
```typescript
const scaledBounds = this.scaleBounds(config.bounds);
frame.x = scaledBounds.x;  // Uses absolute coords
frame.y = scaledBounds.y;  // Should be relative when inside parent
```

### layoutAnalyzer.ts line 108-155
```typescript
private detectLayoutDirection(children: UIElement[]): 'HORIZONTAL' | 'VERTICAL' | 'NONE'
// Only single-axis detection, no grid support
```

### generator/index.ts line 320-371
```typescript
private async processElementWithChildren(...)
// Creates children without coordinate conversion
```

## Session Continuity

To continue in new context:
1. Read this file: `.planning/phases/10-layout-fix/10-00-OVERVIEW.md`
2. Start with Plan 10-01 (Coordinate System Fix)
3. Test incrementally after each plan
