/**
 * Typed message protocol for Figma plugin communication
 *
 * Uses correlation IDs for async request/response patterns between
 * the main thread (sandbox) and UI thread (iframe).
 */

// Response payload types
export type ApiKeyResponse = { apiKey: string | null };
export type SuccessResponse = { success: boolean };

// Message from main thread to UI
export type PluginMessage =
  | { type: 'INIT'; correlationId: string }
  | { type: 'SELECTION_CHANGED'; correlationId: string; nodeCount: number }
  | { type: 'RESPONSE'; correlationId: string; payload: unknown };

// Storage action request types
export type StorageRequest =
  | { type: 'REQUEST'; correlationId: string; action: 'GET_API_KEY' }
  | { type: 'REQUEST'; correlationId: string; action: 'SET_API_KEY'; payload: { key: string } }
  | { type: 'REQUEST'; correlationId: string; action: 'CLEAR_API_KEY' };

// Message from UI to main thread
export type UIMessage =
  | { type: 'UI_READY'; correlationId: string }
  | { type: 'IMAGE_CAPTURED'; correlationId: string; imageData: Uint8Array; mimeType: string }
  | StorageRequest
  | { type: 'REQUEST'; correlationId: string; action: string; payload?: unknown }
  | { type: 'CLOSE_PLUGIN' };

/**
 * Generate a unique correlation ID for request/response tracking
 * Format: timestamp-random9chars
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Type guard to check if a message is a valid PluginMessage
 */
export function isPluginMessage(msg: unknown): msg is PluginMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}

/**
 * Type guard to check if a message is a valid UIMessage
 */
export function isUIMessage(msg: unknown): msg is UIMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg;
}
