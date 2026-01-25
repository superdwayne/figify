# Phase 3: Image Input - Research

**Researched:** 2026-01-25
**Domain:** Browser Clipboard/Drag-Drop APIs in Figma Plugin iframe context
**Confidence:** HIGH

## Summary

This phase implements image capture via clipboard paste (Cmd/Ctrl+V) and drag-drop operations within the Figma plugin UI iframe. The research confirms that standard browser APIs (Clipboard API, HTML5 Drag and Drop) work within Figma plugin iframes with some important caveats. The key challenge is the dual-thread architecture: image capture must happen in the UI thread (which has DOM access), then image data must be serialized as `Uint8Array` to send to the main thread if needed.

The recommended approach uses native browser APIs without external libraries. React-dropzone could add convenience but is unnecessary given the focused scope (images only, single drop zone). The paste event listener on `document` captures Cmd/Ctrl+V globally, while drag-drop handlers on a dedicated drop zone element provide the file drop functionality. Image validation should check both MIME type (fast) and optionally magic bytes (authoritative) for the three supported formats: PNG, JPG/JPEG, WebP.

**Primary recommendation:** Use native Clipboard API paste events and HTML5 Drag-Drop events directly in React, converting captured images to `Uint8Array` via `blob.arrayBuffer()` for Figma plugin message compatibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Clipboard API | Browser API | Handle paste events with image data | Standard browser API, no dependencies |
| Native Drag-Drop API | Browser API | Handle file drop events | Standard browser API, no dependencies |
| React event handlers | React 18.2 | TypeScript-typed event handling | Already in project, provides SyntheticEvent types |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-type | 19.x | Magic byte validation | If strict format validation needed (optional) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native APIs | react-dropzone | Adds dependency for simple use case; native is sufficient |
| Native APIs | react-gluejar | Clipboard-only library; we need both paste and drag-drop |
| MIME check only | file-type lib | Magic bytes more reliable but adds dependency; MIME sufficient for user-uploaded images |

**Installation:**
```bash
# No new dependencies required for core functionality
# Optional: pnpm add file-type (if strict validation needed)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ui/
│   ├── App.tsx              # Main component, integrates ImageCapture
│   ├── components/
│   │   └── ImageCapture.tsx # Paste + drag-drop handling component
│   ├── hooks/
│   │   └── useImageCapture.ts # Custom hook for image capture logic
│   └── utils/
│       └── imageUtils.ts    # Blob conversion, validation utilities
├── shared/
│   └── messages.ts          # Add IMAGE_CAPTURED message type
└── main.ts                  # No changes needed for this phase
```

### Pattern 1: Paste Event Handler
**What:** Global document-level paste listener that captures image data from clipboard
**When to use:** User presses Cmd/Ctrl+V anywhere in the plugin UI
**Example:**
```typescript
// Source: MDN Clipboard API + web.dev patterns
useEffect(() => {
  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          // Process image...
        }
      }
    }
  };

  document.addEventListener('paste', handlePaste);
  return () => document.removeEventListener('paste', handlePaste);
}, []);
```

### Pattern 2: Drag-Drop Zone Component
**What:** Element that accepts dropped image files with visual feedback
**When to use:** User drags image file from OS onto plugin window
**Example:**
```typescript
// Source: MDN Drag and Drop API
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  setIsDragging(true);
};

const handleDragLeave = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);
};

const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragging(false);

  const files = Array.from(e.dataTransfer.files);
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // Process image...
    }
  }
};
```

### Pattern 3: Image Preview with Object URL
**What:** Display captured image immediately using Blob URL
**When to use:** After capturing image, before any processing
**Example:**
```typescript
// Source: MDN URL.createObjectURL
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

const captureImage = async (blob: Blob) => {
  // Clean up previous preview URL
  if (previewUrl) URL.revokeObjectURL(previewUrl);

  // Create preview immediately
  setPreviewUrl(URL.createObjectURL(blob));

  // Convert to Uint8Array for message passing
  const uint8Array = new Uint8Array(await blob.arrayBuffer());
  return uint8Array;
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}, [previewUrl]);
```

### Pattern 4: Figma Message with Image Data
**What:** Send captured image bytes to main thread if needed for Figma operations
**When to use:** If image needs to be added to Figma canvas or processed by main thread
**Example:**
```typescript
// Source: Figma Plugin Docs - Working with Images
// Note: Figma plugin messages support Uint8Array natively

// In messages.ts - extend UIMessage type
export type UIMessage =
  | { type: 'UI_READY'; correlationId: string }
  | { type: 'IMAGE_CAPTURED'; correlationId: string; imageData: Uint8Array; mimeType: string }
  | { type: 'REQUEST'; correlationId: string; action: string; payload?: unknown }
  | { type: 'CLOSE_PLUGIN' };

// In UI - send image to main thread
const sendImageToPlugin = (imageData: Uint8Array, mimeType: string) => {
  postToPlugin({
    type: 'IMAGE_CAPTURED',
    correlationId: generateCorrelationId(),
    imageData,
    mimeType
  });
};
```

### Anti-Patterns to Avoid
- **Global window drop handler without prevention:** Browser will open dropped files if not prevented - always prevent default on window dragover/drop
- **Storing Blob instead of Uint8Array:** Blobs cannot be sent via Figma postMessage - always convert to Uint8Array for cross-thread communication
- **Not revoking Object URLs:** Memory leak - always cleanup with URL.revokeObjectURL when preview is replaced or component unmounts
- **Using async Clipboard API read() on button click:** Figma plugin iframe has permission restrictions - use paste event instead
- **Hardcoding specific MIME types:** Use `startsWith('image/')` for flexibility, then validate specific types separately

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blob to Uint8Array | Manual FileReader callbacks | `blob.arrayBuffer()` | Modern async API, cleaner code |
| Image preview display | Canvas manipulation | `URL.createObjectURL()` | Immediate, no decoding needed |
| File type detection | String parsing | Check `file.type` MIME + extension | Built-in browser detection |
| Drag state tracking | Manual counter logic | `dragenter`/`dragleave` on zone element | React state is simpler |

**Key insight:** The browser provides excellent built-in APIs for image handling. The complexity is in the Figma plugin context (iframe + message passing), not the image capture itself.

## Common Pitfalls

### Pitfall 1: Forgetting Window-Level Drag Prevention
**What goes wrong:** Browser opens dropped image files instead of capturing them
**Why it happens:** Default browser behavior for file drops is to navigate/open the file
**How to avoid:** Add window-level dragover and drop handlers that prevent default
**Warning signs:** Images open in a new tab/window when dropped
```typescript
// Must prevent default at window level
useEffect(() => {
  const preventDefault = (e: DragEvent) => e.preventDefault();
  window.addEventListener('dragover', preventDefault);
  window.addEventListener('drop', preventDefault);
  return () => {
    window.removeEventListener('dragover', preventDefault);
    window.removeEventListener('drop', preventDefault);
  };
}, []);
```

### Pitfall 2: Clipboard Permission Issues
**What goes wrong:** `navigator.clipboard.read()` throws NotAllowedError
**Why it happens:** Figma plugin iframe has restricted permissions for async Clipboard API
**How to avoid:** Use paste event listener instead of programmatic `read()`
**Warning signs:** Permission prompts or errors when trying to read clipboard
```typescript
// DON'T: This may fail in Figma plugin context
const items = await navigator.clipboard.read();

// DO: Use paste event instead
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  // ...
});
```

### Pitfall 3: Blob vs Uint8Array for Message Passing
**What goes wrong:** Image data is lost or corrupted when sending to main thread
**Why it happens:** Figma postMessage only supports Uint8Array, not Blob or ArrayBuffer
**How to avoid:** Always convert Blob to Uint8Array before sending via postMessage
**Warning signs:** Empty or corrupted data in main thread
```typescript
// DON'T: Blob won't serialize correctly
postToPlugin({ type: 'IMAGE', data: blob });

// DO: Convert to Uint8Array first
const uint8Array = new Uint8Array(await blob.arrayBuffer());
postToPlugin({ type: 'IMAGE', data: uint8Array });
```

### Pitfall 4: Memory Leaks from Object URLs
**What goes wrong:** Memory usage grows as user captures multiple images
**Why it happens:** Object URLs are not garbage collected automatically
**How to avoid:** Call `URL.revokeObjectURL()` when replacing or discarding previews
**Warning signs:** Increasing memory usage in DevTools, sluggish performance
```typescript
// Always cleanup before creating new URL
if (previousUrl) URL.revokeObjectURL(previousUrl);
const newUrl = URL.createObjectURL(blob);
```

### Pitfall 5: MIME Type Validation Gaps
**What goes wrong:** Invalid files accepted or valid WebP files rejected
**Why it happens:** Only checking for `image/png` and `image/jpeg`, missing WebP
**How to avoid:** Check all three formats, use case-insensitive comparison
**Warning signs:** WebP files rejected, or non-image files accepted
```typescript
const VALID_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const isValidImage = (file: File) => VALID_TYPES.includes(file.type.toLowerCase());
```

## Code Examples

Verified patterns from official sources:

### Complete useImageCapture Hook
```typescript
// Source: Combined from MDN + web.dev patterns
import { useState, useEffect, useCallback } from 'react';

interface CapturedImage {
  blob: Blob;
  uint8Array: Uint8Array;
  previewUrl: string;
  mimeType: string;
  width?: number;
  height?: number;
}

interface UseImageCaptureReturn {
  capturedImage: CapturedImage | null;
  isDragging: boolean;
  error: string | null;
  clearImage: () => void;
  dropZoneProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

const VALID_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function useImageCapture(): UseImageCaptureReturn {
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateImage = useCallback((file: File | Blob): boolean => {
    if (!VALID_MIME_TYPES.includes(file.type.toLowerCase())) {
      setError(`Invalid format: ${file.type}. Supported: PNG, JPG, WebP`);
      return false;
    }
    return true;
  }, []);

  const processImage = useCallback(async (blob: Blob) => {
    if (!validateImage(blob)) return;

    // Cleanup previous
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }

    setError(null);

    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const previewUrl = URL.createObjectURL(blob);

    setCapturedImage({
      blob,
      uint8Array,
      previewUrl,
      mimeType: blob.type
    });
  }, [capturedImage, validateImage]);

  // Paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) await processImage(blob);
          return;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [processImage]);

  // Window-level drag prevention
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (capturedImage?.previewUrl) {
        URL.revokeObjectURL(capturedImage.previewUrl);
      }
    };
  }, [capturedImage?.previewUrl]);

  const clearImage = useCallback(() => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl);
    }
    setCapturedImage(null);
    setError(null);
  }, [capturedImage]);

  const dropZoneProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDragging(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    onDrop: async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find(f => f.type.startsWith('image/'));
      if (imageFile) await processImage(imageFile);
    }
  };

  return { capturedImage, isDragging, error, clearImage, dropZoneProps };
}
```

### ImageCapture Component Usage
```typescript
// Source: React pattern combining hook with UI
import { useImageCapture } from '../hooks/useImageCapture';

export function ImageCapture() {
  const { capturedImage, isDragging, error, clearImage, dropZoneProps } = useImageCapture();

  return (
    <div
      {...dropZoneProps}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        ${error ? 'border-red-500 bg-red-50' : ''}
      `}
    >
      {capturedImage ? (
        <div className="space-y-4">
          <img
            src={capturedImage.previewUrl}
            alt="Captured screenshot"
            className="max-w-full max-h-64 mx-auto rounded"
          />
          <button onClick={clearImage} className="text-sm text-gray-500 hover:text-gray-700">
            Clear image
          </button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600">
            {isDragging ? 'Drop image here' : 'Paste screenshot (Cmd/Ctrl+V) or drag image here'}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: PNG, JPG, WebP
          </p>
        </div>
      )}
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
```

### TypeScript Types for React Events
```typescript
// Source: React TypeScript definitions
// Paste event type
const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
  // e.clipboardData is DataTransfer
  const items = e.clipboardData.items;
  // ...
};

// Drag event types
const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
};

const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  const files = e.dataTransfer.files; // FileList
  const items = e.dataTransfer.items; // DataTransferItemList
  // ...
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FileReader callback pattern | `blob.arrayBuffer()` async | ES2018/Baseline 2020 | Cleaner async/await code |
| `document.execCommand('paste')` | Paste event listener | Deprecated in 2020s | execCommand unreliable, use events |
| Base64 encoding for transfer | Uint8Array via postMessage | Figma always supported | More efficient, less processing |
| Manual drag state counters | React state + dragenter/leave | React 16+ | Simpler state management |
| jQuery file upload plugins | Native APIs + React | 2018+ | No dependencies needed |

**Deprecated/outdated:**
- `document.execCommand('paste')`: Deprecated, unreliable in iframe contexts, use paste events
- `FileReader.readAsDataURL()` for transfer: Unnecessary encoding overhead, use Uint8Array directly
- Synchronous clipboard access: Blocked by browsers, always use async or event-based

## Open Questions

Things that couldn't be fully resolved:

1. **Figma Desktop vs Browser Clipboard Behavior**
   - What we know: Both support paste events in plugin UI iframe
   - What's unclear: Are there permission differences between desktop app and browser Figma?
   - Recommendation: Test in both environments; paste event approach should work in both

2. **Maximum Image Size Handling**
   - What we know: Figma supports up to 4096x4096 images, no explicit file size limit documented
   - What's unclear: Should we enforce size limits in UI before processing?
   - Recommendation: Implement optional size validation, show warning for very large images (>10MB)

3. **WebP Support Edge Cases**
   - What we know: WebP MIME type is 'image/webp', widely supported in modern browsers
   - What's unclear: Does Figma's image processing handle WebP correctly in all cases?
   - Recommendation: Include WebP in validation; if issues arise, convert to PNG in UI

## Sources

### Primary (HIGH confidence)
- [MDN Clipboard API - read()](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read) - Async clipboard reading patterns
- [MDN Drag and Drop File API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop) - Complete drag-drop implementation
- [web.dev - Paste images pattern](https://web.dev/patterns/clipboard/paste-images) - Browser compatibility and fallback patterns
- [Figma Plugin Docs - Working with Images](https://developers.figma.com/docs/plugins/working-with-images) - Uint8Array and createImage patterns

### Secondary (MEDIUM confidence)
- [React TypeScript onPaste event type](https://felixgerschau.com/react-typescript-onpaste-event-type/) - TypeScript interface for clipboard events
- [ClarityDev - React TypeScript Drag Drop Guide](https://claritydev.net/blog/react-typescript-drag-drop-file-upload-guide) - React-specific patterns
- [Figma Forum - Clipboard discussions](https://forum.figma.com/ask-the-community-7/write-to-clipboard-from-custom-plugin-23974) - Figma plugin iframe limitations

### Tertiary (LOW confidence)
- [react-dropzone GitHub](https://github.com/react-dropzone/react-dropzone) - Alternative library if native approach proves insufficient

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native browser APIs well-documented, no external dependencies needed
- Architecture: HIGH - Patterns verified against MDN and Figma docs
- Pitfalls: HIGH - Based on official documentation and known browser behaviors

**Research date:** 2026-01-25
**Valid until:** 2026-03-25 (60 days - stable browser APIs, unlikely to change)
