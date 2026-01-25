# Phase 5: AI Analysis - Context

**Gathered:** 2026-01-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Claude analyzes screenshots and returns structured JSON describing UI elements with their Shadcn component mappings, positions, and styling. This phase handles prompt engineering and response validation — Figma node generation happens in Phase 6+.

</domain>

<decisions>
## Implementation Decisions

### Shadcn Component Mapping
- Claude outputs direct Shadcn component names and variants (not generic properties)
- Example: `{type: 'Button', variant: 'outline', size: 'sm'}` — ready for generation
- All Shadcn components (~40+) should be recognized for maximum coverage
- Layout containers map to Shadcn layout components where they exist (Card, Sheet, Sidebar, etc.)

### Confidence Handling
- Skip uncertain elements entirely — only include confident Shadcn matches
- No generic fallbacks or low-confidence flags
- Better to have fewer accurate components than many questionable ones

### Claude's Discretion
- JSON schema structure and nesting approach
- Exact color/spacing extraction precision
- How to handle elements that span multiple Shadcn components

</decisions>

<specifics>
## Specific Ideas

- Direct Shadcn mapping means Phase 8 (Component Mapping) may become simpler or merge with this phase
- "All Shadcn" coverage means the prompt needs comprehensive component awareness

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-ai-analysis*
*Context gathered: 2026-01-25*
