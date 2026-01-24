# Architecture Patterns

**Domain:** Figma Plugin with AI/External API Integration
**Researched:** 2026-01-24
**Confidence:** MEDIUM (based on stable Figma Plugin API patterns; external search unavailable for latest updates)

## Executive Summary

Figma plugins with external API integrations follow a mandatory dual-thread architecture imposed by Figma's security model. The plugin runs in two isolated contexts: a **main thread** (sandbox) with Figma API access, and a **UI thread** (iframe) with browser capabilities including network access. This separation is fundamental and cannot be bypassed.

For this screenshot-to-Figma plugin, the architecture must handle:
1. Image input (paste/upload) in the UI thread
2. API calls to Claude in the UI thread (CORS-enabled)
3. Message passing between threads
4. Figma node creation in the main thread
5. Component library bundling

## Recommended Architecture

```
+----------------------------------------------------------+
|                     FIGMA APPLICATION                     |
+----------------------------------------------------------+
|                                                          |
|  +----------------------+     +------------------------+ |
|  |    MAIN THREAD       |     |      UI THREAD         | |
|  |    (Sandbox)         |     |      (iframe)          | |
|  |                      |     |                        | |
|  | - Figma Plugin API   |<--->| - User Interface       | |
|  | - Node creation      | msg | - Image handling       | |
|  | - Component library  |     | - Claude API calls     | |
|  | - Canvas manipulation|     | - Settings/API key     | |
|  | - Selection handling |     | - Progress feedback    | |
|  +----------------------+     +------------------------+ |
|           |                            |                 |
+-----------|----------------------------|------------------+
            |                            |
            v                            v
    [Figma Document]            [External Network]
                                        |
                                        v
                              [Anthropic Claude API]
```

### Thread Responsibilities

| Thread | Can Do | Cannot Do |
|--------|--------|-----------|
| **Main Thread (Sandbox)** | Access Figma API, create/modify nodes, read selection, access document | Make network requests, access DOM, use most browser APIs |
| **UI Thread (iframe)** | Render UI, handle user input, make fetch requests, store data (localStorage equivalent) | Access Figma API directly, manipulate canvas |

### Component Boundaries

| Component | Location | Responsibility | Communicates With |
|-----------|----------|----------------|-------------------|
| **Plugin Controller** | Main Thread | Orchestrates plugin lifecycle, routes messages | UI Thread (via postMessage) |
| **Figma Generator** | Main Thread | Creates Figma nodes from structured data | Plugin Controller |
| **Component Library** | Main Thread | Provides Shadcn component templates/instances | Figma Generator |
| **UI Shell** | UI Thread | Renders plugin interface, handles user input | Plugin Controller (via postMessage) |
| **Image Handler** | UI Thread | Processes uploaded/pasted images, converts to base64 | UI Shell, Claude Client |
| **Claude Client** | UI Thread | Makes API calls to Claude, handles responses | Image Handler, UI Shell |
| **Settings Manager** | UI Thread | Manages API key storage, user preferences | UI Shell |

## Data Flow

### Primary Flow: Screenshot to Figma Design

```
1. USER INPUT (UI Thread)
   User pastes/uploads screenshot
        |
        v
2. IMAGE PROCESSING (UI Thread)
   Image Handler converts to base64
   Validates format/size
        |
        v
3. AI ANALYSIS (UI Thread)
   Claude Client sends image to Anthropic API
   Receives structured JSON response
        |
        v
4. MESSAGE PASSING (Cross-Thread)
   UI Thread posts message with parsed structure
   Main Thread receives design specification
        |
        v
5. FIGMA GENERATION (Main Thread)
   Figma Generator interprets specification
   Component Library provides templates
   Nodes created on canvas
        |
        v
6. COMPLETION (Cross-Thread)
   Main Thread posts completion status
   UI Thread updates interface
```

### Message Protocol

Messages between threads must be serializable (no functions, no circular references).

```typescript
// UI -> Main: Request design generation
{
  type: 'GENERATE_DESIGN',
  payload: {
    elements: [...],      // Parsed from Claude response
    styles: {...},        // Colors, spacing, typography
    layout: {...}         // Structure/hierarchy
  }
}

// Main -> UI: Progress update
{
  type: 'PROGRESS',
  payload: {
    step: 'creating_frame',
    current: 3,
    total: 15
  }
}

// Main -> UI: Completion
{
  type: 'COMPLETE',
  payload: {
    nodeId: '123:456',
    success: true
  }
}

// Main -> UI: Error
{
  type: 'ERROR',
  payload: {
    code: 'GENERATION_FAILED',
    message: 'Could not create button component'
  }
}
```

## Patterns to Follow

### Pattern 1: Message Bus Architecture

**What:** Centralized message handling with typed messages and clear routing
**When:** Always for Figma plugins with UI
**Why:** Prevents spaghetti postMessage calls, enables debugging, enforces type safety

```typescript
// shared/messages.ts
type MessageType =
  | { type: 'GENERATE_DESIGN'; payload: DesignSpec }
  | { type: 'PROGRESS'; payload: ProgressInfo }
  | { type: 'COMPLETE'; payload: CompletionInfo }
  | { type: 'ERROR'; payload: ErrorInfo }
  | { type: 'SAVE_SETTINGS'; payload: Settings }
  | { type: 'GET_SETTINGS'; payload: null };

// main/controller.ts
figma.ui.onmessage = (msg: MessageType) => {
  switch (msg.type) {
    case 'GENERATE_DESIGN':
      handleGeneration(msg.payload);
      break;
    // ...
  }
};

// ui/App.tsx
const sendMessage = (msg: MessageType) => {
  parent.postMessage({ pluginMessage: msg }, '*');
};
```

### Pattern 2: Layered Generation

**What:** Separate parsing, planning, and execution phases for Figma generation
**When:** Complex node creation from external data
**Why:** Enables validation, error recovery, and progress reporting

```typescript
// Step 1: Parse AI response into intermediate representation
const designSpec = parseClaudeResponse(aiResponse);

// Step 2: Plan node creation (validate, calculate positions)
const creationPlan = planNodeCreation(designSpec);

// Step 3: Execute with progress callbacks
await executeCreation(creationPlan, (progress) => {
  figma.ui.postMessage({ type: 'PROGRESS', payload: progress });
});
```

### Pattern 3: Component Library as Data

**What:** Define Shadcn components as JSON specifications, not hardcoded creation logic
**When:** Bundling a design system
**Why:** Easier to maintain, update, and extend; separates component definition from Figma API calls

```typescript
// components/button.json
{
  "name": "Button",
  "variants": ["default", "destructive", "outline", "secondary", "ghost", "link"],
  "sizes": ["default", "sm", "lg", "icon"],
  "structure": {
    "type": "FRAME",
    "layoutMode": "HORIZONTAL",
    "children": [
      { "type": "TEXT", "characters": "{{label}}" }
    ]
  },
  "styles": {
    "default": {
      "fills": [{ "type": "SOLID", "color": { "r": 0.09, "g": 0.09, "b": 0.09 } }],
      "cornerRadius": 6,
      "paddingLeft": 16,
      "paddingRight": 16,
      "paddingTop": 8,
      "paddingBottom": 8
    }
  }
}

// generator/component-factory.ts
function createComponent(spec: ComponentSpec, props: Props): FrameNode {
  // Generic creation logic based on spec
}
```

### Pattern 4: Secure API Key Handling

**What:** Store API key in Figma's clientStorage, never send to main thread
**When:** BYOK model plugins
**Why:** clientStorage persists per-user, key never leaves UI thread (where API calls happen anyway)

```typescript
// ui/settings.ts
const STORAGE_KEY = 'anthropic_api_key';

export async function saveApiKey(key: string): Promise<void> {
  // Validate key format before saving
  if (!key.startsWith('sk-ant-')) {
    throw new Error('Invalid Anthropic API key format');
  }
  await figma.clientStorage.setAsync(STORAGE_KEY, key);
}

export async function getApiKey(): Promise<string | null> {
  return await figma.clientStorage.getAsync(STORAGE_KEY);
}
```

**Note:** clientStorage is accessed via messages to main thread, but key usage happens in UI thread for API calls.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Figma API Access Attempts from UI

**What:** Trying to access `figma.*` from the UI thread
**Why bad:** Will fail silently or throw errors; Figma API only available in main thread
**Instead:** Always use message passing for Figma operations

### Anti-Pattern 2: Large Payloads in Messages

**What:** Sending entire images or huge JSON blobs between threads
**Why bad:** Message passing has size limits; large payloads cause performance issues
**Instead:** Process images in UI thread, send only structured results to main thread

```typescript
// BAD: Sending raw image
postMessage({ type: 'PROCESS_IMAGE', payload: { imageData: hugeBase64String } });

// GOOD: Process in UI, send results
const analysis = await analyzeWithClaude(image);
postMessage({ type: 'GENERATE_DESIGN', payload: analysis });
```

### Anti-Pattern 3: Synchronous Heavy Operations

**What:** Blocking the main thread with large node creation loops
**Why bad:** Freezes Figma UI, may trigger timeout warnings
**Instead:** Batch operations, yield to event loop, report progress

```typescript
// BAD
for (const element of elements) {
  createNode(element); // 1000 iterations = frozen UI
}

// GOOD
async function createWithYield(elements: Element[]) {
  for (let i = 0; i < elements.length; i++) {
    createNode(elements[i]);
    if (i % 10 === 0) {
      figma.ui.postMessage({ type: 'PROGRESS', payload: { current: i, total: elements.length } });
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield
    }
  }
}
```

### Anti-Pattern 4: Monolithic AI Prompt

**What:** Single prompt asking Claude to return complete Figma node structure
**Why bad:** Brittle, hard to debug, AI may produce invalid structures
**Instead:** Structured extraction prompts with validation

```typescript
// BAD: "Return a complete Figma plugin node tree JSON"

// GOOD: Structured extraction
const prompt = `Analyze this UI screenshot and return JSON with:
1. elements: Array of UI components identified (type, bounds, text content)
2. colors: Object mapping element IDs to their colors (hex values)
3. typography: Object mapping text elements to font properties
4. layout: Hierarchy of containers and their children

Return ONLY valid JSON matching this schema: ${SCHEMA}`;
```

## File Structure

Recommended project organization:

```
figma-plugin/
├── manifest.json              # Plugin manifest
├── package.json
├── tsconfig.json
├── webpack.config.js          # Bundles UI and main separately
│
├── src/
│   ├── main/                  # Main thread code
│   │   ├── index.ts           # Plugin entry, message router
│   │   ├── controller.ts      # Orchestration logic
│   │   ├── generator/
│   │   │   ├── index.ts       # Figma node generation
│   │   │   ├── frames.ts      # Frame/layout creation
│   │   │   ├── text.ts        # Text node creation
│   │   │   └── styles.ts      # Style application
│   │   └── components/
│   │       ├── library.ts     # Component library manager
│   │       └── definitions/   # Shadcn component specs (JSON)
│   │
│   ├── ui/                    # UI thread code
│   │   ├── index.html         # Plugin UI shell
│   │   ├── index.tsx          # React entry
│   │   ├── App.tsx            # Main UI component
│   │   ├── components/        # UI components
│   │   ├── hooks/
│   │   │   ├── useMessages.ts # Message bus hook
│   │   │   └── useSettings.ts # Settings management
│   │   ├── services/
│   │   │   ├── claude.ts      # Claude API client
│   │   │   └── image.ts       # Image processing
│   │   └── styles/
│   │
│   └── shared/                # Shared between threads
│       ├── messages.ts        # Message type definitions
│       ├── types.ts           # Shared type definitions
│       └── constants.ts       # Shared constants
│
└── components/                # Shadcn component definitions
    ├── button.json
    ├── input.json
    ├── card.json
    └── ...
```

## Build Order / Dependencies

Understanding dependencies is critical for phased implementation.

### Dependency Graph

```
                    ┌─────────────────┐
                    │ Message Protocol │ (Define first - shared contract)
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              v              v              v
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │ UI Shell   │  │ Main Entry │  │ Type Defs  │
     │ (React)    │  │ (Router)   │  │ (Shared)   │
     └─────┬──────┘  └─────┬──────┘  └────────────┘
           │               │
           v               v
   ┌───────────────┐ ┌───────────────┐
   │ Image Handler │ │ Basic Generator│
   │ (UI)          │ │ (Main)        │
   └───────┬───────┘ └───────┬───────┘
           │                 │
           v                 v
   ┌───────────────┐ ┌───────────────┐
   │ Claude Client │ │ Component Lib │
   │ (UI)          │ │ (Main)        │
   └───────┬───────┘ └───────┬───────┘
           │                 │
           └────────┬────────┘
                    │
                    v
           ┌───────────────┐
           │ Integration   │
           │ (End-to-end)  │
           └───────────────┘
```

### Suggested Build Order

**Phase 1: Foundation (No dependencies)**
1. Project scaffolding (manifest, webpack, tsconfig)
2. Message protocol types (shared contract)
3. Basic main thread entry (receives messages, logs)
4. Basic UI shell (sends test messages)
5. **Validation:** UI sends message, main logs it

**Phase 2: UI Capabilities (Depends on Phase 1)**
1. Image upload/paste handling
2. Settings UI + clientStorage
3. Claude API client (with API key)
4. **Validation:** Can upload image, call Claude, see response

**Phase 3: Generation Core (Depends on Phase 1)**
1. Basic Figma node creation (frames, text)
2. Style application utilities
3. Layout/positioning logic
4. **Validation:** Can create basic layouts from hardcoded data

**Phase 4: Component Library (Depends on Phase 3)**
1. Shadcn component specifications (JSON)
2. Component factory (spec -> Figma nodes)
3. Full component catalog
4. **Validation:** Can create any Shadcn component from spec

**Phase 5: Integration (Depends on Phases 2 + 4)**
1. AI response parsing into design spec
2. Design spec to component mapping
3. End-to-end flow connection
4. Error handling and progress reporting
5. **Validation:** Full screenshot-to-design flow works

**Phase 6: Polish (Depends on Phase 5)**
1. Pixel accuracy improvements
2. Edge case handling
3. Performance optimization
4. User feedback/error messages

## Scalability Considerations

| Concern | Current (MVP) | Future |
|---------|---------------|--------|
| **Image size** | Limit to 4MB, resize if needed | Client-side compression |
| **Complex layouts** | Single-level nesting | Recursive layout detection |
| **Component library** | Core Shadcn (~15 components) | Full Shadcn + custom |
| **API costs** | User's key, their cost | Optional caching layer |
| **Generation speed** | Sequential creation | Batch operations |

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| **API key exposure** | Never log, never send to main thread, validate format |
| **Image data** | Process locally, send to Claude directly (user's key) |
| **Plugin permissions** | Request minimal scopes in manifest |
| **Third-party code** | Bundle dependencies, no runtime CDN loads |

## Sources

- Figma Plugin API documentation (stable architecture since 2019)
- Training data on Figma plugin patterns (MEDIUM confidence - verify current API features)
- Anthropic Claude API documentation (for vision endpoint patterns)

**Note:** WebSearch and WebFetch were unavailable during research. Architecture patterns are based on stable Figma Plugin API architecture which has remained consistent. Recommend verifying current Figma Plugin API docs for any recent additions before implementation.

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Dual-thread architecture | HIGH | Fundamental to Figma plugins, hasn't changed |
| Message passing patterns | HIGH | Standard pattern, well-documented |
| Network from UI thread | HIGH | Standard capability, required for external APIs |
| Component library approach | MEDIUM | Pattern is sound, specific implementation needs validation |
| Shadcn mapping | MEDIUM | Concept is clear, details need phase-specific research |
| clientStorage API | MEDIUM | API exists, verify current usage patterns |
