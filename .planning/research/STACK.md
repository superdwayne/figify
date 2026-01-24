# Technology Stack

**Project:** Screenshot to Shadcn Figma Plugin
**Researched:** 2026-01-24
**Overall Confidence:** MEDIUM (based on training data - external verification tools unavailable)

## Executive Summary

This stack recommendation is built for a Figma plugin that uses Claude vision to convert screenshots to Figma designs. The architecture has two distinct runtime environments: the **plugin sandbox** (limited browser APIs, no network access) and the **plugin UI** (iframe with full browser capabilities). Understanding this split is critical for correct implementation.

---

## Recommended Stack

### Build System & Bundler

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Vite** | ^5.x | Build tool & bundler | Fast HMR, excellent TypeScript support, handles dual-output builds (main + ui). Figma community has largely moved to Vite from webpack. ESBuild under the hood is fast. | HIGH |
| **TypeScript** | ^5.3+ | Type safety | Figma Plugin API has excellent TypeScript types. Non-negotiable for a plugin of this complexity. | HIGH |

**Why NOT webpack:** Slower builds, more configuration overhead. Vite is the modern standard.

**Why NOT esbuild directly:** Works but lacks Vite's dev experience and plugin ecosystem.

### Plugin Runtime

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@figma/plugin-typings** | ^1.x | Figma API types | Official types for the Figma Plugin API. Required for TypeScript development. | HIGH |

**Architecture Note:** Figma plugins have TWO runtimes:
1. **Main thread (sandbox):** Runs in a restricted environment. Has `figma.*` API access. NO network access, NO DOM.
2. **UI thread (iframe):** Standard browser environment. Has DOM, can make network requests. Communicates with main via `postMessage`.

The Claude API calls MUST happen in the UI thread. Figma node manipulation MUST happen in the main thread.

### UI Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **React** | ^18.x | UI framework | Standard for Figma plugin UIs. Good component model for settings panels, loading states, error handling. | HIGH |
| **@figma/plugin-ds** (optional) | — | UI components | Official Figma design system components for plugin UIs. Use for settings panel to match Figma's native look. | MEDIUM |

**Why React over vanilla JS:** Plugin has meaningful UI (image upload, settings, progress indicators). React's component model and state management are worth the bundle size.

**Why NOT Svelte/Vue:** Less ecosystem support for Figma plugins. React is the de facto standard.

### AI Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **@anthropic-ai/sdk** | ^0.30+ | Claude API client | Official SDK with TypeScript support. Handles streaming, retries, types. | MEDIUM |

**BYOK Implementation:**
- Store API key using `figma.clientStorage.setAsync()` (persists across sessions)
- API key entered via plugin UI, stored in client storage, passed to SDK on each request
- Never expose key in code or logs

**Vision API Usage:**
```typescript
// Pseudocode for vision call
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: base64ImageData,
        },
      },
      {
        type: "text",
        text: "Analyze this UI screenshot and return structured JSON..."
      }
    ],
  }],
});
```

**Model Selection:**
- Use `claude-sonnet-4-20250514` for vision tasks (best balance of quality/cost/speed for image analysis)
- claude-sonnet-4-20250514 has excellent vision capabilities and is more cost-effective than Opus for this use case

### Image Handling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **Canvas API** | Browser native | Image processing | Convert uploaded images to base64, resize if needed. No external library needed. | HIGH |
| **FileReader API** | Browser native | File handling | Read dropped/pasted images. Standard browser API. | HIGH |

**Image Pipeline:**
1. User drops/pastes image in UI iframe
2. FileReader converts to base64
3. Canvas resizes if > 4MB (Claude limit)
4. Base64 sent to Claude vision API
5. Structured response parsed and sent to main thread

### Styling (Plugin UI)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **CSS Modules** or **Tailwind CSS** | ^3.4+ | UI styling | Keep bundle small. CSS Modules for simplicity, Tailwind if you want utility classes. | MEDIUM |

**Why NOT heavy CSS-in-JS:** Bundle size matters in plugins. styled-components/emotion add unnecessary weight.

---

## Shadcn Component System (Output Side)

This is what the plugin GENERATES, not what it uses internally.

### Component Library Architecture

| Approach | Description | Recommended |
|----------|-------------|-------------|
| **JSON Component Definitions** | Bundle component specs as JSON (dimensions, colors, variants, structure) | YES |
| **Figma Component Library** | Pre-built Figma components that plugin references | NO (requires user setup) |
| **Code-based generation** | Generate Figma nodes from scratch | PARTIAL (hybrid approach) |

**Recommended Approach:**

Bundle a JSON manifest describing each Shadcn component:
```typescript
// Example component definition
{
  "button": {
    "variants": {
      "default": {
        "background": "#18181B",
        "foreground": "#FAFAFA",
        "borderRadius": 6,
        "paddingX": 16,
        "paddingY": 8,
        "fontSize": 14,
        "fontWeight": 500
      },
      "outline": { ... },
      "ghost": { ... }
    },
    "sizes": {
      "sm": { "height": 32, "paddingX": 12, "fontSize": 12 },
      "default": { "height": 40, "paddingX": 16, "fontSize": 14 },
      "lg": { "height": 48, "paddingX": 24, "fontSize": 16 }
    }
  }
}
```

**Why JSON manifest:**
- Self-contained (no external dependencies)
- Easy to update/version
- Claude can reference the manifest in prompts for accurate component selection
- Plugin generates Figma nodes using these specs

### Figma Node Generation

| API | Purpose | Notes |
|-----|---------|-------|
| `figma.createFrame()` | Layout containers | Use for cards, sections, wrappers |
| `figma.createRectangle()` | Backgrounds, shapes | Buttons, inputs backgrounds |
| `figma.createText()` | Text elements | Labels, headings, body text |
| `figma.createComponent()` | Reusable components | Optional: create as components for reuse |
| Auto Layout | Responsive layouts | `layoutMode`, `itemSpacing`, `padding` |

---

## Development Dependencies

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| **vite** | ^5.x | Build tool | HIGH |
| **@vitejs/plugin-react** | ^4.x | React support for Vite | HIGH |
| **typescript** | ^5.3+ | Type checking | HIGH |
| **@figma/plugin-typings** | ^1.x | Figma API types | HIGH |
| **@types/react** | ^18.x | React types | HIGH |
| **@types/react-dom** | ^18.x | React DOM types | HIGH |
| **vite-plugin-singlefile** | ^2.x | Inline all assets for Figma | HIGH |

### Optional but Recommended

| Package | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| **zod** | ^3.x | Runtime validation for Claude responses | HIGH |
| **prettier** | ^3.x | Code formatting | HIGH |
| **eslint** | ^9.x | Linting | MEDIUM |

---

## Project Structure

```
figma-plugin/
├── manifest.json              # Figma plugin manifest
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts               # Plugin sandbox (Figma API access)
│   ├── ui/
│   │   ├── App.tsx           # React UI root
│   │   ├── index.html        # UI entry point
│   │   ├── index.tsx         # React mount
│   │   ├── components/       # UI components (settings, upload, etc.)
│   │   └── styles/           # CSS modules or Tailwind
│   ├── lib/
│   │   ├── claude.ts         # Claude API wrapper
│   │   ├── figma-generator.ts # Figma node generation logic
│   │   ├── message-types.ts  # postMessage type definitions
│   │   └── shadcn-manifest.ts # Component definitions
│   └── data/
│       └── shadcn-components.json  # Component spec manifest
└── dist/                     # Build output
    ├── main.js               # Compiled sandbox code
    └── ui.html               # Compiled UI (inlined)
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Bundler | Vite | webpack | Slower, more config |
| Bundler | Vite | esbuild | Less dev experience |
| UI Framework | React | Svelte | Less Figma ecosystem support |
| UI Framework | React | Vanilla JS | Too complex for this UI |
| AI SDK | @anthropic-ai/sdk | fetch() | Loses types, retry logic, streaming |
| Styling | CSS Modules | styled-components | Bundle size |

---

## Installation

```bash
# Initialize project
npm init -y

# Core dependencies
npm install react react-dom @anthropic-ai/sdk

# Dev dependencies
npm install -D vite @vitejs/plugin-react typescript \
  @figma/plugin-typings @types/react @types/react-dom \
  vite-plugin-singlefile zod

# Optional
npm install -D prettier eslint
```

---

## Key Configuration Files

### manifest.json (Figma Plugin Manifest)

```json
{
  "name": "Screenshot to Shadcn",
  "id": "your-plugin-id",
  "api": "1.0.0",
  "main": "dist/main.js",
  "ui": "dist/ui.html",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"]
}
```

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        ui: path.resolve(__dirname, 'src/ui/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
});
```

**Note:** Main thread code needs separate build config or a dual-build setup.

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Build system (Vite) | HIGH | Well-established in Figma plugin community |
| TypeScript setup | HIGH | Standard, well-documented |
| React for UI | HIGH | De facto standard for Figma plugins |
| Anthropic SDK | MEDIUM | Version number unverified (based on training data) |
| Figma Plugin API | HIGH | Stable, well-documented API |
| Shadcn manifest approach | MEDIUM | Novel approach, but architecturally sound |
| vite-plugin-singlefile | MEDIUM | Package exists, version unverified |

---

## Verification Needed

Before implementation, verify current versions:

1. **@anthropic-ai/sdk** - Check npm for latest version
2. **vite** - Confirm v5 is current stable
3. **vite-plugin-singlefile** - Verify package name and compatibility
4. **@figma/plugin-typings** - Check for latest version

---

## Sources

- Figma Plugin API documentation (figma.com/plugin-docs)
- Anthropic Claude API documentation (docs.anthropic.com)
- Training data knowledge (May 2025 cutoff) - versions may be outdated

**NOTE:** External verification tools were unavailable during this research. Version numbers are based on training data and should be verified before implementation.
