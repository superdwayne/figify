# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Turn any UI screenshot into editable Figma designs with proper Shadcn components - fast and accurate.
**Current focus:** Phase 10 - Two-Pass Layout Generation (fixing layout issues)

## Current Position

Phase: 10 (Layout Fix - Two-Pass Generation)
Plan: 2 of 5 in current phase - COMPLETE
Status: Plan 10-02 completed, ready for 10-03
Last activity: 2026-01-27 - Completed quick task 001: Fix Shadcn component conversion

Progress: [####################] 100% (original phases) + Phase 10: 2/5 plans complete

## Phase 10 Context

**Problem:** Generated layouts have incorrect positioning. Elements are misplaced because:
1. Absolute coordinates used where relative needed
2. No 2D grid layout support  
3. Complex layouts (like news websites) fail

**Solution:** Two-Pass Generation
- Pass 1: Create elements with correct positions
- Pass 2: Detect patterns, group containers, apply Auto Layout

**Start file:** `.planning/phases/10-layout-fix/10-00-OVERVIEW.md`
**First plan:** `.planning/phases/10-layout-fix/10-01-PLAN.md`

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: ~4 min
- Total execution time: ~1.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3 | 16 min | 5.3 min |
| 02-api-configuration | 2 | 7 min | 3.5 min |
| 03-image-input | 2 | 8 min | 4.0 min |
| 04-claude-integration | 3 | 8 min | 2.7 min |
| 05-ai-analysis | 3 | 8 min | 2.7 min |
| 08-shadcn-component-mapping | 3 | 18 min | 6.0 min |
| 09-integration-polish | 3 | 15 min | 5.0 min |

**Final Summary:**
- All 9 phases completed in ~1.3 hours
- 19 plans executed across 9 phases
- Project delivered complete end-to-end functionality

*Project complete - 2026-01-26*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Research]: BYOK model - users provide own Anthropic API key
- [Research]: Bundle Shadcn components as JSON specs (not npm packages)
- [Research]: Dual-thread architecture required (sandbox + UI iframe)
- [01-01]: Vite over webpack for faster builds and Figma plugin support
- [01-01]: vite-plugin-singlefile to inline assets for Figma UI iframe
- [01-01]: Correlation ID pattern for async message tracking between threads
- [01-02]: Separate tsconfig.plugin.json for Figma API types (no DOM)
- [01-02]: UI_READY -> INIT handshake pattern for reliable plugin startup
- [01-03]: IIFE format for main.js (Figma sandbox requires no module exports)
- [01-03]: Sequential build script: main bundle then UI bundle
- [03-01]: useRef for previewUrl tracking to avoid stale closure issues
- [03-01]: Window-level drag prevention for file drop handling
- [03-01]: MIME type validation sufficient for user images (no magic bytes)
- [03-02]: State-based Tailwind classes for visual feedback (error/dragging/default)
- [03-02]: Image preview constrained to max-h-64 for consistent UI
- [02-01]: Use 'anthropic_api_key' as storage key name
- [02-01]: StorageRequest union type for type-safe storage actions
- [02-01]: Async handleUIRequest for await support
- [02-02]: isValidApiKeyFormat validates sk-ant- prefix and 50+ chars
- [02-02]: View state pattern for main/settings switching
- [02-02]: Separate pendingResponses in useApiKey hook
- [04-01]: dangerouslyAllowBrowser: true for BYOK browser API calls
- [04-01]: User-friendly error messages mapped from HTTP status codes
- [04-01]: Simple prompt for Phase 4 (structured prompts in Phase 5)
- [04-02]: API key null check returns helpful error directing to Settings
- [04-02]: AbortController ref persists across renders for proper cancellation
- [04-03]: Combined displayError from validation and API errors
- [04-03]: handleClearImage clears image, result, and error together
- [05-01]: Separate interfaces for Bounds, Padding, ElementStyles for reusability
- [05-01]: SHADCN_COMPONENTS as const array for runtime enumeration
- [05-01]: Basic JSON.parse without validation (deferred to 05-02)
- [05-02]: Filter invalid elements while preserving valid ones (graceful degradation)
- [05-02]: Default viewport to 1920x1080 when missing from response
- [05-02]: Handle markdown-fenced JSON responses (Claude sometimes ignores prompt)
- [05-02]: Re-export AnalysisParseError from claude.ts for consumer convenience
- [05-03]: useClaude hook returns typed UIAnalysisResponse instead of raw string
- [05-03]: AnalysisResult component with ElementCard sub-component for individual elements
- [05-03]: ColorSwatch component for visual color display with hex values
- [05-03]: reset() function in useClaude clears result, error, and aborts pending requests
- [08-01]: TypeScript objects over JSON files for component specs (type safety)
- [08-01]: Centralized tokens.ts for single source of truth on colors/sizes
- [08-01]: Badge uses border-radius 9999 (full) for pill shape
- [08-01]: Button link variant has textDecoration: underline
- [08-02]: Async createComponent due to font loading for text nodes
- [08-02]: colorsMatch uses RGB channel comparison with 10-unit tolerance
- [08-02]: Unknown components fall back to generic styling (no errors)
- [08-02]: AI colors preserved when they differ from known Shadcn colors
- [08-03]: Variant inference uses 20-unit RGB tolerance for color matching
- [08-03]: Shadcn factory used for all matching components (with or without children)
- [08-03]: enhanceElementWithVariant pattern for augmenting AI output
- [08-03]: hasShadcnSpec check before factory delegation
- [09-01]: Separate useGeneration hook for clean separation from useClaude
- [09-01]: Generation result replaces button (must clear to regenerate)
- [09-02]: Progress throttle at 100ms (10 updates/sec max)
- [09-02]: 30 second timeout with partial results on exceed
- [09-02]: Element bounds validation pre-filters invalid data
- [09-03]: Device resolution lookup with 5% tolerance for retina detection
- [09-03]: Heuristic fallback: >2500px=3x, >1800px=2x, else 1x
- [09-03]: Viewport clamped to 100-4000px range
- [10-01]: Parent bounds passed through hierarchy for coordinate conversion
- [10-01]: toRelativeBounds subtracts parent origin from child absolute coords
- [10-01]: NodeFactory methods accept optional parentBounds for relative mode
- [10-01]: Root elements use undefined parentBounds (absolute coordinates)
- [10-02]: SpatialAnalyzer class for containment, row, column, grid detection
- [10-02]: buildContainmentTree finds smallest containing parent for each element
- [10-02]: detectRows groups elements by Y center position (10px tolerance)
- [10-02]: detectGrid validates column alignment across rows with 15px tolerance
- [10-02]: Types SpatialGroup, ContainmentNode, GridPattern added to types.ts

### Pending Todos

None yet.

### Blockers/Concerns

None - Project complete!

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Fix Shadcn component conversion not working properly | 2026-01-27 | 9da8812 | [001-fix-shadcn-component-conversion](./quick/001-fix-shadcn-component-conversion/) |

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed Phase 9 (Integration & Polish)
Resume file: None - Project complete

## Phase 1 Completion Summary

All success criteria verified:
- Plugin loads in Figma without errors
- Main thread sends messages to UI thread and receives responses
- UI thread renders React application with plugin shell
- TypeScript compiles with strict mode enabled
- Build produces valid Figma plugin bundles

## Phase 3 Completion Summary

All success criteria verified:
- User can paste screenshot via Cmd/Ctrl+V and see it in plugin
- User can drag-drop image file onto plugin window
- Plugin displays preview of captured image before processing
- Plugin validates image format (PNG, JPG, WebP) and shows error for invalid types
- Drop zone shows visual feedback when dragging over it

**Key deliverables:**
- `src/ui/hooks/useImageCapture.ts` - Custom hook for paste and drag-drop
- `src/ui/utils/imageUtils.ts` - Image validation utilities
- `src/ui/components/ImageCapture.tsx` - Drop zone UI component
- `src/shared/messages.ts` - IMAGE_CAPTURED message type added

## Phase 2 Completion Summary

All success criteria verified:
- User can enter API key in settings panel
- API key persists across Figma sessions (via figma.clientStorage)
- User can update or clear stored API key
- API key input has show/hide toggle
- Settings accessible via gear icon in header
- Validation prevents saving invalid key format

**Key deliverables:**
- `src/shared/messages.ts` - StorageRequest types for API key operations
- `src/main.ts` - figma.clientStorage handlers for GET/SET/CLEAR_API_KEY
- `src/ui/hooks/useApiKey.ts` - Custom hook for API key state and storage
- `src/ui/components/Settings.tsx` - Settings panel with API key form
- `src/ui/App.tsx` - View switching between main content and settings

## Phase 4 Completion Summary

All success criteria verified:
- User can capture image and click "Analyze Screenshot"
- Loading spinner visible during API call
- Error messages display for API failures
- Success shows analysis result text
- Missing API key shows helpful hint to configure in Settings
- All state resets properly when clearing image

**Key deliverables:**
- `src/ui/services/claude.ts` - Claude API client wrapper
- `src/ui/utils/base64.ts` - Base64 conversion utility
- `src/ui/hooks/useClaude.ts` - React hook for Claude API integration
- `src/ui/components/ImageCapture.tsx` - Updated with Claude integration

**Plan 1: Claude SDK Setup - COMPLETE**
- Installed @anthropic-ai/sdk with browser support
- Created Claude client factory (createClaudeClient)
- Implemented error message translation (getErrorMessage)
- Added image analysis function (analyzeImage)
- Created base64 conversion utility (uint8ArrayToBase64)

**Plan 2: useClaude Hook - COMPLETE**
- Created useClaude hook with loading/error/result state management
- Implemented AbortController for request cancellation on unmount
- Added API key validation with helpful error directing to Settings

**Plan 3: UI Integration - COMPLETE**
- Integrated useClaude and useApiKey hooks into ImageCapture
- Added Analyze button with loading/disabled states
- Implemented loading spinner with status text
- Added result display container with clear functionality
- Combined error display from validation and API sources

## Phase 5 Completion Summary

All success criteria verified:
- Claude identifies UI elements (buttons, inputs, cards, text, containers)
- Claude extracts exact colors from screenshot as hex values
- Claude detects spacing and sizing (margins, padding, dimensions)
- Claude identifies typography (font size, weight, color)
- Response follows structured JSON schema (parseable, validated)

**Key deliverables:**
- `src/ui/types/analysis.ts` - TypeScript types for UI analysis response
- `src/ui/utils/prompts.ts` - Structured Shadcn analysis prompt
- `src/ui/utils/parseAnalysis.ts` - JSON parsing and validation utilities
- `src/ui/services/claude.ts` - Updated with analyzeScreenshot function
- `src/ui/hooks/useClaude.ts` - Returns typed UIAnalysisResponse
- `src/ui/components/AnalysisResult.tsx` - Structured result display

**Plan 1: Analysis Types & Prompt - COMPLETE**
- Created UIAnalysisResponse, UIElement, and related type definitions
- Defined SHADCN_COMPONENTS array for component type validation
- Built detailed Shadcn analysis prompt with JSON schema output
- Added analyzeScreenshot function using structured prompt

**Plan 2: Response Validation - COMPLETE**
- Created AnalysisParseError class for detailed error tracking
- Implemented validateElement function checking all required fields
- Created parseAnalysisResponse with graceful degradation (filter invalid, preserve valid)
- Handles markdown-fenced JSON and default viewport

**Plan 3: Prompt Iteration - COMPLETE**
- Updated useClaude hook to return typed UIAnalysisResponse
- Created AnalysisResult component with ElementCard and ColorSwatch sub-components
- Integrated structured display into ImageCapture component
- Human-verified analysis accuracy with real screenshots

## Phase 8 Plan 01 Completion Summary

All success criteria verified:
- All type definitions compile without errors
- Design tokens match Shadcn reference values from research
- Button spec has default, secondary, outline, ghost, destructive, link variants
- Card, Badge, Input specs have appropriate variants and sizes
- COMPONENT_SPECS map exports all four component specs

**Key deliverables:**
- `src/main/shadcn/types.ts` - ComponentSpec, VariantStyle, SizeStyle, ResolvedStyles interfaces
- `src/main/shadcn/tokens.ts` - SHADCN_COLORS, SHADCN_RADII, SHADCN_SIZES design tokens
- `src/main/shadcn/specs/button.ts` - Button spec with 6 variants, 4 sizes
- `src/main/shadcn/specs/card.ts` - Card spec with border and shadow
- `src/main/shadcn/specs/badge.ts` - Badge spec with pill shape
- `src/main/shadcn/specs/input.ts` - Input spec with 3 sizes
- `src/main/shadcn/specs/index.ts` - COMPONENT_SPECS map

## Phase 8 Plan 02 Completion Summary

All success criteria verified:
- ShadcnComponentFactory creates nodes with Shadcn-specific styling
- Unknown component types fall back to generic styling without errors
- Style resolution follows CVA merge order: base -> size -> variant
- AI-detected colors override spec colors when they differ significantly
- Public index.ts exports all necessary types and classes

**Key deliverables:**
- `src/main/shadcn/variantResolver.ts` - resolveStyles, mergeWithOverrides, colorsMatch functions
- `src/main/shadcn/componentFactory.ts` - ShadcnComponentFactory class with createComponent, createGenericElement
- `src/main/shadcn/index.ts` - Public API exporting factory, specs, tokens, and types

## Phase 8 Plan 03 Completion Summary

All success criteria verified:
- FigmaGenerator creates Shadcn-styled nodes for Button, Card, Badge, Input
- Variant inference fills in missing variant field based on visual analysis
- Buttons with dark background get default variant styling
- Buttons with transparent background and border get outline variant styling
- Unsupported components fall back to generic styling without errors
- Build produces valid plugin bundles (main.js: 24.75 kB)

**Key deliverables:**
- `src/main/shadcn/variantResolver.ts` - Added inferButtonVariant, inferBadgeVariant, inferVariant functions
- `src/main/shadcn/index.ts` - Exported variant inference functions
- `src/main/generator/index.ts` - Integrated ShadcnComponentFactory with variant inference

## Phase 8 Complete

Shadcn Component Mapping phase finished:
- Wave 1: Design tokens and component specs (Button, Card, Badge, Input)
- Wave 2: ShadcnComponentFactory with CVA-style resolution
- Wave 3: FigmaGenerator integration with variant inference

## Phase 9 Complete

Integration & Polish phase finished:
- Wave 1: End-to-end flow integration with useGeneration hook
- Wave 2: Performance optimization with progress throttling and 30s timeout
- Wave 3: Edge case handling with enhanced retina detection (1x/2x/3x)

**Key deliverables:**
- `src/ui/hooks/useGeneration.ts` - Generation state management hook
- Enhanced `AnalysisResult.tsx` with Generate button, progress bar, success/error UI
- Progress throttling (10 updates/sec max) to prevent UI flooding
- Element bounds validation to filter invalid Claude responses
- Device-aware retina detection with known resolution lookup table
- Viewport validation with min/max clamping

**Build output:**
- main.js: 26.35 kB
- ui.html: 254.32 kB

## Phase 10 Plan 01 Complete

**Coordinate System Fix** - Fixed the fundamental issue where child elements were positioned incorrectly because absolute coordinates from Claude's analysis were used directly instead of being converted to parent-relative coordinates.

**Key deliverables:**
- `src/main/generator/coordinateUtils.ts` - NEW: Coordinate conversion utilities (toRelativeBounds, isContainedWithin, clampRelativeBounds)
- `src/main/generator/nodeFactory.ts` - Updated createFrame, createText, createRectangle, createEllipse to accept optional parentBounds
- `src/main/generator/index.ts` - Updated processElementWithChildren and createElement to pass parent bounds through hierarchy
- `src/main/shadcn/componentFactory.ts` - Updated createComponent and related methods to support parentBounds

**Technical changes:**
- Parent element's bounds are now tracked and passed down when processing children
- NodeFactory methods convert absolute → relative coordinates when parentBounds provided
- Root-level elements continue to use absolute coordinates (undefined parentBounds)

**Build output:**
- main.js: 27.11 kB
- ui.html: 255.00 kB

## Phase 10 Plan 02 Complete

**Spatial Pattern Detection** - Created SpatialAnalyzer class that detects spatial relationships between elements to automatically build hierarchy and identify layout patterns.

**Key deliverables:**
- `src/main/generator/spatialAnalyzer.ts` - NEW: Complete spatial analysis with containment, rows, columns, grids
- `src/main/generator/types.ts` - Added SpatialGroup, ContainmentNode, GridPattern types

**Capabilities added:**
- `buildContainmentTree()` - Detects which elements are inside others and builds parent-child hierarchy
- `detectRows()` - Groups elements with similar Y positions (within 10px tolerance)
- `detectColumns()` - Groups elements with similar X positions (within 10px tolerance)
- `detectGrid()` - Identifies 2D grid patterns with consistent column alignment
- `findContainingParent()` - Finds the smallest element that contains a spatial group
- `flattenWithHierarchy()` - Converts containment tree back to flat list with children IDs

**Build output:**
- main.js: 27.11 kB
- ui.html: 255.01 kB

---

## PROJECT STATUS

Phases 1-9 completed. Phase 10 in progress (2/5 plans complete).

The plugin can now:
1. Accept screenshots via paste or drag-drop
2. Analyze with Claude AI to detect Shadcn components
3. Display structured analysis with element cards
4. Generate editable Figma designs with Auto Layout
5. Apply proper Shadcn styling with variant detection
6. Handle retina screenshots (2x/3x) automatically
7. Provide progress feedback during generation
8. **NEW:** Correctly position child elements relative to their parent frames
