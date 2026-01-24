# Screenshot to Shadcn Figma Plugin

## What This Is

A public Figma plugin that converts any UI screenshot into an editable Figma design using Shadcn components. Users upload an image, Claude vision analyzes it, and the plugin generates a pixel-accurate recreation using bundled Shadcn components.

## Core Value

Turn any UI screenshot into editable Figma designs with proper Shadcn components — fast and accurate.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can upload/paste a screenshot into the plugin
- [ ] Plugin sends image to Claude vision API for analysis
- [ ] AI identifies UI elements (buttons, inputs, cards, layouts, etc.)
- [ ] AI extracts visual properties (colors, spacing, sizing, typography)
- [ ] Plugin generates Figma design using bundled Shadcn components
- [ ] Output closely matches original screenshot (pixel-accurate fidelity)
- [ ] User can enter their Anthropic API key in plugin settings
- [ ] API key persists across sessions
- [ ] Shadcn component library bundled with plugin

### Out of Scope

- Iterative AI adjustments ("make this bigger") — v1 is generate-and-done
- Code export (React/Shadcn code generation) — future consideration
- OpenAI/other AI providers — Claude only for v1
- Users linking their own component libraries — plugin bundles components
- Real-time collaboration features — standard Figma handles this

## Context

- Figma plugins run in a sandboxed iframe with access to Figma's Plugin API
- Claude vision API can analyze images and return structured JSON
- Shadcn is a popular React component library with a consistent design system (specific colors, border radii, spacing tokens)
- The plugin needs to map AI-identified elements to the appropriate Shadcn components and apply accurate styling

## Constraints

- **Platform**: Figma Plugin API — must work within Figma's plugin sandbox
- **AI Provider**: Anthropic Claude — users provide their own API key (BYOK model)
- **Components**: Bundled Shadcn component library — self-contained, no external dependencies for users
- **Fidelity**: Pixel-accurate output — not just "right components" but accurate colors, spacing, sizing

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| BYOK API model | No backend to manage, users pay own AI costs, simpler architecture | — Pending |
| Bundle Shadcn components | Self-contained plugin, users don't need to set anything up | — Pending |
| Claude only (no OpenAI) | Focused scope for v1, can expand later | — Pending |
| Pixel-accurate fidelity | Higher quality output justifies the effort, differentiates from rough converters | — Pending |

---
*Last updated: 2025-01-24 after initialization*
