---
type: quick
plan: 001
subsystem: generator
tags: [shadcn, figma-generator, bug-fix]
tech-stack:
  patterns: [shadcn-factory, recursive-children]
key-files:
  modified:
    - src/main/generator/index.ts
metrics:
  duration: 3 min
  completed: 2026-01-27
---

# Quick Task 001: Fix Shadcn Component Conversion

**One-liner:** Removed !hasChildren condition so Shadcn components (Button, Card, Badge, Input) receive proper variant styling regardless of children.

## Problem

Shadcn components with children (like Cards containing text/images) were skipping the Shadcn factory entirely due to line 617's condition:

```typescript
if (hasShadcnSpec && !hasChildren) {
```

This caused these components to fall through to generic styling, losing their Shadcn variant styling (colors, borders, shadows, padding).

## Solution

Modified `createElement` in `/Users/dwayne/Figma-plugin/src/main/generator/index.ts`:

1. **Removed `!hasChildren` restriction** - Now all supported Shadcn components go through the factory
2. **Handled components with children** - Shadcn factory creates styled container, children processed by existing recursion in `processElementWithChildren`
3. **Handled leaf components with text** - Added text node inside styled container for buttons/badges with content but no children

### Code Change (lines 616-650)

```typescript
// For supported Shadcn components, use the Shadcn factory for proper variant styling
// The factory creates a styled container; children are processed by processElementWithChildren
if (hasShadcnSpec) {
  const enhancedElement = this.enhanceElementWithVariant(element);
  const shadcnNode = await this.shadcnFactory.createComponent(enhancedElement, parent, parentBounds);

  // For components with children, the styled node becomes the container
  if (hasChildren) {
    return shadcnNode;
  }

  // For leaf components (no children), check if we need to add text content
  const hasTextContent = element.content && element.content.trim().length > 0;

  if (hasTextContent && shadcnNode.type === 'FRAME') {
    const textNode = this.nodeFactory.createText({...});
    await this.styleApplier.applyTextStyles(textNode, element.styles);
    (shadcnNode as FrameNode).appendChild(textNode);
  }

  return shadcnNode;
}
```

## Flow After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Button("Submit") no children | Generic styling | Shadcn factory + text node |
| Card with children | Generic styling | Shadcn factory, children via recursion |
| Badge("New") no children | Generic styling | Shadcn factory + text node |
| Input no children | Generic styling (worked) | Shadcn factory (unchanged) |

## Commits

| Hash | Message |
|------|---------|
| 5aff85b | fix(quick-001): allow Shadcn components with children to receive variant styling |

## Deviations from Plan

None - plan executed exactly as written. Tasks 1 and 2 were implemented together in a single atomic change since Task 2's text content handling was a natural part of the same code block modified in Task 1.

## Verification

- Build passes: `npm run build` completes without errors
- Code inspection: Condition at line 618 no longer has `!hasChildren`
- Flow verified:
  - Button with hasShadcnSpec=true, hasChildren=false -> Shadcn factory + text
  - Card with hasShadcnSpec=true, hasChildren=true -> Shadcn factory, then processElementWithChildren handles children
