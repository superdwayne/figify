# Phase 4: Claude Integration - Research

**Researched:** 2026-01-25
**Domain:** Claude Vision API integration for browser-based Figma plugin
**Confidence:** HIGH

## Summary

This phase integrates Claude's vision API into the Figma plugin UI thread to analyze screenshots. The official `@anthropic-ai/sdk` TypeScript SDK supports direct browser usage via the `dangerouslyAllowBrowser: true` option, which enables CORS requests. This is specifically designed for BYOK (bring your own key) applications where users provide their own API credentials.

The architecture requires API calls to happen in the UI thread (iframe) since the Figma sandbox cannot make network requests. The existing codebase already has the API key storage working in Phase 2 and image capture in Phase 3. This phase connects these components with proper loading states, error handling, and the Claude API client.

Key technical decisions verified:
- Use `@anthropic-ai/sdk` with `dangerouslyAllowBrowser: true` for direct browser API calls
- Send images as base64-encoded data (not URLs, since we have local images)
- Implement AbortController for request cancellation on component unmount
- Handle all error types with user-friendly messages
- Use SDK's built-in retry logic (2 retries default) for transient errors

**Primary recommendation:** Create a thin Claude API client wrapper that handles base64 image encoding, manages AbortController lifecycle, translates API errors to user-friendly messages, and integrates with existing message patterns.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.71.2 | Official Claude API client | Official SDK with TypeScript types, browser support, built-in retry logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (React) | ^18.2.0 | Already installed | State management for loading/error states |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @anthropic-ai/sdk | Raw fetch | Lose TypeScript types, retry logic, error handling |
| Base64 source | URL source | Can't use URLs for local images from paste/drop |

**Installation:**
```bash
pnpm add @anthropic-ai/sdk
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ui/
│   ├── services/
│   │   └── claude.ts        # Claude API client wrapper
│   ├── hooks/
│   │   └── useClaude.ts     # React hook for API calls with loading/error state
│   └── components/
│       └── ImageCapture.tsx  # Updated with "Analyze" button
└── shared/
    └── messages.ts          # (existing) message types
```

### Pattern 1: Client Wrapper with Browser Configuration
**What:** Single instance of Anthropic client configured for browser use
**When to use:** Any Claude API interaction
**Example:**
```typescript
// Source: https://github.com/anthropics/anthropic-sdk-typescript
import Anthropic from '@anthropic-ai/sdk';

// Create client with BYOK pattern
export function createClaudeClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for browser usage
  });
}
```

### Pattern 2: AbortController for Request Cancellation
**What:** Cancel in-flight requests when component unmounts or user navigates away
**When to use:** All async API calls in React components
**Example:**
```typescript
// Source: Community best practices for React + AbortController
export async function analyzeImage(
  client: Anthropic,
  imageBase64: string,
  mimeType: string,
  signal?: AbortSignal
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Analyze this UI screenshot...',
        },
      ],
    }],
  }, {
    signal, // Pass abort signal to SDK
  });

  return message.content[0].type === 'text'
    ? message.content[0].text
    : '';
}
```

### Pattern 3: Hook for API State Management
**What:** Custom React hook encapsulating loading, error, and result state
**When to use:** UI components that trigger API calls
**Example:**
```typescript
export function useClaude(apiKey: string | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (imageBase64: string, mimeType: string) => {
    if (!apiKey) {
      setError('API key not configured');
      return;
    }

    // Cancel any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const client = createClaudeClient(apiKey);
      const response = await analyzeImage(
        client,
        imageBase64,
        mimeType,
        abortControllerRef.current.signal
      );
      setResult(response);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  return { analyze, isLoading, error, result, clearError: () => setError(null) };
}
```

### Anti-Patterns to Avoid
- **Creating client per request:** Creates unnecessary overhead; reuse client instance for same API key
- **Not handling AbortError:** Causes "Can't perform state update on unmounted component" warnings
- **Exposing raw API errors to users:** Technical errors like "authentication_error" confuse users
- **Synchronous base64 conversion:** Use async patterns for large images

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API client with retries | Custom fetch with retry logic | @anthropic-ai/sdk | SDK has 2 automatic retries, exponential backoff, proper header handling |
| Error type detection | String parsing error messages | SDK's APIError class | `err instanceof Anthropic.APIError` with typed status codes |
| Request cancellation | Custom timeout logic | AbortController + SDK signal | Native browser API, SDK supports it natively |
| Base64 encoding | Manual btoa/atob | Uint8Array already available from Phase 3 | Phase 3 already produces Uint8Array which can be converted |

**Key insight:** The SDK handles retry logic, rate limit headers, and error typing. Building custom solutions loses these benefits and introduces bugs.

## Common Pitfalls

### Pitfall 1: Forgetting dangerouslyAllowBrowser
**What goes wrong:** SDK throws error about browser usage being disabled
**Why it happens:** Default SDK configuration blocks browser usage for security
**How to avoid:** Always include `dangerouslyAllowBrowser: true` for BYOK applications
**Warning signs:** Error message mentioning "browser" or "CORS"

### Pitfall 2: Not Canceling Requests on Unmount
**What goes wrong:** "Can't perform a React state update on an unmounted component"
**Why it happens:** API call completes after user navigated away
**How to avoid:** Use AbortController, cleanup in useEffect return
**Warning signs:** Console warnings about unmounted components

### Pitfall 3: Exposing Technical Error Messages
**What goes wrong:** Users see "authentication_error" instead of "Invalid API key"
**Why it happens:** Displaying raw API error messages
**How to avoid:** Map error types to user-friendly messages
**Warning signs:** Users confused by error messages, support requests

### Pitfall 4: Image Size Limits
**What goes wrong:** API rejects images or times out
**Why it happens:** Images exceeding 5MB limit or 8000x8000px
**How to avoid:** Validate image size before sending, resize if needed
**Warning signs:** 413 errors, slow first-token latency

### Pitfall 5: Wrong Media Type
**What goes wrong:** "Image does not match the provided media type"
**Why it happens:** Sending PNG with image/jpeg header (or vice versa)
**How to avoid:** Use the exact MIME type from the captured image
**Warning signs:** Validation errors mentioning media type

### Pitfall 6: Not Handling Rate Limits
**What goes wrong:** Users get blocked without understanding why
**Why it happens:** 429 errors shown as generic failures
**How to avoid:** Detect rate limit errors, show "Please wait and try again" message
**Warning signs:** Sporadic failures for active users

## Code Examples

Verified patterns from official sources:

### Base64 Image Vision Request
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/vision
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: userProvidedApiKey,
  dangerouslyAllowBrowser: true,
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png', // Must match actual image format
            data: base64ImageData,   // Base64 string without data: prefix
          },
        },
        {
          type: 'text',
          text: 'Analyze this UI screenshot...',
        },
      ],
    },
  ],
});
```

### Error Handling with User Messages
```typescript
// Source: https://platform.claude.com/docs/en/api/errors
import Anthropic from '@anthropic-ai/sdk';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    switch (error.status) {
      case 400:
        return 'Invalid request. Please try a different image.';
      case 401:
        return 'Invalid API key. Please check your settings.';
      case 403:
        return 'API key does not have permission for this operation.';
      case 413:
        return 'Image is too large. Please use a smaller image (max 5MB).';
      case 429:
        return 'Rate limit exceeded. Please wait a moment and try again.';
      case 500:
        return 'Claude is experiencing issues. Please try again later.';
      case 529:
        return 'Claude is temporarily overloaded. Please try again in a few minutes.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return ''; // Don't show message for cancelled requests
    }
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network error. Please check your internet connection.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}
```

### Converting Uint8Array to Base64
```typescript
// Phase 3 provides Uint8Array, need to convert for API
export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}
```

### Request with Abort Signal
```typescript
// Source: https://github.com/anthropics/anthropic-sdk-typescript
const controller = new AbortController();

try {
  const message = await client.messages.create(
    {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [...],
    },
    {
      signal: controller.signal, // SDK accepts abort signal
    }
  );
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    // Request was cancelled, don't show error
    return;
  }
  throw err;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server proxy required | Direct browser CORS | Aug 2024 | No proxy needed for BYOK apps |
| Manual retry logic | SDK built-in retries | SDK 0.37+ | 2 automatic retries with backoff |
| image/gif not supported | image/gif supported | Claude 3+ | Can accept GIF images |
| docs.anthropic.com | platform.claude.com | Jan 2026 | New documentation URL |

**Deprecated/outdated:**
- `anthropic-dangerous-direct-browser-access` header: Now use SDK's `dangerouslyAllowBrowser` option instead

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal max_tokens for UI analysis**
   - What we know: 4096 is common, higher values increase cost
   - What's unclear: Exact token count needed for typical UI analysis responses
   - Recommendation: Start with 4096, can tune based on actual usage

2. **Image resizing for large screenshots**
   - What we know: Images over 1568px on long edge get resized, increasing latency
   - What's unclear: Whether to pre-resize in plugin or let API handle it
   - Recommendation: Defer to Phase 5 (prompt engineering), accept latency for now

## Sources

### Primary (HIGH confidence)
- [Anthropic Vision Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/vision) - Image formats, size limits, code examples
- [Anthropic Error Codes](https://platform.claude.com/docs/en/api/errors) - HTTP error codes and handling
- [anthropic-sdk-typescript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - SDK usage, browser support, TypeScript types

### Secondary (MEDIUM confidence)
- [Simon Willison's blog on CORS support](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/) - Confirmed browser usage pattern
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) - Current version 0.71.2

### Tertiary (LOW confidence)
- WebSearch results on AbortController patterns - General React patterns, not Claude-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK with documented browser support
- Architecture: HIGH - Follows existing codebase patterns (hooks, services)
- Pitfalls: HIGH - Documented in official error codes and community issues
- Code examples: HIGH - From official documentation

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (SDK version may update, patterns stable)
