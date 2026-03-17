import { PluginMessage, UIMessage, isUIMessage, generateCorrelationId } from './shared/messages';
import { FigmaGenerator } from './main/generator';
import {
  validateSetApiKeyPayload,
  validateGenerateDesignPayload,
  formatZodError,
  type ValidatedGenerateDesignPayload,
} from './shared/schemas';

// Show UI when plugin launches
figma.showUI(__html__, {
  width: 400,
  height: 600,
  title: 'Figify'
});

// Reserved for future use: Track pending requests for correlation
// const pendingRequests = new Map<string, (response: unknown) => void>();

// Send message to UI with optional response handling
function postToUI(message: PluginMessage): void {
  figma.ui.postMessage(message);
}

/**
 * Handle GENERATE_DESIGN action - creates Figma nodes from UI analysis
 */
async function handleGenerateDesign(
  correlationId: string,
  payload: ValidatedGenerateDesignPayload
): Promise<void> {
  // Extract the analysis and images from payload
  const { extractedImages, ...analysis } = payload;

  // Validate and normalize viewport
  const rawViewport = analysis.viewport || { width: 1920, height: 1080 };
  const viewport = validateViewport(rawViewport);
  const scaleFactor = detectScaleFactor(viewport);

  // Log detection for debugging
  console.log(`[Generation] Viewport: ${viewport.width}x${viewport.height}, Scale factor: ${scaleFactor}`);
  console.log(`[Generation] Extracted images: ${extractedImages?.length || 0}`);

  const generator = new FigmaGenerator({
    scaleFactor,
    applyAutoLayout: true, // Auto Layout mode: components use proper Figma Auto Layout
  });

  // Set up progress reporting
  generator.onProgress((step, current, total) => {
    postToUI({
      type: 'PROGRESS',
      correlationId,
      payload: { step, current, total },
    });
  });

  // Run generation with extracted images
  const result = await generator.generate(analysis, extractedImages);

  // Send completion message
  postToUI({
    type: 'GENERATION_COMPLETE',
    correlationId,
    payload: {
      nodeId: result.rootNodeId,
      elementCount: result.elementCount,
      success: result.success,
      error: result.error,
    },
  });

  // Select and zoom to the generated frame if successful
  if (result.success && result.rootNodeId) {
    const node = await figma.getNodeByIdAsync(result.rootNodeId);
    if (node && node.type === 'FRAME') {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  }
}

/**
 * Known device resolutions for accurate retina detection
 * Format: [width, height, scaleFactor]
 */
const KNOWN_DEVICE_RESOLUTIONS: [number, number, number][] = [
  // 3x retina devices
  [2556, 1179, 3], // iPhone 15 Pro
  [2796, 1290, 3], // iPhone 15 Pro Max
  [2532, 1170, 3], // iPhone 14 Pro
  [2778, 1284, 3], // iPhone 14 Pro Max
  [2436, 1125, 3], // iPhone X/XS/11 Pro
  [2688, 1242, 3], // iPhone XS Max/11 Pro Max
  
  // 2x retina devices
  [3024, 1964, 2], // MacBook Pro 14"
  [3456, 2234, 2], // MacBook Pro 16"
  [2880, 1800, 2], // MacBook Pro 15" (older)
  [2560, 1600, 2], // MacBook Pro 13"
  [2732, 2048, 2], // iPad Pro 12.9"
  [2388, 1668, 2], // iPad Pro 11"
  [2360, 1640, 2], // iPad Air
  [2048, 1536, 2], // iPad Mini
];

/**
 * Detect if screenshot is retina based on viewport dimensions
 * Returns scale factor to normalize coordinates
 * 
 * Detection strategy:
 * 1. Check against known device resolutions (most accurate)
 * 2. Fall back to dimension-based heuristic
 */
function detectScaleFactor(viewport: { width: number; height: number }): number {
  const { width, height } = viewport;
  
  // Check known device resolutions (within 5% tolerance for minor variations)
  for (const [knownWidth, knownHeight, scale] of KNOWN_DEVICE_RESOLUTIONS) {
    const widthMatch = Math.abs(width - knownWidth) / knownWidth < 0.05;
    const heightMatch = Math.abs(height - knownHeight) / knownHeight < 0.05;
    
    // Also check rotated dimensions (landscape vs portrait)
    const rotatedWidthMatch = Math.abs(width - knownHeight) / knownHeight < 0.05;
    const rotatedHeightMatch = Math.abs(height - knownWidth) / knownWidth < 0.05;
    
    if ((widthMatch && heightMatch) || (rotatedWidthMatch && rotatedHeightMatch)) {
      return 1 / scale; // Convert scale to factor (3x -> 0.333, 2x -> 0.5)
    }
  }
  
  // Heuristic fallback based on dimension thresholds
  const maxDimension = Math.max(width, height);
  
  if (maxDimension > 2500) {
    // Likely 3x retina (e.g., iPhone at full resolution)
    return 1 / 3; // ~0.333
  } else if (maxDimension > 1800) {
    // Likely 2x retina
    return 0.5;
  }
  
  // Standard 1x
  return 1;
}

/**
 * Validate and clamp viewport dimensions to reasonable range
 */
function validateViewport(viewport: { width: number; height: number }): { width: number; height: number } {
  const MIN_DIMENSION = 100;
  const MAX_DIMENSION = 4000;
  
  return {
    width: Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, viewport.width)),
    height: Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, viewport.height)),
  };
}

// Reserved for future use: Send request from main thread to UI and await response
// Currently commented out because it's not needed yet
// function requestFromUI(action: string, payload?: Record<string, unknown>): Promise<unknown> {
//   return new Promise((resolve) => {
//     const correlationId = generateCorrelationId();
//     pendingRequests.set(correlationId, resolve);
//
//     const requestPayload: Record<string, unknown> = { action };
//     if (payload) {
//       Object.assign(requestPayload, payload);
//     }
//
//     const message: PluginMessage = {
//       type: 'RESPONSE',
//       correlationId,
//       payload: requestPayload
//     };
//     postToUI(message);
//   });
// }

// Handle messages from UI
figma.ui.onmessage = (msg: unknown) => {
  if (!isUIMessage(msg)) {
    console.warn('Invalid message from UI:', msg);
    return;
  }

  switch (msg.type) {
    case 'UI_READY':
      console.log('UI ready, sending init');
      postToUI({
        type: 'INIT',
        correlationId: generateCorrelationId()
      });
      break;

    case 'REQUEST':
      handleUIRequest(msg);
      break;

    case 'CLOSE_PLUGIN':
      figma.closePlugin();
      break;

    default:
      console.warn('Unknown message type:', msg);
  }
};

// Handle specific UI requests
async function handleUIRequest(msg: UIMessage & { type: 'REQUEST' }): Promise<void> {
  const { correlationId, action } = msg;
  const payload = 'payload' in msg ? msg.payload : undefined;

  switch (action) {
    case 'GET_SELECTION':
      const selection = figma.currentPage.selection;
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { nodeCount: selection.length }
      });
      break;

    case 'PING':
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { pong: true, timestamp: Date.now() }
      });
      break;

    case 'GET_API_KEY': {
      try {
        const apiKey = await figma.clientStorage.getAsync('anthropic_api_key');
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { apiKey: apiKey ?? null }
        });
      } catch (error) {
        console.error('Failed to get API key from storage:', error);
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { apiKey: null, error: 'Failed to access storage' }
        });
      }
      break;
    }

    case 'SET_API_KEY': {
      // Validate payload with Zod schema
      const validation = validateSetApiKeyPayload(payload);
      if (!validation.success) {
        console.error('Invalid SET_API_KEY payload:', formatZodError(validation.error));
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { success: false, error: `Invalid payload: ${formatZodError(validation.error)}` }
        });
        break;
      }

      try {
        await figma.clientStorage.setAsync('anthropic_api_key', validation.data.key);
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { success: true }
        });
      } catch (error) {
        console.error('Failed to set API key in storage:', error);
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { success: false, error: 'Failed to access storage' }
        });
      }
      break;
    }

    case 'CLEAR_API_KEY': {
      try {
        await figma.clientStorage.deleteAsync('anthropic_api_key');
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { success: true }
        });
      } catch (error) {
        console.error('Failed to clear API key from storage:', error);
        postToUI({
          type: 'RESPONSE',
          correlationId,
          payload: { success: false, error: 'Failed to access storage' }
        });
      }
      break;
    }

    case 'GENERATE_DESIGN': {
      // Validate payload with Zod schema
      const validation = validateGenerateDesignPayload(payload);
      if (!validation.success) {
        console.error('Invalid GENERATE_DESIGN payload:', formatZodError(validation.error));
        postToUI({
          type: 'GENERATION_COMPLETE',
          correlationId,
          payload: {
            nodeId: '',
            elementCount: 0,
            success: false,
            error: `Invalid payload: ${formatZodError(validation.error)}`,
          },
        });
        break;
      }

      await handleGenerateDesign(correlationId, validation.data);
      break;
    }

    default:
      console.warn('Unknown action:', action);
      postToUI({
        type: 'RESPONSE',
        correlationId,
        payload: { error: `Unknown action: ${action}` }
      });
  }
}

// Listen for selection changes
figma.on('selectionchange', () => {
  postToUI({
    type: 'SELECTION_CHANGED',
    correlationId: generateCorrelationId(),
    nodeCount: figma.currentPage.selection.length
  });
});
