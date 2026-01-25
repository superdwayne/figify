# Requirements: Screenshot to Shadcn Figma Plugin

**Defined:** 2026-01-24
**Core Value:** Turn any UI screenshot into editable Figma designs with proper Shadcn components — fast and accurate.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Input

- [x] **INP-01**: User can paste screenshot via Cmd/Ctrl+V
- [x] **INP-02**: User can drag-and-drop image onto plugin window
- [x] **INP-03**: Plugin shows visual loading indicator during processing

### Analysis

- [ ] **ANL-01**: AI identifies UI elements (buttons, inputs, cards, text, containers)
- [ ] **ANL-02**: AI extracts exact colors from screenshot
- [ ] **ANL-03**: AI detects spacing and sizing (margins, padding, dimensions)
- [ ] **ANL-04**: AI identifies typography (font size, weight, color)

### Generation

- [ ] **GEN-01**: Plugin generates editable Figma frames/nodes (not rasterized)
- [ ] **GEN-02**: Elements map to appropriate Shadcn components
- [ ] **GEN-03**: AI detects component variants (primary/secondary/ghost button etc.)
- [ ] **GEN-04**: Output uses Figma Auto Layout for responsive layouts
- [ ] **GEN-05**: Layers have semantic names (e.g., "header-nav-button")
- [ ] **GEN-06**: Output has logical grouping hierarchy

### Configuration

- [x] **CFG-01**: User can enter Anthropic API key in settings
- [x] **CFG-02**: API key persists across sessions
- [x] **CFG-03**: Plugin shows clear error messages for API failures

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Input Enhancements

- **INP-04**: User can upload via file picker
- **INP-05**: User can select partial area of screenshot
- **INP-06**: User can process multiple screenshots in batch

### Analysis Enhancements

- **ANL-05**: Plugin shows confidence indicators for uncertain elements
- **ANL-06**: Plugin suggests alternative component mappings

### Generation Enhancements

- **GEN-07**: Plugin extracts repeated colors as design tokens
- **GEN-08**: Plugin generates style guide from screenshot

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Iterative AI adjustments ("make this bigger") | Scope creep; v1 is generate-and-done |
| Code export (React/Shadcn) | Different product category; dilutes focus |
| OpenAI/other AI providers | Claude-only for v1; can expand later |
| Custom component library linking | Breaks "just works" promise; bundle Shadcn |
| Account/authentication system | Unnecessary for BYOK; adds friction |
| Usage analytics/telemetry | Privacy concerns; user trust more valuable |
| Real-time chat/collaboration | Standard Figma handles this |
| Animation/interaction detection | Screenshots are static |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INP-01 | Phase 3 | Complete |
| INP-02 | Phase 3 | Complete |
| INP-03 | Phase 4 | Complete |
| ANL-01 | Phase 5 | Pending |
| ANL-02 | Phase 5 | Pending |
| ANL-03 | Phase 5 | Pending |
| ANL-04 | Phase 5 | Pending |
| GEN-01 | Phase 6 | Pending |
| GEN-02 | Phase 8 | Pending |
| GEN-03 | Phase 8 | Pending |
| GEN-04 | Phase 7 | Pending |
| GEN-05 | Phase 6 | Pending |
| GEN-06 | Phase 6 | Pending |
| CFG-01 | Phase 2 | Complete |
| CFG-02 | Phase 2 | Complete |
| CFG-03 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-25 after Phase 4 completion*
