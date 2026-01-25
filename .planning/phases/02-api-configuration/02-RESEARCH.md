# Phase 02: API Configuration - Research

**Researched:** 2026-01-25
**Domain:** Figma Plugin Storage & Settings UI
**Confidence:** HIGH

## Summary

This phase implements secure API key storage and management for the BYOK (Bring Your Own Key) model. The core technology is Figma's `figma.clientStorage` API, which provides plugin-specific persistent storage on the user's local machine.

The key architectural constraint is that `figma.clientStorage` is **only accessible from the main thread** (main.ts), not from the UI iframe. This means all storage operations must use the established message-passing pattern between the UI and main thread. The project already has this pattern implemented with correlation IDs for request/response tracking.

For the settings UI, the project uses React with Tailwind CSS and Shadcn-inspired design tokens. The API key input should follow password field conventions (masked by default with show/hide toggle).

**Primary recommendation:** Extend the existing message protocol to add storage request/response types, implement a simple Settings panel as a new view state, and use `figma.clientStorage` in main.ts to persist the API key.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `figma.clientStorage` | Figma API | Persistent key-value storage | Only official Figma storage API for plugins |
| React | 18.2.0 | UI framework | Already in project |
| Tailwind CSS | 3.4.0 | Styling | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.300.0 | Icons (Eye, EyeOff, Settings) | Already in project |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `figma.clientStorage` | `localStorage` | NOT AVAILABLE - Figma plugins run in sandboxed iframe |
| `figma.clientStorage` | `setPluginData` | Document-scoped, syncs to all users - NOT for secrets |
| Custom encryption | Plain storage | clientStorage is already plugin-isolated; encryption adds complexity without security benefit since code is inspectable |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── main.ts                    # Add storage message handlers
├── shared/
│   └── messages.ts            # Add storage-related message types
└── ui/
    ├── App.tsx                # Add view state for settings
    ├── components/
    │   └── Settings.tsx       # New: Settings panel with API key input
    └── hooks/
        └── useApiKey.ts       # New: Hook for API key state & operations
```

### Pattern 1: Message-Based Storage Access

**What:** UI requests storage operations via messages; main thread executes and responds
**When to use:** Always - this is the only way to access `figma.clientStorage` from UI

**Example:**
```typescript
// Source: Figma official docs + project's existing pattern

// In shared/messages.ts - add these types
export type UIMessage =
  | { type: 'UI_READY'; correlationId: string }
  // ... existing types ...
  | { type: 'REQUEST'; correlationId: string; action: 'GET_API_KEY' }
  | { type: 'REQUEST'; correlationId: string; action: 'SET_API_KEY'; payload: { key: string } }
  | { type: 'REQUEST'; correlationId: string; action: 'CLEAR_API_KEY' };

// In main.ts - handle storage requests
case 'GET_API_KEY':
  const apiKey = await figma.clientStorage.getAsync('anthropic_api_key');
  postToUI({
    type: 'RESPONSE',
    correlationId,
    payload: { apiKey: apiKey ?? null }
  });
  break;

case 'SET_API_KEY':
  await figma.clientStorage.setAsync('anthropic_api_key', payload.key);
  postToUI({
    type: 'RESPONSE',
    correlationId,
    payload: { success: true }
  });
  break;

case 'CLEAR_API_KEY':
  await figma.clientStorage.deleteAsync('anthropic_api_key');
  postToUI({
    type: 'RESPONSE',
    correlationId,
    payload: { success: true }
  });
  break;
```

### Pattern 2: Password Field with Show/Hide Toggle

**What:** API key input masked by default with visibility toggle
**When to use:** Always for sensitive inputs like API keys

**Example:**
```typescript
// Source: React community patterns (GeeksforGeeks, KindaCode)
const [showKey, setShowKey] = useState(false);

<input
  type={showKey ? 'text' : 'password'}
  value={apiKey}
  onChange={(e) => setApiKey(e.target.value)}
  placeholder="sk-ant-api03-..."
/>
<button onClick={() => setShowKey(!showKey)}>
  {showKey ? <EyeOff /> : <Eye />}
</button>
```

### Pattern 3: Hook for Storage Operations

**What:** Custom hook encapsulating API key state and storage operations
**When to use:** To keep Settings component clean and testable

**Example:**
```typescript
// useApiKey.ts
export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load on mount
  useEffect(() => {
    requestFromPlugin('GET_API_KEY')
      .then((res) => setApiKey(res.apiKey))
      .finally(() => setIsLoading(false));
  }, []);

  const saveApiKey = async (key: string) => {
    setIsSaving(true);
    await requestFromPlugin('SET_API_KEY', { key });
    setApiKey(key);
    setIsSaving(false);
  };

  const clearApiKey = async () => {
    await requestFromPlugin('CLEAR_API_KEY');
    setApiKey(null);
  };

  return { apiKey, isLoading, isSaving, saveApiKey, clearApiKey };
}
```

### Anti-Patterns to Avoid

- **Direct localStorage access:** Will fail silently or throw in Figma plugin iframe
- **Storing in document with setPluginData:** Exposes key to all file collaborators
- **Encrypting the key:** Code is inspectable; encryption provides false security
- **Storing partial key + completing elsewhere:** Overcomplication for no benefit

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin storage | Custom IndexedDB wrapper | `figma.clientStorage` | Only official API that works in Figma sandbox |
| Key format validation | Complex regex | Simple prefix check | Anthropic keys start with `sk-ant-`; just validate prefix exists |
| Form state management | Custom state machine | React useState + simple validation | Small form, complexity not warranted |

**Key insight:** The Figma plugin environment is heavily sandboxed. Standard browser APIs like localStorage, cookies, and IndexedDB are not available. `figma.clientStorage` is the only option for persistent storage.

## Common Pitfalls

### Pitfall 1: Calling clientStorage from UI Thread

**What goes wrong:** Code silently fails or throws "figma is not defined"
**Why it happens:** `figma` global is only available in main.ts (sandbox thread), not in UI iframe
**How to avoid:** Always use message passing; UI sends REQUEST, main.ts accesses storage, responds
**Warning signs:** "figma is not defined" error, undefined values when you expect data

### Pitfall 2: Not Handling Storage Clearing

**What goes wrong:** User clears browser cache, API key disappears, plugin crashes
**Why it happens:** clientStorage uses browser storage, which users can clear
**How to avoid:** Always handle `undefined` return from getAsync; show settings prompt when no key
**Warning signs:** TypeError on undefined when trying to use stored key

### Pitfall 3: Blocking UI on Storage Operations

**What goes wrong:** UI freezes or shows stale data
**Why it happens:** Storage operations are async; not showing loading states
**How to avoid:** Track loading/saving states; show skeleton or disabled state during operations
**Warning signs:** UI shows "null" or "undefined" briefly, buttons appear to do nothing

### Pitfall 4: Exposing Full API Key in UI

**What goes wrong:** Key visible to shoulder-surfers, screenshots expose it
**Why it happens:** Showing full key in text input without masking
**How to avoid:** Use password input type by default; show only last 4 chars when displaying
**Warning signs:** Full API key visible on screen

### Pitfall 5: Over-Engineering Key Validation

**What goes wrong:** Valid keys rejected, or invalid keys accepted for wrong reasons
**Why it happens:** Trying to fully validate key format without knowing Anthropic's exact spec
**How to avoid:** Check prefix `sk-ant-` and minimum length (~50 chars); let API call validate fully
**Warning signs:** Users report "my key works elsewhere but not here"

## Code Examples

### clientStorage Basic Operations

```typescript
// Source: Figma Developer Docs - figma.clientStorage

// Store a value
await figma.clientStorage.setAsync('anthropic_api_key', 'sk-ant-api03-xxxxx');

// Retrieve a value (returns undefined if not set)
const key = await figma.clientStorage.getAsync('anthropic_api_key');
if (key === undefined) {
  // Key not set, show settings
}

// Delete a value
await figma.clientStorage.deleteAsync('anthropic_api_key');

// List all keys (useful for debugging)
const keys = await figma.clientStorage.keysAsync();
// keys: ['anthropic_api_key', ...]
```

### Settings Component Structure

```typescript
// Source: Project patterns + community best practices

export function Settings() {
  const { apiKey, isLoading, isSaving, saveApiKey, clearApiKey } = useApiKey();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Sync input with stored key on load
  useEffect(() => {
    if (apiKey) setInputValue(apiKey);
  }, [apiKey]);

  const handleSave = async () => {
    if (!inputValue.startsWith('sk-ant-')) {
      // Show error
      return;
    }
    await saveApiKey(inputValue);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium">
        Anthropic API Key
      </label>
      <div className="flex gap-2">
        <input
          type={showKey ? 'text' : 'password'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="sk-ant-api03-..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button onClick={() => setShowKey(!showKey)}>
          {showKey ? <EyeOff /> : <Eye />}
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        {apiKey && (
          <button onClick={clearApiKey}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
```

### API Key Validation

```typescript
// Source: Anthropic API docs - keys start with sk-ant-

function isValidApiKeyFormat(key: string): boolean {
  // Anthropic keys start with sk-ant- and are typically 100+ chars
  return key.startsWith('sk-ant-') && key.length >= 50;
}

function maskApiKey(key: string): string {
  // Show only last 4 characters
  if (key.length <= 8) return '****';
  return '****' + key.slice(-4);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| localStorage in plugins | figma.clientStorage | Always required | localStorage never worked in Figma |
| Sync key with document | Client-only storage | Security best practice | Prevents key exposure to collaborators |

**Deprecated/outdated:**
- None for this domain; `figma.clientStorage` API has been stable

## Open Questions

1. **Exact Anthropic key format validation**
   - What we know: Keys start with `sk-ant-api03-` based on documentation hints
   - What's unclear: Full regex/validation spec for key format
   - Recommendation: Validate prefix and length; rely on API error for full validation

2. **Sync across Figma desktop vs web**
   - What we know: clientStorage is "local machine" based
   - What's unclear: Whether same user sees same keys in desktop app vs browser
   - Recommendation: Warn user they may need to re-enter key on different devices

## Sources

### Primary (HIGH confidence)
- [Figma Developer Docs - figma.clientStorage](https://developers.figma.com/docs/plugins/api/figma-clientStorage/) - API methods, limits, behavior
- [Anthropic API Docs](https://platform.claude.com/docs/en/api/getting-started) - Authentication requirements

### Secondary (MEDIUM confidence)
- [Figma Forum - localStorage in plugins](https://forum.figma.com/ask-the-community-7/how-can-i-use-localstorage-in-a-plugin-20364) - Confirmed localStorage unavailable
- [design-lint plugin source](https://github.com/destefanis/design-lint/blob/master/src/plugin/controller.ts) - Real-world clientStorage patterns

### Tertiary (LOW confidence)
- [realvjy clientStorage article](https://story.vjy.me/making-figma-plugins-more-powerful-with-clientstorage-40) - Wrapper class patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Figma API, well-documented
- Architecture: HIGH - Follows project's existing message-passing pattern
- Pitfalls: HIGH - Based on official docs + forum discussions

**Research date:** 2026-01-25
**Valid until:** 60 days (Figma clientStorage API is stable)
