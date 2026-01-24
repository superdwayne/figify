# Project Research Summary

**Project:** Screenshot to Shadcn Figma Plugin
**Domain:** AI-powered screenshot-to-design conversion tool (Figma plugin)
**Researched:** 2026-01-24
**Confidence:** MEDIUM

## Executive Summary

This is a Figma plugin that leverages Claude vision AI to convert UI screenshots into editable Figma designs using Shadcn component mappings. The product operates in a dual-thread architecture mandated by Figma's security model: a sandboxed main thread with Figma API access, and a UI thread with network capabilities for Claude API calls. The key differentiator is pixel-accurate conversion to Shadcn components rather than generic shapes, making output immediately usable for designers.

The recommended approach is a BYOK (Bring Your Own Key) model with React UI, Vite build system, and bundled Shadcn component specifications as JSON manifests. The plugin processes images in the UI thread, sends them to Claude for analysis, receives structured element descriptions, and generates native Figma nodes in the main thread via message passing. Critical success factors include accurate component mapping (AI identifies "button" → plugin selects correct Shadcn Button variant), maintaining pixel accuracy through design tokens rather than arbitrary values, and performant node creation that doesn't freeze the UI.

The primary risks are architectural (network calls in wrong thread), precision expectations (Claude vision approximates rather than measures), and performance degradation with complex screenshots. These are mitigated by establishing the dual-thread architecture immediately in Phase 1, mapping Claude output to fixed Shadcn design tokens rather than arbitrary pixel values, and implementing batched node creation with progress indicators.

## Key Findings

### Recommended Stack

The stack is built around Figma's mandatory dual-runtime architecture: a sandboxed main thread for Figma API operations and an iframe UI thread for network access and user interaction. This split is fundamental and cannot be bypassed.

**Core technologies:**
- **Vite (^5.x)**: Build tool with dual-output support (main + UI), fast HMR, excellent TypeScript support. Figma community standard.
- **React (^18.x)**: UI framework for settings panel, upload interface, loading states. De facto standard for Figma plugins.
- **TypeScript (^5.3+)**: Type safety is non-negotiable given Figma Plugin API complexity and dual-thread communication.
- **@anthropic-ai/sdk (^0.30+)**: Official Claude SDK with vision support, handles streaming and retries. Must run in UI thread only.
- **@figma/plugin-typings**: Official Figma API types required for development.
- **vite-plugin-singlefile**: Inlines all assets for Figma plugin distribution requirements.

**Key architectural constraint:** ALL network calls (Claude API) MUST happen in the UI iframe thread. The main sandbox thread has zero network access. This dictates the entire communication pattern via `postMessage`.

**Output approach:** Bundle Shadcn components as JSON specifications (not Figma component libraries or npm packages). Plugin generates Figma nodes from these specs based on Claude's analysis. This keeps the plugin self-contained with no user setup required.

### Expected Features

Users expect a screenshot-to-design tool to handle basic image input (upload/paste/drag), provide feedback during AI processing, and produce editable native Figma output with accurate colors and spacing. The Shadcn component mapping is the core differentiator that sets this apart from generic conversion tools.

**Must have (table stakes):**
- Image upload (file picker) and clipboard paste — basic input methods
- Visual loading/progress indicator — AI processing takes 5-30 seconds
- Basic element detection — buttons, text, inputs, containers
- Color extraction — pixel-accurate promise requires exact colors
- Spacing/sizing accuracy — margins, padding, element dimensions
- Editable Figma output — native frames/shapes, not rasterized images
- API key configuration and secure storage — BYOK model requirement
- Error handling with clear messages — API failures, rate limits, invalid images

**Should have (competitive differentiators):**
- Shadcn component mapping — "Primary button" vs "ghost button" variants
- Layout system fidelity — Auto Layout, not absolute positioning
- Component variant detection — semantic understanding of component types
- Layer naming intelligence — "nav-button-primary" not "Frame 47"
- Grouped hierarchy — logical nesting (header > nav > buttons)

**Defer (v2+):**
- Drag-and-drop upload — nice to have, not essential
- Batch processing — power user feature
- Design token extraction — advanced feature
- Responsive hints — complex, speculative value
- Code export — different product category
- Custom component library linking — breaks "just works" promise

### Architecture Approach

Figma plugins with external APIs follow a mandatory dual-thread architecture: a main thread (sandbox) with Figma API access but no network/DOM, and a UI thread (iframe) with full browser capabilities including fetch. Communication happens exclusively via serializable postMessage. For this plugin, images are processed in the UI thread, sent to Claude, and the structured response is passed to the main thread for Figma node generation.

**Major components:**
1. **Plugin Controller (Main Thread)** — Orchestrates plugin lifecycle, routes messages between threads
2. **Figma Generator (Main Thread)** — Creates Figma nodes from structured design specifications
3. **Component Library (Main Thread)** — Provides Shadcn component templates as JSON specifications
4. **UI Shell (UI Thread)** — Renders plugin interface, handles image upload/paste
5. **Image Handler (UI Thread)** — Processes images to base64, validates format/size
6. **Claude Client (UI Thread)** — Makes API calls with user's API key, parses responses
7. **Settings Manager (UI Thread)** — Manages API key storage via figma.clientStorage

**Data flow:** User pastes/uploads screenshot → Image Handler converts to base64 → Claude Client analyzes image → structured JSON response → postMessage to Main Thread → Figma Generator creates nodes using Component Library specs → completion status sent back to UI.

**Key pattern:** Component Library as Data — Shadcn components defined as JSON specs (variants, sizes, styles, structure), not hardcoded creation logic. Generic factory creates Figma nodes from specs. Easier to maintain and extend.

### Critical Pitfalls

The research identified 13 pitfalls across critical, moderate, and minor severity. The top 5 that can derail the project:

1. **Figma Plugin Sandbox Blocking Network Requests** — Developers put Claude API calls in the main thread where they silently fail. ALL network calls MUST happen in the UI iframe. This architectural mistake requires a rewrite if discovered late. Prevention: Establish dual-thread architecture in Phase 1, test with actual API call before any feature work.

2. **Claude Vision "Pixel Accurate" Overconfidence** — Expecting exact pixel values from vision AI leads to inconsistent output. Claude describes what it sees semantically, not measurement-level precision. Prevention: Map Claude's output to Shadcn's fixed design tokens (Claude identifies "medium spacing" → plugin uses Shadcn's `p-4`). Post-process colors via direct image extraction for exact hex values.

3. **Component Mapping Ambiguity** — Claude identifies "a button" but plugin doesn't know which Shadcn Button variant. Visual similarity doesn't equal component equivalence. Prevention: Define explicit decision tree for component selection, limit initial component set to 10-15 core components, use two-pass approach (element type, then variant).

4. **Figma Node Creation Performance** — Creating 50+ elements synchronously takes 10+ seconds with no feedback. Users think plugin froze. Prevention: Batch structure creation, yield to event loop every 10 elements, show "Creating element X of Y" progress, set expectation that complex screenshots take 15-30 seconds.

5. **API Key Security Exposure** — BYOK model requires secure key storage. Developers often use insecure localStorage or expose keys in logs. Prevention: Use `figma.clientStorage.setAsync()` from day one, never log keys, provide "clear stored key" option, warn users about key security.

**Additional notable pitfalls:** Prompt engineering rabbit hole (time-box to 2 days max, use structured JSON output over prose), image resolution handling (retina screenshots at 2x/3x produce wrong sizes), Shadcn version drift (bundle components with explicit version lock), layout nesting explosion (flatten redundant frames, test editability not just visual output).

## Implications for Roadmap

Based on research, the dependency structure and pitfall avoidance suggest a 5-phase roadmap. The critical path is: establish architecture → prove Claude integration → build generation → bundle components → polish.

### Phase 1: Plugin Foundation & Architecture
**Rationale:** Must establish dual-thread architecture correctly from day one. Attempting to refactor this later is a rewrite. The sandbox/iframe split and message passing protocol are prerequisites for all other work.

**Delivers:**
- Project scaffolding (manifest.json, Vite dual build, TypeScript config)
- Main thread entry point with message router
- UI iframe shell with basic React app
- Typed postMessage protocol (shared message definitions)
- API key configuration UI and secure storage (figma.clientStorage)
- Validation: UI sends message → main thread receives and responds

**Addresses (from FEATURES.md):**
- API key configuration (table stakes)
- Foundation for all other features

**Avoids (from PITFALLS.md):**
- Pitfall #1: Network calls in wrong thread
- Pitfall #3: API key security exposure
- Pitfall #7: Image format handling (establish pipeline early)

**Research needed:** SKIP — well-documented Figma Plugin API patterns

---

### Phase 2: Claude Integration & Image Processing
**Rationale:** Prove the core value proposition works before investing in complex component mapping. This phase validates that Claude can analyze screenshots and return structured data suitable for Figma generation. High risk/high value — if this doesn't work, pivot early.

**Delivers:**
- Image upload (file picker) and clipboard paste support
- Image preprocessing (resize to <4MB, base64 conversion)
- Claude API client wrapper in UI thread
- Structured prompt with JSON schema for element detection
- Response parsing and validation (use Zod for runtime validation)
- Error handling for all Claude API error codes (401, 429, 400, 500)
- Loading indicator during API processing
- Validation: Upload screenshot → see Claude's structured analysis in UI

**Addresses (from FEATURES.md):**
- Image upload and paste (table stakes)
- Visual loading indicator (table stakes)
- Basic element detection (table stakes)
- Error handling (table stakes)

**Avoids (from PITFALLS.md):**
- Pitfall #2: "Pixel accurate" overconfidence — Define JSON schema with design tokens, not arbitrary pixels
- Pitfall #6: Prompt engineering rabbit hole — Time-box to 2 days, use structured output
- Pitfall #10: Claude API error handling gaps — Map all error codes to user-friendly messages

**Research needed:** YES — `/gsd:research-phase` for prompt engineering and JSON schema design. This is novel integration work requiring experimentation.

---

### Phase 3: Figma Generation Core
**Rationale:** With Claude integration proven, build the Figma node creation engine. This transforms Claude's structured output into native Figma elements. Dependencies: needs Phase 1 (message passing) and Phase 2 (structured input format).

**Delivers:**
- Basic Figma node creation (frames, rectangles, text)
- Color application (RGBA conversion from hex)
- Spacing/sizing implementation
- Typography application with font fallbacks
- Auto Layout configuration for responsive layouts
- Batched creation with progress callbacks (yield every 10 elements)
- Layer naming from semantic descriptions
- Hierarchy grouping logic with flattening rules
- Validation: Hardcoded design spec → generated Figma design on canvas

**Addresses (from FEATURES.md):**
- Editable Figma output (table stakes)
- Color extraction (table stakes)
- Spacing/sizing accuracy (table stakes)
- Typography approximation (table stakes)
- Layout system fidelity (differentiator)
- Layer naming intelligence (differentiator)
- Grouped hierarchy (differentiator)

**Avoids (from PITFALLS.md):**
- Pitfall #5: Node creation performance — Batch operations, progress indicators, yield to UI
- Pitfall #9: Layout nesting explosion — Flatten redundant frames, max depth 5 levels
- Pitfall #11: Font substitution — Safe font fallback chain
- Pitfall #13: Color space confusion — Normalize to RGBA immediately

**Research needed:** SKIP — Standard Figma API usage patterns, well-documented

---

### Phase 4: Shadcn Component Mapping
**Rationale:** The core differentiator. Transforms generic element detection into specific Shadcn component instances. Dependencies: needs Phase 3 (node generation engine) and Phase 2 (element detection from Claude).

**Delivers:**
- Shadcn component specifications as JSON (10-15 core components: Button, Input, Card, Badge, Alert, Checkbox, Radio, Select, Label, Separator, Avatar, Switch, Textarea, Tooltip, Dialog)
- Component factory that generates Figma nodes from JSON specs
- Decision tree for component variant mapping (Claude "primary button" → Button variant="default")
- Confidence scoring for ambiguous components (default to safe variants)
- Component library manager
- Version lock documentation (Shadcn version used)
- Validation: Claude identifies "button" → correct Shadcn Button variant created

**Addresses (from FEATURES.md):**
- Shadcn component mapping (key differentiator)
- Component variant detection (key differentiator)

**Avoids (from PITFALLS.md):**
- Pitfall #4: Component mapping ambiguity — Explicit decision tree, limited component set
- Pitfall #8: Shadcn version drift — Version lock, focus on primitives that change rarely

**Research needed:** YES — `/gsd:research-phase` for component mapping logic. Need to experiment with how Claude describes components and how to map to variants reliably.

---

### Phase 5: Integration & Polish
**Rationale:** Connect all pieces end-to-end and handle edge cases. This phase makes the plugin production-ready.

**Delivers:**
- End-to-end flow: screenshot upload → Claude analysis → Shadcn component selection → Figma generation
- Image resolution normalization (handle retina 2x/3x screenshots)
- Format recommendations and preview (show processed image before analysis)
- Enhanced error messages with recovery suggestions
- Undo support verification (use Figma's built-in undo)
- Performance optimization for complex screenshots
- User documentation (supported image formats, best practices)
- Validation: Full workflow with 20+ diverse screenshots

**Addresses (from FEATURES.md):**
- All table stakes features fully integrated
- Polish on differentiator features

**Avoids (from PITFALLS.md):**
- Pitfall #7: Image resolution surprises — Normalize input, detect retina
- Pitfall #12: Plugin UI responsive breakage — Test at multiple panel sizes

**Research needed:** SKIP — Integration work, no novel patterns

---

### Phase Ordering Rationale

**Why this sequence:**
1. **Architecture first** because refactoring dual-thread communication is a rewrite. Get it right immediately.
2. **Claude integration before generation** to validate the core value proposition early. If Claude can't provide useful structured output, the plugin doesn't work. Fail fast.
3. **Basic generation before component mapping** to prove Figma node creation works with simple cases before complex component logic.
4. **Component mapping as separate phase** because it's the complex differentiator requiring experimentation. Don't block basic functionality on this.
5. **Integration last** to connect proven pieces and handle edge cases systematically.

**Dependency groups:**
- Phases 2 and 3 are partially parallelizable (Claude work vs. Figma work) but Phase 2 must complete first to define the data contract.
- Phase 4 depends on both Phase 2 (element types) and Phase 3 (generation engine).
- Phase 5 depends on all previous phases being complete.

**Pitfall avoidance:**
- Critical architectural pitfalls (#1, #3) addressed in Phase 1 before feature work begins
- AI precision pitfall (#2) addressed in Phase 2 when defining output schema
- Performance pitfall (#5) addressed in Phase 3 during node creation implementation
- Component mapping pitfall (#4) addressed in Phase 4 with dedicated focus

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (Claude Integration):** Complex prompt engineering, JSON schema design for structured output, testing with diverse screenshots. No established pattern for screenshot-to-Shadcn conversion. Needs `/gsd:research-phase` to experiment with prompts and validate output quality.
- **Phase 4 (Component Mapping):** Novel mapping logic from AI descriptions to specific Shadcn variants. Needs `/gsd:research-phase` to build decision tree and test accuracy across component types.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Well-documented Figma Plugin API, standard React setup, established TypeScript patterns
- **Phase 3 (Generation Core):** Standard Figma API usage for node creation, documented Auto Layout patterns
- **Phase 5 (Integration):** Standard integration testing and polish work

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Vite, React, TypeScript are proven for Figma plugins. Anthropic SDK version based on training data (verify current version). |
| Features | MEDIUM | Table stakes well-understood from domain knowledge. Differentiators (Shadcn mapping) are novel and need validation. Unable to verify current market competitors. |
| Architecture | HIGH | Dual-thread Figma architecture is stable and well-documented since 2019. Message passing patterns are standard. |
| Pitfalls | MEDIUM | Architectural pitfalls (sandbox, security) are well-known. AI precision and component mapping pitfalls inferred from domain knowledge but not battle-tested. |

**Overall confidence:** MEDIUM

### Gaps to Address

Areas where research was inconclusive or needs validation during implementation:

- **Claude vision precision for UI elements:** Training data suggests approximate output, but actual pixel accuracy for spacing/sizing needs real-world testing. Plan for Phase 2 to include extensive screenshot testing across different UI types (buttons, forms, cards) to validate precision levels.

- **Shadcn component variant detection reliability:** Unknown how consistently Claude can distinguish between Button variants (primary/secondary/ghost/link) from visual analysis alone. Phase 4 needs experimentation to determine if additional context clues (position, surrounding elements) are needed for accurate mapping.

- **Current Shadcn version and structure:** Research based on training data knowledge of Shadcn. Actual component structures, variants, and styling tokens may have evolved. Before Phase 4, audit current Shadcn components at ui.shadcn.com to validate JSON spec approach and update component definitions.

- **Anthropic SDK version and API changes:** Version numbers (^0.30+) based on training data. Before Phase 2, verify current @anthropic-ai/sdk version, check for breaking changes in vision API, confirm image size limits and token costs.

- **Figma Plugin API updates:** Architecture research based on stable 2019-era patterns. Before Phase 1, review current Figma Plugin API docs (figma.com/plugin-docs) for any new capabilities (improved storage, new node types, performance improvements) that could simplify implementation.

- **Performance characteristics at scale:** Unknown how Figma performs with 50-100 node creations in rapid succession. Phase 3 testing should include stress tests with complex screenshots to validate batching strategy and determine optimal yield frequency.

## Sources

### Primary (HIGH confidence)
- Figma Plugin API documentation (figma.com/plugin-docs) — dual-thread architecture, Plugin API methods, clientStorage
- Anthropic Claude API documentation (docs.anthropic.com) — vision capabilities, API structure, error codes
- Training data knowledge of React, TypeScript, Vite build tooling (January 2025 cutoff)

### Secondary (MEDIUM confidence)
- Training data knowledge of Shadcn/ui component structure and design tokens
- Training data knowledge of Figma plugin community patterns (Vite adoption, React standard)
- Domain knowledge of AI vision model capabilities and limitations

### Tertiary (LOW confidence)
- Specific version numbers for npm packages (@anthropic-ai/sdk ^0.30+, vite-plugin-singlefile) — based on training data, verify before use
- Current state of Shadcn components — design system evolves rapidly, validate current structure
- Competitive landscape analysis — web search unavailable, unable to verify current market state

---

**Research completed:** 2026-01-24
**Ready for roadmap:** Yes

**Next steps for orchestrator:**
1. Load SUMMARY.md as context for roadmap creation
2. Use suggested 5-phase structure as starting point
3. Flag Phase 2 and Phase 4 for potential `/gsd:research-phase` during detailed planning
4. Proceed to requirements definition and task breakdown
