# Phase 8: Shadcn Component Mapping - Research

**Researched:** 2026-01-26
**Domain:** Shadcn/ui design system, component variant mapping, Figma generation
**Confidence:** HIGH

## Summary

This phase transforms generic Figma node generation into Shadcn-specific component styling. Phase 5's analysis already outputs `component`, `variant`, and `size` fields from Claude. Phase 6/7 creates basic frames with colors and Auto Layout. This phase adds the intelligence layer that applies Shadcn design tokens (colors, radii, padding, shadows) based on detected component types and variants.

The research confirms shadcn/ui uses a well-defined design token system through CSS variables (OKLCH/HSL format), and components use class-variance-authority (CVA) for variant management. Since this is a Figma plugin (not a React app), we bundle Shadcn's visual specifications as JSON rather than using npm packages.

**Primary recommendation:** Create JSON specification files defining each Shadcn component's visual properties per variant, then use a ComponentFactory pattern to apply those specs during Figma node generation.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Type-safe component specs | Already in codebase |
| JSON specs | N/A | Shadcn component definitions | No runtime deps, bundled with plugin |
| CVA-style patterns | N/A | Variant resolution logic | Matches how Shadcn itself handles variants |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | - | JSON specs are self-contained |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON specs | TypeScript objects | JSON allows future external loading; TS objects are simpler but harder to maintain separately |
| Factory pattern | Switch statements | Factory is more extensible for 40+ components |
| Per-component specs | Single large spec file | Per-component is more maintainable |

**Installation:** No new packages needed - pure TypeScript/JSON implementation.

## Architecture Patterns

### Recommended Project Structure

```
src/main/
├── generator/
│   ├── index.ts              # FigmaGenerator (existing)
│   ├── nodeFactory.ts        # NodeFactory (existing)
│   ├── styleApplier.ts       # StyleApplier (existing)
│   └── types.ts              # (existing)
├── shadcn/
│   ├── specs/                # JSON component specifications
│   │   ├── button.json
│   │   ├── card.json
│   │   ├── badge.json
│   │   ├── input.json
│   │   ├── checkbox.json
│   │   ├── avatar.json
│   │   ├── alert.json
│   │   └── ... (per component)
│   ├── componentFactory.ts   # Factory that creates Shadcn-styled nodes
│   ├── variantResolver.ts    # Resolves variant+size to style properties
│   ├── tokens.ts             # Design token values (colors, radii, spacing)
│   └── types.ts              # Type definitions for specs
```

### Pattern 1: Component Specification Schema

**What:** Each Shadcn component has a JSON spec defining its variants and visual properties

**When to use:** For every Shadcn component that needs visual differentiation

**Example:**
```typescript
// src/main/shadcn/types.ts
interface ComponentSpec {
  name: string;
  defaultVariant: string;
  defaultSize: string;
  variants: Record<string, VariantStyle>;
  sizes: Record<string, SizeStyle>;
  compoundVariants?: CompoundVariant[];
  baseStyles: BaseStyles;
}

interface VariantStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  shadow?: ShadowSpec;
}

interface SizeStyle {
  height?: number;
  paddingX?: number;
  paddingY?: number;
  fontSize?: number;
  borderRadius?: number;
  iconSize?: number;
}

// button.json example
{
  "name": "Button",
  "defaultVariant": "default",
  "defaultSize": "default",
  "baseStyles": {
    "fontWeight": 500,
    "textAlign": "center"
  },
  "variants": {
    "default": {
      "backgroundColor": "#18181B",
      "textColor": "#FAFAFA"
    },
    "secondary": {
      "backgroundColor": "#F4F4F5",
      "textColor": "#18181B"
    },
    "outline": {
      "backgroundColor": "transparent",
      "textColor": "#18181B",
      "borderColor": "#E4E4E7",
      "borderWidth": 1
    },
    "ghost": {
      "backgroundColor": "transparent",
      "textColor": "#18181B"
    },
    "destructive": {
      "backgroundColor": "#EF4444",
      "textColor": "#FAFAFA"
    },
    "link": {
      "backgroundColor": "transparent",
      "textColor": "#18181B",
      "textDecoration": "underline"
    }
  },
  "sizes": {
    "default": {
      "height": 40,
      "paddingX": 16,
      "paddingY": 8,
      "fontSize": 14,
      "borderRadius": 6
    },
    "sm": {
      "height": 36,
      "paddingX": 12,
      "paddingY": 6,
      "fontSize": 14,
      "borderRadius": 6
    },
    "lg": {
      "height": 44,
      "paddingX": 24,
      "paddingY": 10,
      "fontSize": 16,
      "borderRadius": 6
    },
    "icon": {
      "height": 40,
      "paddingX": 10,
      "paddingY": 10,
      "borderRadius": 6
    }
  }
}
```

### Pattern 2: Factory-Based Component Generation

**What:** ComponentFactory applies Shadcn specs to raw UIElement data

**When to use:** When generating Figma nodes from analyzed elements

**Example:**
```typescript
// src/main/shadcn/componentFactory.ts
export class ShadcnComponentFactory {
  private specs: Map<string, ComponentSpec>;
  private styleApplier: StyleApplier;
  private nodeFactory: NodeFactory;

  constructor(styleApplier: StyleApplier, nodeFactory: NodeFactory) {
    this.styleApplier = styleApplier;
    this.nodeFactory = nodeFactory;
    this.specs = this.loadSpecs();
  }

  /**
   * Create a Figma node with Shadcn styling applied
   */
  createComponent(element: UIElement, parent: FrameNode): SceneNode {
    const spec = this.specs.get(element.component);

    if (!spec) {
      // Fallback: use element's raw styles (generic styling)
      return this.createGenericElement(element, parent);
    }

    // Resolve variant and size (with fallbacks to defaults)
    const variant = element.variant || spec.defaultVariant;
    const size = element.size || spec.defaultSize;

    // Merge base + variant + size styles
    const resolvedStyles = this.resolveStyles(spec, variant, size, element);

    // Create appropriate Figma node
    return this.createStyledNode(element, resolvedStyles, parent);
  }

  private resolveStyles(
    spec: ComponentSpec,
    variant: string,
    size: string,
    element: UIElement
  ): ResolvedStyles {
    const variantStyles = spec.variants[variant] || spec.variants[spec.defaultVariant];
    const sizeStyles = spec.sizes[size] || spec.sizes[spec.defaultSize];

    // Priority: element.styles (from AI) > variant > size > base
    // This allows AI-detected colors to override when they differ significantly
    return {
      ...spec.baseStyles,
      ...sizeStyles,
      ...variantStyles,
      ...this.extractOverrides(element.styles),
    };
  }
}
```

### Pattern 3: Variant Detection Enhancement

**What:** Improve variant detection confidence based on visual properties

**When to use:** When AI-detected variant is uncertain or missing

**Example:**
```typescript
// src/main/shadcn/variantResolver.ts
export class VariantResolver {
  /**
   * Infer button variant from visual properties when variant field is missing
   */
  inferButtonVariant(styles: ElementStyles): string {
    const { backgroundColor, borderColor, textColor } = styles;

    // Ghost: transparent or very light background, no border
    if (this.isTransparent(backgroundColor) && !borderColor) {
      return 'ghost';
    }

    // Outline: transparent background with border
    if (this.isTransparent(backgroundColor) && borderColor) {
      return 'outline';
    }

    // Destructive: red-ish background
    if (this.isDestructiveColor(backgroundColor)) {
      return 'destructive';
    }

    // Secondary: light gray background
    if (this.isLightBackground(backgroundColor)) {
      return 'secondary';
    }

    // Default: dark/primary background
    return 'default';
  }

  private isTransparent(color?: string): boolean {
    if (!color) return true;
    const lower = color.toLowerCase();
    return lower === 'transparent' || lower === '#ffffff' || lower === '#fff';
  }

  private isDestructiveColor(color?: string): boolean {
    if (!color) return false;
    // Check if red-dominant (simplified heuristic)
    const rgb = this.hexToRgb(color);
    return rgb && rgb.r > 0.7 && rgb.g < 0.3 && rgb.b < 0.3;
  }
}
```

### Anti-Patterns to Avoid

- **Hardcoded styles in multiple places:** Centralize all Shadcn values in JSON specs
- **Ignoring AI-detected styles:** Use AI colors/sizes as hints, not absolutes
- **Switching on component type everywhere:** Use factory pattern, not scattered switch statements
- **Blocking main thread with specs:** Load specs synchronously at init (they're small JSON)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color format conversion | Custom hex parser | Existing StyleApplier.hexToRgb | Already tested in codebase |
| Component type checking | instanceof chains | TypeScript discriminated unions | Type-safe, exhaustive |
| Design token management | Hardcoded values | Centralized tokens.ts | Single source of truth |
| Variant fallbacks | Ad-hoc defaults | ComponentSpec.defaultVariant | Consistent behavior |

**Key insight:** Shadcn's design system is already well-specified. Our job is to faithfully represent those specs in JSON, not to invent a new system.

## Common Pitfalls

### Pitfall 1: Overriding AI Detection with Spec Defaults

**What goes wrong:** AI detects a purple button, but spec forces it to default black
**Why it happens:** Treating spec as absolute rather than baseline
**How to avoid:** Use AI-detected styles as overrides when they differ significantly from spec defaults
**Warning signs:** Generated buttons all look identical despite varied source screenshots

### Pitfall 2: Missing Fallback to Generic Styling

**What goes wrong:** Unknown component type causes generation to fail
**Why it happens:** No catch-all for components outside the ~40 we support
**How to avoid:** Implement `createGenericElement()` that uses raw element.styles
**Warning signs:** "Component not found" errors in console

### Pitfall 3: Size/Padding Inconsistency

**What goes wrong:** Text overflows button bounds or has too much whitespace
**Why it happens:** Mixing spec padding with AI-detected bounds
**How to avoid:** When using spec sizes, recalculate bounds; or use AI bounds with hug-content
**Warning signs:** Text cut off or buttons with inconsistent padding

### Pitfall 4: Dark Mode Color Confusion

**What goes wrong:** Buttons render with wrong contrast (light text on light background)
**Why it happens:** Mixing light-mode spec colors with dark-mode screenshot analysis
**How to avoid:** Phase 1 approach: support light mode only; later add theme detection
**Warning signs:** Unreadable text on generated elements

### Pitfall 5: Compound Variant Complexity

**What goes wrong:** outline+lg doesn't combine properly
**Why it happens:** Merging styles in wrong order
**How to avoid:** Follow CVA merge order: base -> size -> variant -> compoundVariants
**Warning signs:** Size styles overriding variant colors

## Code Examples

### Creating Button with Shadcn Styling

```typescript
// Integration with existing FigmaGenerator
private async createShadcnElement(
  element: UIElement,
  parent: FrameNode
): Promise<SceneNode> {
  // Delegate to ShadcnComponentFactory
  const node = this.shadcnFactory.createComponent(element, parent);

  // Track in node map
  this.nodeMap.set(element.id, node);

  return node;
}
```

### Loading Component Specs

```typescript
// src/main/shadcn/specs/index.ts
import buttonSpec from './button.json';
import cardSpec from './card.json';
import badgeSpec from './badge.json';
// ... import all specs

export const COMPONENT_SPECS: Record<string, ComponentSpec> = {
  Button: buttonSpec as ComponentSpec,
  Card: cardSpec as ComponentSpec,
  Badge: badgeSpec as ComponentSpec,
  // ... all components
};
```

### Confidence-Based Styling Decision

```typescript
/**
 * Decide whether to use spec styles or AI-detected styles
 */
private shouldUseSpecStyles(element: UIElement, spec: ComponentSpec): boolean {
  // Always use spec for standard variants
  if (element.variant && spec.variants[element.variant]) {
    return true;
  }

  // Use AI styles if they differ significantly (custom styling)
  const specDefaults = spec.variants[spec.defaultVariant];
  if (element.styles.backgroundColor &&
      !this.colorsMatch(element.styles.backgroundColor, specDefaults.backgroundColor)) {
    return false; // AI detected non-standard color
  }

  return true; // Default to spec
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HSL color format | OKLCH color format | Tailwind v4 (2025) | Better perceptual uniformity |
| 4 button variants | 6 button variants (added ghost, link) | 2025 | More visual options |
| Single sizing | Multiple size variants (xs-lg + icon) | Ongoing | Better flexibility |

**Deprecated/outdated:**
- Raw Tailwind classes in JSON: Use resolved hex/pixel values instead for Figma
- cursor: pointer default: Tailwind v4 removed this (not relevant to Figma)

## Open Questions

1. **Dark Mode Support**
   - What we know: Shadcn has separate light/dark CSS variables
   - What's unclear: Should we detect screenshot theme and use appropriate spec?
   - Recommendation: Support light mode only for MVP; add theme detection later

2. **AI Override vs Spec Authority**
   - What we know: AI extracts actual colors from screenshot
   - What's unclear: When should AI colors override spec colors?
   - Recommendation: Use spec for variant differentiation, AI for non-standard themes

3. **Complex Components (Dialog, Sheet, Drawer)**
   - What we know: These have multiple internal parts (overlay, content, header)
   - What's unclear: Can Claude reliably detect these composite structures?
   - Recommendation: Start with single-node components (Button, Badge, Input); defer multi-part

## Shadcn Design Tokens Reference

### Core Colors (Light Mode - Hex Approximations)

| Token | OKLCH | Hex Equivalent | Usage |
|-------|-------|----------------|-------|
| background | oklch(1 0 0) | #FFFFFF | Page/card backgrounds |
| foreground | oklch(0.145 0 0) | #0A0A0A | Primary text |
| primary | oklch(0.205 0 0) | #18181B | Default button bg, links |
| primary-foreground | oklch(0.985 0 0) | #FAFAFA | Text on primary |
| secondary | oklch(0.97 0 0) | #F4F4F5 | Secondary button bg |
| secondary-foreground | oklch(0.205 0 0) | #18181B | Text on secondary |
| muted | oklch(0.97 0 0) | #F4F4F5 | Muted backgrounds |
| muted-foreground | oklch(0.556 0 0) | #71717A | Muted text |
| destructive | oklch(0.577 0.245 27.325) | #EF4444 | Error states, destructive actions |
| border | oklch(0.922 0 0) | #E4E4E7 | Borders, dividers |
| input | oklch(0.922 0 0) | #E4E4E7 | Input borders |
| ring | oklch(0.708 0 0) | #A1A1AA | Focus rings |

### Spacing/Sizing Tokens

| Size | Height | Padding X | Padding Y | Font Size | Border Radius |
|------|--------|-----------|-----------|-----------|---------------|
| xs | 28px | 8px | 4px | 12px | 4px |
| sm | 36px | 12px | 6px | 14px | 6px |
| default | 40px | 16px | 8px | 14px | 6px |
| lg | 44px | 24px | 10px | 16px | 6px |
| icon | 40px | 10px | 10px | - | 6px |

### Component-Specific Notes

- **Badge:** Uses smaller radii (rounded-full for pill shape), smaller font
- **Input:** Height 40px, padding 12px horizontal, border 1px
- **Card:** Larger padding (24px), shadow effect optional
- **Avatar:** Circular (border-radius 50%), standard sizes 32/40/48px
- **Checkbox:** 16x16px, border-radius 2px, border 1px

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) - CSS variables and design tokens
- [shadcn/ui Button](https://ui.shadcn.com/docs/components/button) - Button variants and sizes
- [cva Documentation](https://cva.style/docs/getting-started/variants) - Variant resolution pattern
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card) - Card component structure
- [shadcn/ui Badge](https://ui.shadcn.com/docs/components/badge) - Badge variants

### Secondary (MEDIUM confidence)
- [Shadcn Colors Reference](https://isaichenko.dev/blog/shadcn-colors-naming/) - Color naming conventions
- [TypeScript Factory Patterns 2026](https://copyprogramming.com/howto/typescript-factory-pattern-with-parameters) - Factory pattern implementation
- [Figma Plugin API - createComponent](https://www.figma.com/plugin-docs/api/properties/figma-createcomponent/) - Component creation

### Tertiary (LOW confidence)
- WebSearch for current state of shadcn variants (verified against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing codebase patterns, no new deps
- Architecture: HIGH - Factory pattern well-documented, JSON specs are straightforward
- Pitfalls: HIGH - Based on existing codebase patterns and Shadcn docs
- Design tokens: MEDIUM - OKLCH->Hex conversions are approximations

**Research date:** 2026-01-26
**Valid until:** 60 days (Shadcn stable, design tokens rarely change)
