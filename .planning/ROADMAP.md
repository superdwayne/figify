# Roadmap: Screenshot to Shadcn Figma Plugin

## Overview

This roadmap transforms a UI screenshot into an editable Figma design with Shadcn components. The journey begins with establishing Figma's mandatory dual-thread architecture, then builds image input handling, integrates Claude vision API for analysis, creates a Figma node generation engine, implements Auto Layout for responsive designs, maps detected elements to specific Shadcn component variants, and concludes with end-to-end integration and polish. Each phase delivers verifiable capability, with architectural decisions front-loaded to avoid costly rewrites.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Architecture** - Dual-thread plugin scaffolding with message protocol
- [ ] **Phase 2: API Configuration** - API key management and secure storage
- [ ] **Phase 3: Image Input** - Screenshot paste and drag-drop handling
- [ ] **Phase 4: Claude Integration** - Vision API client with error handling
- [ ] **Phase 5: AI Analysis** - Element, color, spacing, typography detection
- [ ] **Phase 6: Figma Generation Core** - Basic node creation with styling
- [ ] **Phase 7: Layout & Hierarchy** - Auto Layout and semantic grouping
- [ ] **Phase 8: Shadcn Component Mapping** - Component specs and variant detection
- [ ] **Phase 9: Integration & Polish** - End-to-end flow and edge cases

## Phase Details

### Phase 1: Foundation & Architecture
**Goal**: Establish Figma's dual-thread architecture with typed message passing between sandbox and UI iframe
**Depends on**: Nothing (first phase)
**Requirements**: None directly (infrastructure phase)
**Success Criteria** (what must be TRUE):
  1. Plugin loads in Figma without errors
  2. Main thread (sandbox) can send message to UI thread and receive response
  3. UI thread renders React application with plugin shell
  4. TypeScript compilation succeeds with strict mode enabled
  5. Build produces valid Figma plugin bundle (manifest.json valid)
**Plans**: TBD

Plans:
- [ ] 01-01: Project scaffolding and build configuration
- [ ] 01-02: Dual-thread message protocol implementation
- [ ] 01-03: UI shell with React and basic plugin chrome

### Phase 2: API Configuration
**Goal**: Users can securely store and manage their Anthropic API key
**Depends on**: Phase 1
**Requirements**: CFG-01, CFG-02
**Success Criteria** (what must be TRUE):
  1. User can enter API key in settings panel
  2. API key persists across Figma sessions (survives close/reopen)
  3. User can update or clear stored API key
  4. API key is stored securely via figma.clientStorage (not localStorage)
**Plans**: TBD

Plans:
- [ ] 02-01: Settings UI and API key input form
- [ ] 02-02: Secure storage implementation with figma.clientStorage

### Phase 3: Image Input
**Goal**: Users can get screenshots into the plugin via paste or drag-drop
**Depends on**: Phase 1
**Requirements**: INP-01, INP-02
**Success Criteria** (what must be TRUE):
  1. User can paste screenshot via Cmd/Ctrl+V and see it in plugin
  2. User can drag-drop image file onto plugin window
  3. Plugin displays preview of captured image before processing
  4. Plugin validates image format (PNG, JPG, WebP) and shows error for invalid types
**Plans**: TBD

Plans:
- [ ] 03-01: Clipboard paste handler implementation
- [ ] 03-02: Drag-drop handler implementation
- [ ] 03-03: Image preview and validation

### Phase 4: Claude Integration
**Goal**: Plugin can communicate with Claude vision API and handle responses/errors
**Depends on**: Phase 2, Phase 3
**Requirements**: CFG-03, INP-03
**Success Criteria** (what must be TRUE):
  1. Plugin sends image to Claude API using stored API key
  2. Loading indicator displays during API processing
  3. API errors show clear, actionable messages (invalid key, rate limit, etc.)
  4. Plugin handles network failures gracefully
**Plans**: TBD

Plans:
- [ ] 04-01: Claude API client wrapper in UI thread
- [ ] 04-02: Loading states and progress indication
- [ ] 04-03: Error handling for all API failure modes

### Phase 5: AI Analysis
**Goal**: Claude accurately analyzes screenshots and returns structured element data
**Depends on**: Phase 4
**Requirements**: ANL-01, ANL-02, ANL-03, ANL-04
**Success Criteria** (what must be TRUE):
  1. Claude identifies UI elements (buttons, inputs, cards, text, containers)
  2. Claude extracts exact colors from screenshot as hex values
  3. Claude detects spacing and sizing (margins, padding, dimensions)
  4. Claude identifies typography (font size, weight, color)
  5. Response follows structured JSON schema (parseable, validated)
**Plans**: TBD

Plans:
- [ ] 05-01: Prompt engineering for element detection
- [ ] 05-02: JSON schema design and response validation
- [ ] 05-03: Color, spacing, and typography extraction

### Phase 6: Figma Generation Core
**Goal**: Plugin can create basic Figma nodes with accurate styling from structured data
**Depends on**: Phase 5
**Requirements**: GEN-01, GEN-05, GEN-06
**Success Criteria** (what must be TRUE):
  1. Plugin creates editable Figma frames/rectangles/text (not rasterized)
  2. Nodes have accurate colors (RGBA from hex)
  3. Nodes have accurate dimensions and positions
  4. Layers have semantic names (e.g., "header-nav-button" not "Frame 47")
  5. Output has logical grouping hierarchy
**Plans**: TBD

Plans:
- [ ] 06-01: Basic node creation (frames, rectangles, text)
- [ ] 06-02: Color and dimension application
- [ ] 06-03: Semantic naming and hierarchy grouping

### Phase 7: Layout & Hierarchy
**Goal**: Generated designs use Figma Auto Layout for responsive, editable output
**Depends on**: Phase 6
**Requirements**: GEN-04
**Success Criteria** (what must be TRUE):
  1. Container elements use Auto Layout (not absolute positioning)
  2. Spacing between elements respects detected margins/padding
  3. Nested structures maintain proper parent-child relationships
  4. Output remains editable (designer can adjust Auto Layout properties)
**Plans**: TBD

Plans:
- [ ] 07-01: Auto Layout detection and configuration
- [ ] 07-02: Nested structure handling
- [ ] 07-03: Spacing and alignment application

### Phase 8: Shadcn Component Mapping
**Goal**: Detected elements map to appropriate Shadcn component variants
**Depends on**: Phase 6, Phase 7
**Requirements**: GEN-02, GEN-03
**Success Criteria** (what must be TRUE):
  1. Buttons map to correct Shadcn Button variants (default, secondary, outline, ghost)
  2. Inputs, cards, badges, and core components use Shadcn styling
  3. Component variants detected from visual analysis (primary vs. ghost button)
  4. Fallback to generic styling when component match confidence is low
**Plans**: TBD

Plans:
- [ ] 08-01: Shadcn component specifications as JSON
- [ ] 08-02: Component factory and generation from specs
- [ ] 08-03: Variant detection and mapping logic

### Phase 9: Integration & Polish
**Goal**: Complete end-to-end flow works reliably with diverse screenshots
**Depends on**: Phase 8
**Requirements**: None directly (integration phase)
**Success Criteria** (what must be TRUE):
  1. Full workflow completes: paste screenshot, analyze, generate Figma design
  2. Complex screenshots (20+ elements) process without freezing UI
  3. Retina (2x/3x) screenshots produce correctly sized output
  4. Generated designs are immediately usable by designers (no cleanup needed)
**Plans**: TBD

Plans:
- [ ] 09-01: End-to-end flow integration
- [ ] 09-02: Performance optimization and batching
- [ ] 09-03: Edge case handling and retina normalization

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Architecture | 0/3 | Not started | - |
| 2. API Configuration | 0/2 | Not started | - |
| 3. Image Input | 0/3 | Not started | - |
| 4. Claude Integration | 0/3 | Not started | - |
| 5. AI Analysis | 0/3 | Not started | - |
| 6. Figma Generation Core | 0/3 | Not started | - |
| 7. Layout & Hierarchy | 0/3 | Not started | - |
| 8. Shadcn Component Mapping | 0/3 | Not started | - |
| 9. Integration & Polish | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-01-24*
