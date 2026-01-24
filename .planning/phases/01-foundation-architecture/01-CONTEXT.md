# Phase 1: Foundation & Architecture - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish Figma's dual-thread architecture with typed message passing between sandbox and UI iframe. Plugin loads, threads communicate, UI renders React shell, TypeScript compiles strict, bundle is valid.

</domain>

<decisions>
## Implementation Decisions

### Message Protocol Design
- Async request/response pattern with correlation IDs — send message, await typed response like RPC calls between threads
- Large data handling, message typing strictness, and versioning at Claude's discretion based on Figma constraints

### UI Shell & Layout
- Shadcn-styled visual design — use Shadcn components in the plugin UI itself (dogfooding the design system)
- Single-page flow — all states visible in one view (upload area, preview, results)
- Settings location at Claude's discretion based on Figma plugin patterns
- Window size at Claude's discretion based on workflow needs

### Build & Dev Experience
- Package manager: pnpm
- Build tool at Claude's discretion based on Figma plugin requirements
- Hot reload importance at Claude's discretion
- Linting/formatting setup at Claude's discretion

### Claude's Discretion
- Message typing strictness (strict unions vs loose with validation)
- Large data payload handling (inline vs reference-based)
- Protocol versioning approach
- Plugin window dimensions
- Settings panel design (slide-out, separate screen, or inline)
- Build tool selection (Vite, esbuild, Webpack)
- Hot reload priority
- Linting/formatting level (strict, minimal, or deferred)

</decisions>

<specifics>
## Specific Ideas

- Shadcn components used in plugin UI itself — practicing what we preach
- Single unified view for the workflow rather than navigating between screens

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-architecture*
*Context gathered: 2026-01-24*
