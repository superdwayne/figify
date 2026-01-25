---
phase: "05-ai-analysis"
plan: "01"
subsystem: "prompt-engineering"
tags: ["types", "prompts", "shadcn", "claude-api"]
depends:
  requires: ["04-01"]
  provides: ["UIAnalysisResponse", "SHADCN_ANALYSIS_PROMPT", "analyzeScreenshot"]
  affects: ["05-02", "06-01"]
tech-stack:
  added: []
  patterns: ["structured-prompts", "typed-json-response"]
key-files:
  created:
    - "src/ui/types/analysis.ts"
    - "src/ui/prompts/shadcn-analysis.ts"
  modified:
    - "src/ui/services/claude.ts"
decisions:
  - id: "05-01-types"
    choice: "Separate interface for Bounds, Padding, ElementStyles for reusability"
    why: "Better type composition and easier to extend individual parts"
  - id: "05-01-prompt"
    choice: "SHADCN_COMPONENTS as const array for runtime enumeration"
    why: "Allows dynamic prompt construction and potential future validation"
  - id: "05-01-parse"
    choice: "Basic JSON.parse without validation"
    why: "Validation deferred to 05-02 per plan; keeps this plan focused"
metrics:
  duration: "2 min"
  completed: "2026-01-25"
---

# Phase 05 Plan 01: Analysis Types and Prompt Summary

Types and prompt for structured Claude analysis with direct Shadcn component mapping.

## What Was Built

### 1. TypeScript Types (`src/ui/types/analysis.ts`)

Created comprehensive type definitions for structured UI analysis:

- **ShadcnComponentType**: Union of 43 Shadcn components
- **UIElement**: Element with id, component, variant, size, bounds, styles, content, children
- **UIAnalysisResponse**: Top-level response with elements array and viewport
- **Helper interfaces**: Bounds, Padding, ElementStyles for composition

### 2. Shadcn Analysis Prompt (`src/ui/prompts/shadcn-analysis.ts`)

Created comprehensive prompt for Claude:

- **SHADCN_COMPONENTS**: Runtime array of all 43 component names
- **SHADCN_ANALYSIS_PROMPT**: Structured prompt with:
  - Component list for awareness
  - JSON-only output requirement
  - Schema example with all fields
  - Color extraction guidance (#RRGGBB format)
  - Spacing/sizing instructions (pixels, relative to top-left)
  - Typography guidance (font sizes, weights)
  - Confidence-only instruction (skip uncertain elements)

### 3. analyzeScreenshot Function (`src/ui/services/claude.ts`)

Added new function alongside existing analyzeImage:

- Uses SHADCN_ANALYSIS_PROMPT for structured output
- Returns typed UIAnalysisResponse
- Increased max_tokens to 8192 for complex UIs
- Basic JSON.parse (validation in 05-02)

## Commits

| Hash | Description |
|------|-------------|
| 8e9b4a5 | feat(05-01): add TypeScript types for UI analysis response |
| 0038b52 | feat(05-01): create Shadcn analysis prompt for Claude |
| 6b6f335 | feat(05-01): add analyzeScreenshot function for structured output |

## Verification Results

- `pnpm typecheck` passes with no errors
- All exports verified:
  - analysis.ts: ShadcnComponentType, UIElement, UIAnalysisResponse, Bounds, Padding, ElementStyles
  - shadcn-analysis.ts: SHADCN_COMPONENTS, SHADCN_ANALYSIS_PROMPT
  - claude.ts: analyzeScreenshot (plus existing exports)
- Key links verified:
  - SHADCN_ANALYSIS_PROMPT imported in claude.ts
  - UIAnalysisResponse used as return type

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 05-02 (Response Validation):
- Types defined for Zod schema creation
- analyzeScreenshot ready for validation integration
- SHADCN_COMPONENTS available for validating component names
