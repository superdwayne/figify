---
phase: 08-shadcn-component-mapping
plan: 01
subsystem: ui
tags: [shadcn, design-tokens, component-specs, figma-generation]

# Dependency graph
requires:
  - phase: 05-ai-analysis
    provides: ShadcnComponentType union type for component validation
provides:
  - ComponentSpec, VariantStyle, SizeStyle type interfaces
  - SHADCN_COLORS design tokens (hex color values)
  - SHADCN_SIZES sizing presets (height, padding, fontSize, radius)
  - COMPONENT_SPECS map with Button, Card, Badge, Input specs
affects: [08-02-component-factory, figma-generation, style-resolver]

# Tech tracking
tech-stack:
  added: []
  patterns: [component-spec-pattern, design-token-centralization]

key-files:
  created:
    - src/main/shadcn/types.ts
    - src/main/shadcn/tokens.ts
    - src/main/shadcn/specs/button.ts
    - src/main/shadcn/specs/card.ts
    - src/main/shadcn/specs/badge.ts
    - src/main/shadcn/specs/input.ts
    - src/main/shadcn/specs/index.ts
  modified:
    - tsconfig.plugin.json

key-decisions:
  - "TypeScript objects over JSON files for type safety and bundler compatibility"
  - "Centralized tokens.ts for single source of truth on colors/sizes"
  - "Badge uses border-radius 9999 (full) for pill shape"
  - "Button link variant has textDecoration: underline"

patterns-established:
  - "Component specs define baseStyles, variants, and sizes separately"
  - "COMPONENT_SPECS map keyed by ShadcnComponentType for lookup"
  - "Tokens use 'as const' for literal types"

# Metrics
duration: 8min
completed: 2026-01-26
---

# Phase 8 Plan 01: Shadcn Component Mapping Summary

**Shadcn design tokens and component specifications for Button, Card, Badge, Input with full variant/size support**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-26T12:00:00Z
- **Completed:** 2026-01-26T12:08:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created type-safe interfaces for ComponentSpec, VariantStyle, SizeStyle
- Defined centralized SHADCN_COLORS with all light-mode hex values from research
- Defined SHADCN_SIZES with xs, sm, default, lg, icon presets
- Created Button spec with 6 variants (default, secondary, outline, ghost, destructive, link) and 4 sizes
- Created Card, Badge, Input specs with appropriate variants and sizes
- Exported unified COMPONENT_SPECS map for component lookup

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Shadcn types and tokens** - `2d93ea5` (feat)
2. **Task 2: Create component specifications** - `d6db3c7` (feat)

## Files Created/Modified
- `src/main/shadcn/types.ts` - Type definitions for ComponentSpec, VariantStyle, SizeStyle, ResolvedStyles
- `src/main/shadcn/tokens.ts` - Centralized design tokens (SHADCN_COLORS, SHADCN_RADII, SHADCN_SIZES)
- `src/main/shadcn/specs/button.ts` - Button component spec with 6 variants, 4 sizes
- `src/main/shadcn/specs/card.ts` - Card component spec with border and shadow
- `src/main/shadcn/specs/badge.ts` - Badge component spec with pill shape
- `src/main/shadcn/specs/input.ts` - Input component spec with 3 sizes
- `src/main/shadcn/specs/index.ts` - COMPONENT_SPECS map export
- `tsconfig.plugin.json` - Updated include paths for src/main/**/*

## Decisions Made
- Used TypeScript objects (not JSON files) for component specs - provides type safety and works seamlessly with bundler
- Centralized all color values in tokens.ts rather than hardcoding in each spec
- Used 'as const' assertions on token objects for literal type inference
- Badge borderRadius set to 9999 (full) for consistent pill shape across all variants
- Link button variant includes textDecoration: 'underline' property

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in src/main/generator files (unused imports, missing Figma types) - these are unrelated to the new shadcn files and did not block execution

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Design tokens and component specs ready for ComponentFactory (Plan 02)
- COMPONENT_SPECS map provides easy lookup by component type
- Types enforce correct structure for future component specs

---
*Phase: 08-shadcn-component-mapping*
*Completed: 2026-01-26*
